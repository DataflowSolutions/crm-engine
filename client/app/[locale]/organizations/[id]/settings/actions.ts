"use server";

import { createClient } from "@/app/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserPermissions } from "@/utils/permissions";

export async function updateOrganization(formData: FormData) {
  const supabase = await createClient();
  
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const orgId = formData.get("orgId") as string;
  const name = formData.get("name") as string;

  if (!orgId || !name) {
    return { error: "Missing required fields" };
  }

  // Check permissions
  const permissions = await getUserPermissions(orgId, user.id);
  if (!permissions.canManageOrganization) {
    return { error: "You don't have permission to update this organization" };
  }

  try {
    const { error } = await supabase
      .from("organizations")
      .update({ name: name.trim() })
      .eq("id", orgId);

    if (error) throw error;

    revalidatePath(`/organizations/${orgId}/settings`);
    return { success: true };
  } catch (error) {
    console.error("Error updating organization:", error);
    return { error: "Failed to update organization" };
  }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const displayName = formData.get("displayName") as string;
  const email = formData.get("email") as string;

  if (!displayName || !email) {
    return { error: "Missing required fields" };
  }

  try {
    // Update user metadata in auth
    const { error: updateError } = await supabase.auth.updateUser({
      email: email.trim(),
      data: {
        display_name: displayName.trim(),
      }
    });

    if (updateError) throw updateError;

    // Also update the users table for consistency with other parts of the app
    const { error: userTableError } = await supabase
      .from("users")
      .update({ 
        full_name: displayName.trim(),
        email: email.trim()
      })
      .eq("id", user.id);

    if (userTableError) {
      console.error("Error updating users table:", userTableError);
      // Don't fail the request if the users table update fails
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Failed to update profile" };
  }
}

export async function exportOrganizationData(orgId: string) {
  const supabase = await createClient();
  
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // Check permissions
  const permissions = await getUserPermissions(orgId, user.id);
  if (!permissions.canManageOrganization) {
    return { error: "You don't have permission to export data" };
  }

  try {
    // Get organization data
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (orgError) throw orgError;

    // Get leads data
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .eq("organization_id", orgId);

    if (leadsError) throw leadsError;

    // Get members data
    const { data: members, error: membersError } = await supabase
      .from("memberships")
      .select("*")
      .eq("organization_id", orgId);

    if (membersError) throw membersError;

    const exportData = {
      organization,
      leads,
      members,
      exportedAt: new Date().toISOString(),
    };

    return { success: true, data: exportData };
  } catch (error) {
    console.error("Error exporting data:", error);
    return { error: "Failed to export data" };
  }
}
