'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/app/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('❌ [login] error:', error)
    redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  
  // Get redirect URL from URL params if it exists
  const redirectTo = formData.get('redirect') as string
  if (redirectTo) {
    redirect(redirectTo)
  }
  
  redirect('/organizations')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/error')
  }

  // Check if email confirmation is required
  if (authData.user && !authData.session) {
    // Email confirmation required - redirect to a confirmation page
    redirect('/login?message=Check your email for confirmation link')
  }

  // If we have a session, the user is logged in
  if (authData.session) {
    revalidatePath('/', 'layout')
    redirect('/organizations')
  }

  // Fallback redirect
  redirect('/login')
}