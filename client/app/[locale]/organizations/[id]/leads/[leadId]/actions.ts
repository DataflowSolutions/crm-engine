"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateLeadFieldValue(
  leadId: string,
  orgId: string,
  fieldId: string,
  value: string
) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  // Check if user has access to this organization and lead
  const { data: lead } = await sb
    .from("leads")
    .select("id, organization_id")
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .single();

  if (!lead) {
    throw new Error("Lead not found or access denied");
  }

  // Check if field value already exists
  const { data: existingValue } = await sb
    .from("lead_field_values")
    .select("id")
    .eq("lead_id", leadId)
    .eq("field_id", fieldId)
    .single();

  if (existingValue) {
    // Update existing value
    const { error } = await sb
      .from("lead_field_values")
      .update({ value })
      .eq("id", existingValue.id);

    if (error) {
      throw new Error(`Failed to update field value: ${error.message}`);
    }
  } else {
    // Insert new value
    const { error } = await sb
      .from("lead_field_values")
      .insert({
        lead_id: leadId,
        field_id: fieldId,
        value
      });

    if (error) {
      throw new Error(`Failed to add field value: ${error.message}`);
    }
  }

  // Update lead's updated_at timestamp
  await sb
    .from("leads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", leadId);

  // Revalidate the lead detail page and leads list
  revalidatePath(`/organizations/${orgId}/leads/${leadId}`);
  revalidatePath(`/organizations/${orgId}/leads`);
  
  return { success: true };
}

export async function addMissingTemplateFields(
  leadId: string,
  orgId: string,
  locale: string,
  fieldValues: Record<string, string>
) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  // Check if user has access to this organization and lead
  const { data: lead } = await sb
    .from("leads")
    .select("id, organization_id, template_id")
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .single();

  if (!lead) {
    throw new Error("Lead not found or access denied");
  }

  // Insert multiple field values
  const insertData = Object.entries(fieldValues)
    .filter(([, value]) => value.trim() !== '')
    .map(([fieldId, value]) => ({
      lead_id: leadId,
      field_id: fieldId,
      value: value.trim()
    }));

  if (insertData.length > 0) {
    const { error } = await sb
      .from("lead_field_values")
      .insert(insertData);

    if (error) {
      throw new Error(`Failed to add field values: ${error.message}`);
    }

    // Update lead's updated_at timestamp
    await sb
      .from("leads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", leadId);
  }

  // Revalidate the lead detail page and leads list
  revalidatePath(`/organizations/${orgId}/leads/${leadId}`);
  revalidatePath(`/organizations/${orgId}/leads`);
  
  return { success: true };
}
