"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";

type Field = {
  id: string;
  label: string;
  field_key: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
};

export async function createTemplate(formData: FormData) {
  const sb = await createClient();
  
  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  const organizationId = formData.get("organizationId") as string;
  const locale = formData.get("locale") as string;
  const templateName = formData.get("templateName") as string;
  const isDefault = formData.get("isDefault") === "true";
  const fieldsJson = formData.get("fields") as string;

  try {
    const fields: Field[] = JSON.parse(fieldsJson);

    // Create the template
    const { data: template, error: templateError } = await sb
      .from("lead_templates")
      .insert({
        organization_id: organizationId,
        name: templateName,
        is_default: isDefault,
        created_by: auth.user.id
      })
      .select()
      .single();

    if (templateError) {
      console.error("Error creating template:", templateError);
      console.error("Template error details:", templateError);
      throw new Error(`Failed to create template: ${templateError.message}`);
    }

    // Create the fields
    const fieldInserts = fields.map((field, index) => ({
      template_id: template.id,
      label: field.label,
      field_key: field.field_key,
      field_type: field.field_type,
      is_required: field.is_required,
      sort_order: index + 1
    }));

    const { error: fieldsError } = await sb
      .from("lead_fields")
      .insert(fieldInserts);

    if (fieldsError) {
      console.error("Error creating fields:", fieldsError);
      console.error("Fields error details:", fieldsError);
      // Try to clean up the template if fields failed
      await sb.from("lead_templates").delete().eq("id", template.id);
      throw new Error(`Failed to create template fields: ${fieldsError.message}`);
    }

    console.log("Template created successfully:", template.id);
    console.log("Fields created successfully:", fieldInserts.length);
    
  } catch (error) {
    console.error("Error in createTemplate:", error);
    console.error("Full error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      organizationId,
      templateName,
      fieldsJson
    });
    redirect(`/${locale}/organizations/${organizationId}/templates/new?error=failed`);
  }
  
  // Success redirect outside of try-catch
  redirect(`/${locale}/organizations/${organizationId}/leads/new`);
}
