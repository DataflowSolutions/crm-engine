"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Type definitions for comprehensive template data
type TemplateComprehensive = {
  template_id: string;
  name: string;
  description: string;
  organization_id: string;
  is_default: boolean;
  created_at: string;
  created_by: string;
  creator_name: string;
  field_count: number;
  lead_count: number;
  fields: Array<{
    id: string;
    field_key: string;
    label: string;
    field_type: string;
    is_required: boolean;
    sort_order: number;
  }>;
};

// Optimized function to get all templates with comprehensive data
export async function getTemplatesWithDetails(orgId: string) {
  const sb = await createClient();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Use optimized database function
    const { data: templates, error } = await sb
      .rpc('get_templates_comprehensive', {
        p_org_id: orgId
      }) as { data: TemplateComprehensive[] | null; error: unknown };

    if (error) {
      throw new Error("Failed to fetch templates");
    }

    return {
      success: true,
      templates: templates || []
    };
  } catch (dbError) {
    console.log('Database function not available, using fallback method:', dbError);
    
    // Fallback to original method with multiple queries
    const { data: templates, error: templatesError } = await sb
      .from("lead_templates")
      .select(`
        id,
        name,
        description,
        organization_id,
        is_default,
        created_at,
        created_by,
        users!lead_templates_created_by_fkey (
          full_name
        ),
        lead_fields!fld_tpl_fk (
          id,
          field_key,
          label,
          field_type,
          is_required,
          sort_order
        )
      `)
      .or(`organization_id.eq.${orgId},organization_id.eq.00000000-0000-0000-0000-000000000000`)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (templatesError) {
      throw new Error("Failed to fetch templates");
    }

    // Get lead counts for each template
    const templateIds = templates?.map(t => t.id) || [];
    const { data: leadCounts } = await sb
      .from("leads")
      .select("template_id")
      .in("template_id", templateIds);

    const leadCountMap = (leadCounts || []).reduce((acc, lead) => {
      acc[lead.template_id] = (acc[lead.template_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const formattedTemplates = templates?.map(template => ({
      template_id: template.id,
      name: template.name,
      description: template.description,
      organization_id: template.organization_id,
      is_default: template.is_default,
      created_at: template.created_at,
      created_by: template.created_by,
      creator_name: (template.users as unknown as { full_name: string })?.full_name || 'Unknown',
      field_count: template.lead_fields?.length || 0,
      lead_count: leadCountMap[template.id] || 0,
      fields: template.lead_fields || []
    })) || [];

    return {
      success: true,
      templates: formattedTemplates
    };
  }
}

// Optimized delete template function (keeps existing logic but with better error handling)
export async function deleteTemplate(templateId: string, orgId: string) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Check organization access
    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .single();

    if (!org) {
      throw new Error("Organization not found or access denied");
    }

    // Get the template with usage count
    const { data: template } = await sb
      .from("lead_templates")
      .select("id, name, organization_id, is_default")
      .eq("id", templateId)
      .single();

    if (!template) {
      throw new Error("Template not found or access denied");
    }

    // Validation checks
    if (template.organization_id === '00000000-0000-0000-0000-000000000000') {
      throw new Error("Cannot delete universal templates");
    }

    if (template.organization_id !== orgId) {
      throw new Error("Cannot delete templates from other organizations");
    }

    if (template.is_default) {
      throw new Error("Cannot delete default template");
    }

    // Check if template is being used by any leads
    const { count } = await sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("template_id", templateId);

    if (count && count > 0) {
      throw new Error(`Cannot delete template "${template.name}" because it is being used by ${count} lead${count > 1 ? 's' : ''}`);
    }

    // Get field IDs for this template
    const { data: fieldIds } = await sb
      .from("lead_fields")
      .select("id")
      .eq("template_id", templateId);

    // Delete in proper order to maintain referential integrity
    if (fieldIds && fieldIds.length > 0) {
      // Delete all associated lead field values first
      await sb
        .from("lead_field_values")
        .delete()
        .in("field_id", fieldIds.map(f => f.id));
    }

    // Delete all lead fields for this template
    await sb
      .from("lead_fields")
      .delete()
      .eq("template_id", templateId);

    // Finally delete the template
    const { error } = await sb
      .from("lead_templates")
      .delete()
      .eq("id", templateId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    // Revalidate the templates page
    revalidatePath(`/organizations/${orgId}/templates`);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

// New optimized function to create template with fields in one transaction
export async function createTemplateWithFields(
  orgId: string,
  templateData: {
    name: string;
    description?: string;
    fields: Array<{
      field_key: string;
      label: string;
      field_type: string;
      is_required: boolean;
      sort_order: number;
    }>;
  }
) {
  const sb = await createClient();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Create template
    const { data: template, error: templateError } = await sb
      .from("lead_templates")
      .insert({
        organization_id: orgId,
        name: templateData.name,
        description: templateData.description,
        created_by: auth.user.id,
        is_default: false
      })
      .select()
      .single();

    if (templateError) {
      throw new Error(`Failed to create template: ${templateError.message}`);
    }

    // Create fields
    if (templateData.fields.length > 0) {
      const fieldsToInsert = templateData.fields.map(field => ({
        template_id: template.id,
        field_key: field.field_key,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        sort_order: field.sort_order
      }));

      const { error: fieldsError } = await sb
        .from("lead_fields")
        .insert(fieldsToInsert);

      if (fieldsError) {
        // Rollback: delete the template
        await sb.from("lead_templates").delete().eq("id", template.id);
        throw new Error(`Failed to create template fields: ${fieldsError.message}`);
      }
    }

    revalidatePath(`/organizations/${orgId}/templates`);
    
    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description
      }
    };
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}
