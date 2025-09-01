'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/app/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Basic validation
  if (!data.email || !data.password) {
    redirect('/login?message=' + encodeURIComponent('Email and password are required'))
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('❌ [login] error:', error)
    
    // Get redirect URL to preserve it in error state
    const redirectTo = formData.get('redirect') as string
    const redirectParam = redirectTo ? `&redirect=${encodeURIComponent(redirectTo)}` : ''
    
    redirect(`/login?message=${encodeURIComponent(error.message)}${redirectParam}`)
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

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const fullName = formData.get('fullName') as string

  // Basic validation
  if (!data.email || !data.password) {
    redirect('/login?message=' + encodeURIComponent('Email and password are required'))
  }

  if (!fullName) {
    redirect('/login?message=' + encodeURIComponent('Full name is required'))
  }

  if (data.password.length < 6) {
    redirect('/login?message=' + encodeURIComponent('Password must be at least 6 characters'))
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    console.error('❌ [signup] error:', error)
    redirect('/login?message=' + encodeURIComponent(error.message))
  }

  // Check if email confirmation is required
  if (authData.user && !authData.session) {
    // Email confirmation required - redirect with success message
    redirect('/login?message=' + encodeURIComponent('Success! Check your email for a confirmation link before logging in.'))
  }

  // If we have a session, the user is logged in immediately
  if (authData.session) {
    revalidatePath('/', 'layout')
    
    // Get redirect URL from form data if it exists
    const redirectTo = formData.get('redirect') as string
    if (redirectTo) {
      redirect(redirectTo)
    }
    
    redirect('/organizations')
  }

  // Fallback redirect
  redirect('/login?message=' + encodeURIComponent('Account created successfully! Please log in.'))
}