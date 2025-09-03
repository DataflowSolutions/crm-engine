"use server";

import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from 'crypto';

// Type definitions for optimized member data
type OrganizationMember = {
  member_id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  invited_at: string;
  accepted: boolean;
  invited_email: string | null;
  can_manage: boolean;
};

// Optimized function to get all organization members
export async function getOrganizationMembers(orgId: string) {
  const sb = await createClient();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Use optimized database function
    const { data: members, error } = await sb
      .rpc('get_organization_members', {
        p_org_id: orgId,
        p_user_id: auth.user.id
      }) as { data: OrganizationMember[] | null; error: unknown };

    if (error) {
      throw new Error("Failed to fetch members");
    }

    return {
      success: true,
      members: members || []
    };
  } catch (dbError) {
    console.log('Database function not available, using fallback method:', dbError);
    
    // Fallback to original method
    const { data: orgData } = await sb
      .from("organizations")
      .select("owner_id")
      .eq("id", orgId)
      .single();

    if (!orgData) {
      throw new Error("Organization not found");
    }

    const { data: requestingMembership } = await sb
      .from("memberships")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", auth.user.id)
      .eq("status", "accepted")
      .single();

    const isOrgCreator = orgData.owner_id === auth.user.id;
    const canManage = isOrgCreator || requestingMembership?.role === 'admin';

    if (!canManage && !requestingMembership) {
      throw new Error("Access denied");
    }

    const { data: members, error: membersError } = await sb
      .from("memberships")
      .select(`
        id,
        user_id,
        role,
        status,
        invited_at,
        accepted,
        invited_email,
        users (
          email,
          full_name
        )
      `)
      .eq("organization_id", orgId)
      .order("status")
      .order("role");

    if (membersError) {
      throw new Error("Failed to fetch members");
    }

    const formattedMembers = (members || []).map(member => ({
      member_id: member.id,
      user_id: member.user_id,
      email: (member.users as unknown as { email: string })?.email || member.invited_email || '',
      full_name: (member.users as unknown as { full_name: string })?.full_name || null,
      role: member.role,
      status: member.status,
      invited_at: member.invited_at,
      accepted: member.accepted,
      invited_email: member.invited_email,
      can_manage: canManage
    }));

    return {
      success: true,
      members: formattedMembers
    };
  }
}

