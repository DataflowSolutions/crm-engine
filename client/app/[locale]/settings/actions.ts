'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName = formData.get('fullName') as string

  if (!fullName) {
    redirect('/settings?message=' + encodeURIComponent('Full name is required'))
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
    },
  })

  if (error) {
    console.error('❌ [updateProfile] error:', error)
    redirect('/settings?message=' + encodeURIComponent('Failed to update profile: ' + error.message))
  }

  revalidatePath('/settings')
  redirect('/settings?message=' + encodeURIComponent('Profile updated successfully!'))
}
