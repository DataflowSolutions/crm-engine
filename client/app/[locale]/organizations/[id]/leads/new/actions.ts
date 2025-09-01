"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";

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
    // Create the lead
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

    // Get template fields to know what values to insert
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

    if (template?.lead_fields) {
      // Insert field values
      const fieldValues = template.lead_fields
        .map((field: { id: string; field_key: string; label: string }) => {
          const value = formData.get(field.field_key) as string;
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

      if (fieldValues.length > 0) {
        const { error: valuesError } = await sb
          .from("lead_field_values")
          .insert(fieldValues);

        if (valuesError) {
          console.error("Error creating field values:", valuesError);
          // Don't fail the whole operation for field values
        }
      }
    }

    // Redirect to the lead detail page or leads list
    redirect(`/${locale}/organizations/${organizationId}/leads`);
  } catch (error) {
    console.error("Error in createLead:", error);
    // In a real app, you'd want to show this error to the user
    redirect(`/${locale}/organizations/${organizationId}/leads/new?error=failed`);
  }
}
