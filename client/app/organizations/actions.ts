'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/server'

export async function createOrganization(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  console.log('🔹 [createOrganization] form name:', name)

  if (!name) {
    console.warn('⚠️ [createOrganization] No name provided')
    redirect('/organizations/new?error=Name%20is%20required')
  }

  const supabase = await createClient()
  
  // First check if we have a session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log('🔹 [createOrganization] session:', session ? 'exists' : 'null')
  if (sessionError) console.error('❌ [createOrganization] getSession error:', sessionError)
  
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log('🔹 [createOrganization] user:', user ? `${user.email} (${user.id})` : 'null')
  if (userError) console.error('❌ [createOrganization] getUser error:', userError)

  if (!user) {
    console.warn('⚠️ [createOrganization] No user, redirecting to login')
    redirect('/login?message=Please%20log%20in%20to%20create%20an%20organization')
  }

  // 1) create org (owner_id = user.id)
const { data: org, error: orgErr } = await supabase
  .from('organizations')
  .insert({ name, owner_id: user.id })
  .select('id')
  .single();
if (orgErr) redirect(`/organizations/new?error=${encodeURIComponent(orgErr.message)}`);

// 2) add owner membership for the creator (allowed by memb_insert policy)
const { error: memErr } = await supabase
  .from('memberships')
  .insert({ user_id: user.id, organization_id: org.id, role: 'owner', accepted: true });
if (memErr) redirect(`/organizations/new?error=${encodeURIComponent(memErr.message)}`);

redirect(`/organizations/${org.id}`);


}
