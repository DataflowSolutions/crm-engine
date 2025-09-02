import { redirect } from 'next/navigation';
import { acceptInvite } from '../organizations/[id]/members/actions';
import { createClient } from '@/app/utils/supabase/server';

type PageProps = { 
  searchParams: Promise<{ token?: string }>;
  params: Promise<{ locale: string }>;
};

export default async function Page({ searchParams, params }: PageProps) {
  const { token } = await searchParams;
  const { locale } = await params;
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  const base = `/${locale}`;

  if (!token) return redirect(`${base}/`);
  if (!auth?.user) {
    return redirect(`${base}/login?redirect=${encodeURIComponent(`${base}/accept-invite?token=${token}`)}`);
  }

  try {
    console.log('🔍 [accept-invite page] Starting invite acceptance...');
    const result = await acceptInvite(token);
    const { organizationId } = result;
    console.log('🔍 [accept-invite page] Redirecting to organization:', organizationId);
    redirect(`${base}/organizations/${organizationId}`);
  } catch (error) {
    console.error('❌ [accept-invite page] Error accepting invite:', error);
    
    // Re-throw redirect errors - they should not be caught
    if (error && typeof error === 'object' && 
        (error.constructor.name === 'RedirectError' || 
         ('digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')))) {
      throw error;
    }
    
    // Show error UI for actual invite acceptance errors
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invite</h1>
            <p className="text-gray-600 mb-6">
              {error instanceof Error ? error.message : 'This invite link is invalid, expired, or has already been used.'}
            </p>
            <a
              href={`${base}/`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
