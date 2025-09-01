"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateLeadStatus(leadId: string, newStatus: string, orgId: string) {
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

  // Verify the lead belongs to this organization
  const { data: lead } = await sb
    .from("leads")
    .select("id, organization_id")
    .eq("id", leadId)
    .eq("organization_id", orgId)
    .single();

  if (!lead) {
    throw new Error("Lead not found or access denied");
  }

  // Update the lead status
  const { error } = await sb
    .from("leads")
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", leadId);

  if (error) {
    throw new Error(`Failed to update lead status: ${error.message}`);
  }

  // Revalidate the organization page
  revalidatePath(`/organizations/${orgId}`);
  
  return { success: true };
}
