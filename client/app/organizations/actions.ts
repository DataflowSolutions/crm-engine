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

  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, owner_id: user.id })
    .select('id')
    .single()

  console.log('🔹 [createOrganization] insert data:', data)
  if (error) {
    console.error('❌ [createOrganization] insert error:', error)
    redirect(`/organizations/new?error=${encodeURIComponent(error.message)}`)
  }

  console.log('✅ [createOrganization] created org with id:', data.id)
  redirect(`/organizations/${data.id}`)
}
