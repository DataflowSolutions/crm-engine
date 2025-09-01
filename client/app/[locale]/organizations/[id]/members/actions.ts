'use server';

import { createClient } from '@/app/utils/supabase/server';
import { randomUUID } from 'crypto';

export async function inviteMember(orgId: string, email: string, role: 'admin' | 'member' | 'viewer') {
  const sb = await createClient();
  
  // Generate a secure random UUID token
  const token = randomUUID();
  
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

  // RLS requires admin: insert invited row with status='invited'
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
  
  return { token: data.invited_token as string, membershipId: data.id as string };
}

export async function acceptInvite(token: string) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  console.log('🔍 [acceptInvite] Debug info:');
  console.log('- Token:', token);
  console.log('- User email:', user.email);

  // Use the PostgreSQL function that handles invite acceptance with proper security
  const { data: claimResult, error: claimError } = await sb.rpc('claim_invitation', {
    invitation_token: token,
    user_email: user.email,
    user_id_param: user.id
  });

  console.log('- Claim error:', claimError);
  console.log('- Claim result:', claimResult);

  if (claimError) {
    // If the RPC function doesn't exist yet (before migration), fall back to direct update
    if (claimError.message?.includes('function claim_invitation') || claimError.code === '42883') {
      console.log('- RPC function not available, using fallback approach...');
      
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

      console.log('- Fallback update error:', updateError);
      console.log('- Fallback update result:', updateResult);

      if (updateError) {
        console.error('❌ [acceptInvite] Fallback error:', updateError);
        throw new Error('Failed to accept invitation. Please ensure the invitation token is valid and matches your email address.');
      }

      if (!updateResult) {
        throw new Error('Invalid invitation token, wrong email, or invitation already claimed');
      }

      return { organization_id: updateResult.organization_id as string };
    }
    
    console.error('❌ [acceptInvite] RPC error:', claimError);
    throw new Error('Failed to process invitation. Please try again or contact support.');
  }

  if (!claimResult || !claimResult.success) {
    const errorMessage = claimResult?.error || 'Unknown error occurred';
    throw new Error(errorMessage);
  }

  return { organization_id: claimResult.organization_id as string };
}

export async function updateMemberRole(membershipId: string, role: 'owner' | 'admin' | 'member' | 'viewer') {
  const sb = await createClient();
  
  // Optional: app-side "cannot demote last owner" check
  // Fetch org + count owners
  const { data: memb, error: mErr } = await sb
    .from('memberships')
    .select('id, organization_id, role, status')
    .eq('id', membershipId)
    .single();
    
  if (mErr || !memb) throw mErr || new Error('Membership not found');

  if (memb.role === 'owner' && role !== 'owner') {
    const { count } = await sb
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', memb.organization_id)
      .eq('role', 'owner')
      .eq('status', 'accepted');
    if ((count ?? 0) <= 1) throw new Error('Cannot demote the only owner');
  }

  const { error } = await sb
    .from('memberships')
    .update({ role })
    .eq('id', membershipId);
  if (error) throw error;
}

export async function removeMember(membershipId: string) {
  const sb = await createClient();
  
  // Prevent removing last owner
  const { data: memb, error: mErr } = await sb
    .from('memberships')
    .select('id, organization_id, role, status')
    .eq('id', membershipId)
    .single();
    
  if (mErr || !memb) throw mErr || new Error('Membership not found');

  if (memb.role === 'owner' && memb.status === 'accepted') {
    const { count } = await sb
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', memb.organization_id)
      .eq('role', 'owner')
      .eq('status', 'accepted');
    if ((count ?? 0) <= 1) throw new Error('Cannot remove the only owner');
  }

  const { error } = await sb
    .from('memberships')
    .delete()
    .eq('id', membershipId);
  if (error) throw error;
}

export async function revokeInvite(membershipId: string) {
  const sb = await createClient();
  const { error } = await sb
    .from('memberships')
    .delete()
    .eq('id', membershipId)
    .eq('status', 'invited');
  if (error) throw error;
}

export async function resendInvite(membershipId: string) {
  const sb = await createClient();
  
  // Generate a new secure random UUID token
  const newToken = randomUUID();
  
  // Update the invitation with new token and reset the invitation date
  const { data, error } = await sb
    .from('memberships')
    .update({
      invited_token: newToken,
      invited_at: new Date().toISOString(),
      invited_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    })
    .eq('id', membershipId)
    .eq('status', 'invited')
    .select('invited_token, invited_email, organization_id')
    .single();
    
  if (error) throw error;
  if (!data) throw new Error('Invitation not found or already accepted');
  
  return data; // contains new invited_token for building the URL
}
