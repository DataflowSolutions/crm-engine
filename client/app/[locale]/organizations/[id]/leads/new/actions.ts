"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";

type CreateLeadResponse = {
  success: boolean;
  lead_id: string;
  error_message: string;
};

// Optimized function to create a lead with all field values in one transaction
export async function createLead(formData: FormData) {
  const sb = await createClient();
  
  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  const organizationId = formData.get("organizationId") as string;
  const templateId = formData.get("templateId") as string;
  const locale = formData.get("locale") as string;
  const status = formData.get("status") as string;

  try {
    // First, get template fields to know what values to collect
    const { data: template } = await sb
      .from("lead_templates")
      .select(`
        lead_fields!fld_tpl_fk (
          id,
          field_key,
          label
        )
      `)
      .eq("id", templateId)
      .single();

    // Collect field values from form data
    const fieldValues: Record<string, string> = {};
    if (template?.lead_fields) {
      template.lead_fields.forEach((field: { id: string; field_key: string; label: string }) => {
        const value = formData.get(field.field_key) as string;
        if (value && value.trim()) {
          fieldValues[field.field_key] = value.trim();
        }
      });
    }

    // Try optimized function first
    try {
      const { data: result, error } = await sb
        .rpc('create_lead_with_fields', {
          p_org_id: organizationId,
          p_template_id: templateId,
          p_user_id: auth.user.id,
          p_status: status,
          p_field_values: fieldValues
        })
        .single() as { data: CreateLeadResponse | null; error: unknown };

      if (error || !result?.success) {
        throw new Error(result?.error_message || "Database function failed");
      }

      // Success - redirect to the leads list
      redirect(`/${locale}/organizations/${organizationId}/leads`);
    } catch (dbFunctionError) {
      console.log('Database function not available, using fallback method:', dbFunctionError);
      
      // Fallback to original transactional approach
      const { data: lead, error: leadError } = await sb
        .from("leads")
        .insert({
          organization_id: organizationId,
          template_id: templateId,
          created_by: auth.user.id,
          status: status
        })
        .select()
        .single();

      if (leadError) {
        console.error("Error creating lead:", leadError);
        throw new Error("Failed to create lead");
      }

      // Insert field values if any
      if (template?.lead_fields && Object.keys(fieldValues).length > 0) {
        const fieldValueInserts = template.lead_fields
          .map((field: { id: string; field_key: string; label: string }) => {
            const value = fieldValues[field.field_key];
            if (value) {
              return {
                lead_id: lead.id,
                field_id: field.id,
                value: value
              };
            }
            return null;
          })
          .filter(Boolean);

        if (fieldValueInserts.length > 0) {
          const { error: valuesError } = await sb
            .from("lead_field_values")
            .insert(fieldValueInserts);

          if (valuesError) {
            console.error("Error creating field values:", valuesError);
            // Don't fail the whole operation for field values
          }
        }
      }

      // Redirect to the lead detail page or leads list
      redirect(`/${locale}/organizations/${organizationId}/leads`);
    }
  } catch (error) {
    console.error("Error in createLead:", error);
    // In a real app, you'd want to show this error to the user
    redirect(`/${locale}/organizations/${organizationId}/leads/new?error=failed`);
  }
}

// Optimized function to get template data for form
export async function getTemplateForForm(templateId: string, orgId: string) {
  const sb = await createClient();
  
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Use optimized template function
    const { data: templates, error } = await sb
      .rpc('get_templates_comprehensive', {
        p_org_id: orgId
      });

    if (error) {
      throw new Error("Failed to fetch template");
    }

    const template = templates?.find((t: { template_id: string }) => t.template_id === templateId);
    
    if (!template) {
      throw new Error("Template not found");
    }

    return {
      success: true,
      template: {
        id: template.template_id,
        name: template.name,
        description: template.description,
        fields: template.fields
      }
    };
  } catch (error) {
    console.error('Error fetching template:', error);
    
    // Fallback to original method
    const { data: template, error: templateError } = await sb
      .from("lead_templates")
      .select(`
        id,
        name,
        description,
        lead_fields!fld_tpl_fk (
          id,
          field_key,
          label,
          field_type,
          is_required,
          sort_order
        )
      `)
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error("Template not found");
    }

    return {
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        fields: template.lead_fields || []
      }
    };
  }
}
