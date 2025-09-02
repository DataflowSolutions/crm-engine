import { createClient } from "@/app/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type ImportRequest = {
  templateName: string;
  columnMappings: {
    columnIndex: number;
    columnName: string;
    leadField: string;
    fieldType: string;
    customFieldName?: string;
  }[];
  data: string[][];
  userId: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orgId } = await params;
    const body: ImportRequest = await request.json();
    const { templateName, columnMappings, data, userId } = body;

    const supabase = await createClient();

    // Verify user has access to the organization
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create the lead template
    const { data: template, error: templateError } = await supabase
      .from("lead_templates")
      .insert({
        name: templateName,
        description: `Imported template from spreadsheet`,
        organization_id: orgId,
        is_default: false
      })
      .select()
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
    }

    // Generate unique field keys and create lead fields
    const leadFields: {
      template_id: string;
      label: string;
      field_key: string;
      field_type: string;
      is_required: boolean;
      sort_order: number;
    }[] = [];
    const fieldKeyMap: { [key: number]: string } = {}; // Maps mapping index to actual field_key
    const existingKeys = new Set<string>();

    for (let order = 0; order < columnMappings.length; order++) {
      const mapping = columnMappings[order];
      let baseKey: string;
      
      if (mapping.leadField === 'custom') {
        baseKey = (mapping.customFieldName || mapping.columnName)
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
      } else {
        baseKey = mapping.leadField;
      }

      // Ensure uniqueness within this template
      let uniqueKey = baseKey;
      let counter = 1;
      
      while (existingKeys.has(uniqueKey)) {
        uniqueKey = `${baseKey}_${counter}`;
        counter++;
      }
      
      fieldKeyMap[order] = uniqueKey;
      existingKeys.add(uniqueKey);
      
      leadFields.push({
        template_id: template.id,
        label: mapping.leadField === 'custom' 
          ? (mapping.customFieldName || mapping.columnName)
          : mapping.columnName,
        field_key: uniqueKey,
        field_type: mapping.fieldType,
        is_required: false,
        sort_order: order + 1
      });
    }

    // Insert all fields for this template
    if (leadFields.length > 0) {
      const { error: fieldsError } = await supabase
        .from("lead_fields")
        .insert(leadFields);

      if (fieldsError) {
        console.error('Fields creation error:', fieldsError);
        console.error('Attempted to insert:', leadFields);
        // Rollback template creation
        await supabase.from("lead_templates").delete().eq("id", template.id);
        return NextResponse.json({ 
          error: `Failed to create template fields: ${fieldsError?.message || 'Unknown error'}` 
        }, { status: 500 });
      }
    }

    // Get all fields for this specific template
    const { data: allTemplateFields, error: getAllFieldsError } = await supabase
      .from("lead_fields")
      .select("*")
      .eq("template_id", template.id)
      .order("sort_order");

    if (getAllFieldsError || !allTemplateFields) {
      console.error('Error getting template fields:', getAllFieldsError);
      // Rollback template creation
      await supabase.from("lead_templates").delete().eq("id", template.id);
      return NextResponse.json({ 
        error: `Failed to retrieve template fields: ${getAllFieldsError?.message || 'Unknown error'}` 
      }, { status: 500 });
    }

    console.log('Field key mapping:', fieldKeyMap);
    console.log('All template fields:', allTemplateFields.map(f => ({ id: f.id, field_key: f.field_key, label: f.label })));
    console.log('Column mappings:', columnMappings.map((m, i) => ({ index: i, columnIndex: m.columnIndex, columnName: m.columnName, leadField: m.leadField, fieldKey: fieldKeyMap[i] })));

    // Create leads and field values
    let leadsCreated = 0;
    let leadsSkipped = 0;
    const errors: string[] = [];

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell || !cell.trim())) {
        leadsSkipped++;
        continue;
      }
      
      try {
        // Create the lead
        const { data: lead, error: leadError } = await supabase
          .from("leads")
          .insert({
            organization_id: orgId,
            template_id: template.id,
            created_by: userId,
            status: 'draft'
          })
          .select()
          .single();

        if (leadError || !lead) {
          console.error(`Lead creation error for row ${rowIndex + 2}:`, leadError);
          errors.push(`Row ${rowIndex + 2}: Failed to create lead - ${leadError?.message || 'Unknown error'}`);
          continue;
        }

        // Create field values for this lead
        const fieldValues = columnMappings.map((mapping, mappingIndex) => {
          const value = row[mapping.columnIndex] || '';
          
          // Find the corresponding field in allTemplateFields by matching the field_key
          const fieldKey = fieldKeyMap[mappingIndex];
          const templateField = allTemplateFields.find(f => f.field_key === fieldKey);
          
          if (!templateField) {
            console.error(`Template field not found for key: ${fieldKey}`);
            return null;
          }
          
          return {
            lead_id: lead.id,
            field_id: templateField.id,
            value: value.trim() // Save empty string if no value, but always save the field
          };
        }).filter(Boolean);

       // console.log(`Row ${rowIndex + 2}: Created ${fieldValues.length} field values for ${columnMappings.length} mappings`);
        //console.log(`Field values for row ${rowIndex + 2}:`, fieldValues.map(fv => fv ? { field_id: fv.field_id, value: fv.value } : null).filter(Boolean));

        if (fieldValues.length > 0) {
          const { error: valuesError } = await supabase
            .from("lead_field_values")
            .insert(fieldValues);

          if (valuesError) {
            console.error(`Field values error for row ${rowIndex + 2}:`, valuesError);
            errors.push(`Row ${rowIndex + 2}: Failed to save field values - ${valuesError.message}`);
            // Clean up the lead if field values failed
            await supabase.from("leads").delete().eq("id", lead.id);
            continue;
          }
        }

        leadsCreated++;
      } catch (error) {
        errors.push(`Row ${rowIndex + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      templateId: template.id,
      leadsCreated,
      leadsSkipped,
      templateCreated: true,
      errors: errors.slice(0, 10) // Limit to first 10 errors
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