// Optimized invite member function (keeps existing logic)
export async function inviteMember(orgId: string, email: string, role: 'admin' | 'member' | 'viewer') {
  const sb = await createClient();
  
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }
  
  // Generate a secure random UUID token
  const token = randomUUID();
  
  try {
    // Check if user already has a membership
    const { data: existing } = await sb
      .from('memberships')
      .select('id, status, invited_email, users(email)')
      .eq('organization_id', orgId)
      .or(`invited_email.eq.${email},users.email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('User is already a member of this organization');
      } else if (existing.status === 'invited') {
        throw new Error('User already has a pending invitation');
      }
    }

    // Insert invited row with status='invited'
    const { data, error } = await sb
      .from('memberships')
      .insert({ 
        organization_id: orgId, 
        invited_email: email, 
        role, 
        status: 'invited',
        invited_token: token,
        invited_at: new Date().toISOString(),
        invited_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select('id, invited_token')
      .single();
    
    if (error) {
      console.error('❌ [inviteMember] error:', error);
      throw new Error('Failed to create invitation. Please try again.');
    }
    
    // Revalidate members page
    revalidatePath(`/organizations/${orgId}/members`);
    
    return { 
      success: true,
      token: data.invited_token as string, 
      membershipId: data.id as string 
    };
  } catch (error) {
    console.error('Error inviting member:', error);
    throw error;
  }
}

// Optimized function to update member role
export async function updateMemberRole(orgId: string, membershipId: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') {
  const sb = await createClient();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Check permissions (must be org creator, owner, or admin)
    const { data: permissions } = await sb
      .rpc('get_user_permissions_fast', {
        p_user_id: auth.user.id,
        p_org_id: orgId
      })
      .single() as { data: { role: string; is_org_creator: boolean } | null; error: unknown };

    if (!permissions || !(permissions.is_org_creator || permissions.role === 'admin' || permissions.role === 'owner')) {
      throw new Error("Access denied");
    }

    // Update the member role
    const { error } = await sb
      .from('memberships')
      .update({ role: newRole })
      .eq('id', membershipId)
      .eq('organization_id', orgId);

    if (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }

    revalidatePath(`/organizations/${orgId}/members`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
}

// Optimized function to remove member
export async function removeMember(orgId: string, membershipId: string) {
  const sb = await createClient();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Check permissions (must be org creator, owner, or admin)
    const { data: permissions } = await sb
      .rpc('get_user_permissions_fast', {
        p_user_id: auth.user.id,
        p_org_id: orgId
      })
      .single() as { data: { role: string; is_org_creator: boolean } | null; error: unknown };

    // Corrected Logic
if (!permissions || !(permissions.is_org_creator || permissions.role === 'admin' || permissions.role === 'owner')) {
  throw new Error("Access denied");
}

    // Get membership details to check if it's the org creator
    const { data: membership } = await sb
      .from('memberships')
      .select('user_id')
      .eq('id', membershipId)
      .eq('organization_id', orgId)
      .single();

    if (!membership) {
      throw new Error("Member not found");
    }

    // Check if trying to remove the organization creator
    const { data: org } = await sb
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .single();

    if (org && org.owner_id === membership.user_id) {
      throw new Error("Cannot remove the organization creator");
    }

    // Remove the member
    const { error } = await sb
      .from('memberships')
      .delete()
      .eq('id', membershipId)
      .eq('organization_id', orgId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }

    revalidatePath(`/organizations/${orgId}/members`);
    
    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
}

// Function to accept invite (optimized with better error handling)
export async function acceptInvite(token: string) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  try {
    // First, check if the user exists in our public users table
    console.log('🔍 [acceptInvite] Checking if user exists in public.users...');
    const { data: existingUser, error: checkError } = await sb
      .from('users')
      .select('id, email, full_name')
      .eq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ [acceptInvite] Error checking existing user:', checkError);
      throw new Error(`Failed to verify user profile: ${checkError.message}`);
    }

    if (!existingUser) {
      // User doesn't exist, try to create using the database function
      console.log('🔍 [acceptInvite] User not found, calling ensure_user_exists...');
      const { data: userData, error: userError } = await sb
        .rpc('ensure_user_exists', {
          p_user_id: user.id,
          p_email: user.email!,
          p_full_name: user.user_metadata?.full_name || null
        })
        .single();

      console.log('🔍 [acceptInvite] ensure_user_exists result:', { userData, userError });

      if (userError) {
        console.error('❌ [acceptInvite] Error ensuring user exists:', {
          message: userError.message,
          code: userError.code,
          details: userError.details,
          hint: userError.hint
        });
        
        // Check if user was created despite the error (some functions return errors even on success)
        const { data: recheckUser } = await sb
          .from('users')
          .select('id, email, full_name')
          .eq('id', user.id)
          .single();
        
        if (!recheckUser) {
          throw new Error(`Failed to create user profile: ${userError.message}. Please contact support if this persists.`);
        }
        
        console.log('✅ [acceptInvite] User was created despite RPC error');
      }
    } else {
      console.log('✅ [acceptInvite] User already exists, continuing...');
    }

    // Use the PostgreSQL function that handles invite acceptance with proper security
    const { data: claimResult, error: claimError } = await sb.rpc('claim_invitation', {
      invitation_token: token,
      user_email: user.email,
      user_id_param: user.id
    });

    if (claimError) {
      // If the RPC function doesn't exist yet, fall back to direct update
      if (claimError.message?.includes('function claim_invitation') || claimError.code === '42883') {
        console.log('RPC function not available, using fallback approach...');
        
        const { data: updateResult, error: updateError } = await sb
          .from('memberships')
          .update({ 
            user_id: user.id, 
            status: 'accepted',
            accepted: true
          })
          .eq('invited_token', token)
          .eq('invited_email', user.email)
          .eq('status', 'invited')
          .is('user_id', null)
          .select('organization_id, invited_email, invited_at')
          .maybeSingle();

        if (updateError) {
          console.error('❌ [acceptInvite] Fallback error:', updateError);
          throw new Error('Failed to accept invitation. Please ensure the invitation token is valid and matches your email address.');
        }

        if (!updateResult) {
          throw new Error('Invalid invitation token, wrong email, or invitation already claimed');
        }

        return {
          success: true,
          organizationId: updateResult.organization_id,
          message: 'Invitation accepted successfully!'
        };
      }
      
      throw new Error(claimError.message || 'Failed to accept invitation');
    }

    return {
      success: true,
      organizationId: claimResult?.organization_id,
      message: 'Invitation accepted successfully!'
    };
  } catch (error) {
    console.error('Error accepting invite:', error);
    throw error;
  }
}

// Optimized function to resend an invitation
export async function resendInvite(orgId: string, membershipId: string) {
  const sb = await createClient();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Check permissions (must be org creator, owner, or admin)
    const { data: permissions } = await sb
      .rpc('get_user_permissions_fast', {
        p_user_id: auth.user.id,
        p_org_id: orgId
      })
      .single() as { data: { role: string; is_org_creator: boolean } | null; error: unknown };

    if (!permissions || !(permissions.is_org_creator || permissions.role === 'admin' || permissions.role === 'owner')) {
      throw new Error("Access denied");
    }

    // Get the existing membership to resend
    const { data: membership } = await sb
      .from('memberships')
      .select('invited_email, role')
      .eq('id', membershipId)
      .eq('organization_id', orgId)
      .eq('status', 'invited')
      .single();

    if (!membership) {
      throw new Error("Invitation not found or already accepted");
    }

    // Generate new token and extend expiration
    const newToken = randomUUID();
    const newExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Update the membership with new token and expiration
    const { error } = await sb
      .from('memberships')
      .update({
        invited_token: newToken,
        invited_expires_at: newExpirationDate.toISOString(),
        invited_at: new Date().toISOString() // Update invitation time
      })
      .eq('id', membershipId)
      .eq('organization_id', orgId);

    if (error) {
      throw new Error(`Failed to resend invitation: ${error.message}`);
    }

    revalidatePath(`/organizations/${orgId}/members`);
    
    return {
      success: true,
      token: newToken,
      message: `Invitation resent to ${membership.invited_email}`
    };
  } catch (error) {
    console.error('Error resending invite:', error);
    throw error;
  }
}

// Optimized function to revoke an invitation
export async function revokeInvite(orgId: string, membershipId: string) {
  const sb = await createClient();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect("/login");
  }

  try {
    // Check permissions (must be org creator, owner, or admin)
    const { data: permissions } = await sb
      .rpc('get_user_permissions_fast', {
        p_user_id: auth.user.id,
        p_org_id: orgId
      })
      .single() as { data: { role: string; is_org_creator: boolean } | null; error: unknown };

    if (!permissions || !(permissions.is_org_creator || permissions.role === 'admin' || permissions.role === 'owner')) {
      throw new Error("Access denied");
    }

    // Get the membership to verify it's a pending invitation
    const { data: membership } = await sb
      .from('memberships')
      .select('invited_email, status')
      .eq('id', membershipId)
      .eq('organization_id', orgId)
      .single();

    if (!membership) {
      throw new Error("Membership not found");
    }

    if (membership.status === 'accepted') {
      throw new Error("Cannot revoke an accepted membership. Use remove member instead.");
    }

    // Delete the invitation
    const { error } = await sb
      .from('memberships')
      .delete()
      .eq('id', membershipId)
      .eq('organization_id', orgId)
      .eq('status', 'invited'); // Extra safety check

    if (error) {
      throw new Error(`Failed to revoke invitation: ${error.message}`);
    }

    revalidatePath(`/organizations/${orgId}/members`);
    
    return {
      success: true,
      message: `Invitation to ${membership.invited_email} has been revoked`
    };
  } catch (error) {
    console.error('Error revoking invite:', error);
    throw error;
  }
}
