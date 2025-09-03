// members/page.tsx (Corrected & Optimized Version)
import { redirect } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/server';
import { getUserPermissions } from '@/utils/permissions';
import MembersClient from './client';
import AccessDeniedPage from '../access-denied';

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function Page({ params }: PageProps) {
  const { id: orgId, locale } = await params;
  const base = `/${locale}`;
  
  // FIX: Added the 'await' keyword here
  const sb = await createClient();

  // --- Start Parallel Fetching ---
  const [
    authResponse,
    orgResponse,
    membershipsResponse
  ] = await Promise.all([
    sb.auth.getUser(),
    sb.from('organizations').select('id,name,slug,owner_id').eq('id', orgId).single(),
    sb.from('memberships').select(`
        id, organization_id, role, status, invited_email, invited_token, invited_at, created_at, user_id,
        users!memberships_user_id_fkey (id, email, full_name)
      `).eq('organization_id', orgId).order('created_at', { ascending: false })
  ]);
  
  const { data: auth, error: authError } = authResponse;
  const { data: org, error: orgErr } = orgResponse;
  const { data: memberships, error: memErr } = membershipsResponse;
  // --- End Parallel Fetching ---


  // Now, process the results
  // FIX: Added a check for authError to satisfy the ESLint rule
  if (authError || !auth?.user) {
    redirect(`${base}/login?redirect=${encodeURIComponent(`${base}/organizations/${orgId}/members`)}`);
  }

  // Handle Organization not found or RLS error
  if (orgErr || !org) {
    console.error("Organization query error:", orgErr);
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orgId);
    return <AccessDeniedPage locale={locale} orgId={orgId} orgExists={isValidUUID} userEmail={auth.user.email} />;
  }

  if (memErr) {
    console.error("Memberships query error:", memErr);
    throw memErr; // Or render an error boundary
  }

  // This can be fetched last. Thanks to React.cache, if the layout already 
  // fetched this, it will be an instant cache hit.
  const userPermissions = await getUserPermissions(orgId, auth.user.id);

  return (
    <MembersClient 
      org={org} 
      memberships={memberships ?? []} 
      locale={locale} 
      currentUserId={auth.user.id}
      isOrgCreator={org.owner_id === auth.user.id}
      userPermissions={userPermissions}
    />
  );
}