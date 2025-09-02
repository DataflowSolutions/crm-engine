"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Type definitions for database function responses
type UpdateLeadStatusResponse = {
  success: boolean;
  error_message: string;
};

type BulkDeleteResponse = {
  success: boolean;
  deleted_count: number;
  error_message: string;
};

type OrganizationInfoResponse = {
  role: string;
  is_org_creator: boolean;
  org_name: string;
  org_slug: string;
};

export async function updateLeadStatus(leadId: string, newStatus: string, orgId: string) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  // Use optimized database function (will fall back to old logic if function doesn't exist)
  try {
    const { data: result } = await sb
      .rpc('update_lead_status_fast', {
        p_lead_id: leadId,
        p_new_status: newStatus,
        p_org_id: orgId,
        p_user_id: auth.user.id
      })
      .single() as { data: UpdateLeadStatusResponse | null; error: unknown };

    if (result?.success) {
      // Revalidate the leads page
      revalidatePath(`/organizations/${orgId}/leads`);
      revalidatePath(`/organizations/${orgId}`);
      return { success: true };
    }
    
    // If function failed, fall back to old method
    throw new Error(result?.error_message || 'Database function failed');
  } catch (dbFunctionError) {
    console.log('Database function not available, using fallback method:', dbFunctionError);
    
    // Fallback to original method
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

    // Revalidate the organization and leads pages
    revalidatePath(`/organizations/${orgId}`);
    revalidatePath(`/organizations/${orgId}/leads`);
    
    return { success: true };
  }
}

export async function bulkDeleteLeads(leadIds: string[], orgId: string) {
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  // Try optimized function first, fall back to old method
  try {
    const { data: result } = await sb
      .rpc('bulk_delete_leads', {
        p_lead_ids: leadIds,
        p_org_id: orgId,
        p_user_id: auth.user.id
      })
      .single() as { data: BulkDeleteResponse | null; error: unknown };

    if (result?.success) {
      // Revalidate the leads page
      revalidatePath(`/organizations/${orgId}/leads`);
      revalidatePath(`/organizations/${orgId}`);
      
      return { 
        success: true, 
        deletedCount: result.deleted_count,
        message: `Successfully deleted ${result.deleted_count} lead(s)`
      };
    }
    
    throw new Error(result?.error_message || 'Database function failed');
  } catch (dbFunctionError) {
    console.log('Bulk delete function not available, using fallback method:', dbFunctionError);
    
    // Fallback: Use the existing bulk delete API endpoint logic
    // Verify user has access to the organization
    const { data: membership } = await sb
      .from("memberships")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", auth.user.id)
      .single();

    if (!membership) {
      throw new Error("Access denied");
    }

    // Verify that all leads belong to this organization
    const { data: leadsToDelete } = await sb
      .from("leads")
      .select("id")
      .eq("organization_id", orgId)
      .in("id", leadIds);

    if (!leadsToDelete || leadsToDelete.length !== leadIds.length) {
      throw new Error("Some leads do not exist or do not belong to this organization");
    }

    // Delete lead field values first (due to foreign key constraints)
    const { error: valuesError } = await sb
      .from("lead_field_values")
      .delete()
      .in("lead_id", leadIds);

    if (valuesError) {
      throw new Error("Failed to delete lead field values");
    }

    // Delete the leads
    const { error: leadsError } = await sb
      .from("leads")
      .delete()
      .in("id", leadIds);

    if (leadsError) {
      throw new Error("Failed to delete leads");
    }

    // Revalidate pages
    revalidatePath(`/organizations/${orgId}/leads`);
    revalidatePath(`/organizations/${orgId}`);

    return {
      success: true,
      deletedCount: leadIds.length,
      message: `Successfully deleted ${leadIds.length} lead(s)`
    };
  }
}

// Function to get organization data with permissions
export async function getOrganizationData(orgId: string, userId: string) {
  const sb = await createClient();

  // Try optimized function first
  try {
    const { data: orgInfo, error } = await sb
      .rpc('get_user_permissions_fast', {
        p_user_id: userId,
        p_org_id: orgId
      })
      .single() as { data: OrganizationInfoResponse | null; error: unknown };

    if (orgInfo && !error) {
      return {
        orgName: orgInfo.org_name,
        orgSlug: orgInfo.org_slug,
        userRole: orgInfo.role,
        isOrgCreator: orgInfo.is_org_creator
      };
    }
    
    throw new Error("Database function failed");
  } catch {
    // console.log('Organization data function not available, using fallback method:', dbFunctionError);
    
    // Fallback to separate queries
    const { data: org } = await sb
      .from("organizations")
      .select("id, name, slug, owner_id")
      .eq("id", orgId)
      .single();

    if (!org) {
      throw new Error("Organization not found or access denied");
    }

    const { data: membership } = await sb
      .from("memberships")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .eq("status", "accepted")
      .single();

    return {
      orgName: org.name,
      orgSlug: org.slug,
      userRole: membership?.role || null,
      isOrgCreator: org.owner_id === userId
    };
  }
}
