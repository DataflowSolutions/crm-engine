"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function deleteTemplate(templateId: string, orgId: string) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  // Check if user has access to this organization
  const { data: org } = await sb
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .single();

  if (!org) {
    throw new Error("Organization not found or access denied");
  }

  // Get the template to verify ownership and that it's not default
  const { data: template } = await sb
    .from("lead_templates")
    .select("id, name, organization_id, is_default")
    .eq("id", templateId)
    .single();

  if (!template) {
    throw new Error("Template not found or access denied");
  }

  // Prevent deleting universal templates
  if (template.organization_id === '00000000-0000-0000-0000-000000000000') {
    throw new Error("Cannot delete universal templates");
  }

  // Prevent deleting if not owned by this organization
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
}
