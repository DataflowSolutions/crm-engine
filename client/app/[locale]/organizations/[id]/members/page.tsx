import { redirect } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/server';
import { getUserPermissions } from '@/utils/permissions';
import MembersClient from './client';
import AccessDeniedPage from '../access-denied';

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function Page({ params }: PageProps) {
  const { id: orgId, locale } = await params;
  const base = `/${locale}`;
  const sb = await createClient();

  // Auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect(`${base}/login?redirect=${encodeURIComponent(`${base}/organizations/${orgId}/members`)}`);
  }

  // RLS: Ensure the viewer can read the org
  const { data: org, error: orgErr } = await sb
    .from('organizations')
    .select('id,name,slug,owner_id')
    .eq('id', orgId)
    .single();

  if (orgErr?.code === 'PGRST116' || !org) {
    // Show access denied instead of 404
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orgId);
    return <AccessDeniedPage locale={locale} orgId={orgId} orgExists={isValidUUID} userEmail={auth.user.email} />;
  }
  if (orgErr) {
    console.error("Organization query error:", orgErr);
    return <AccessDeniedPage locale={locale} orgId={orgId} orgExists={true} userEmail={auth.user.email} />;
  }

  // Fetch memberships + user details (user may be null for invited)
  const { data: memberships, error: memErr } = await sb
    .from('memberships')
    .select(`
      id, 
      organization_id, 
      role, 
      status, 
      invited_email, 
      invited_token, 
      invited_at, 
      created_at, 
      user_id,
      users!memberships_user_id_fkey (
        id, 
        email, 
        full_name
      )
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  console.log('🔍 [Members Page] Debug info:');
  console.log('- Memberships error:', memErr);
  console.log('- Memberships data:', JSON.stringify(memberships, null, 2));

  if (memErr) throw memErr;

  // Get user permissions
  const userPermissions = await getUserPermissions(auth.user.id, orgId);

  return <MembersClient 
    org={org} 
    memberships={memberships ?? []} 
    locale={locale} 
    currentUserId={auth.user.id}
    isOrgCreator={org.owner_id === auth.user.id}
    userPermissions={userPermissions}
  />;
}
