import Link from 'next/link'
import { createClient } from '@/app/utils/supabase/server'

interface MembershipOrg {
  organization: {
    id: string
    name: string
  } | null
}

export default async function OrganizationsHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // middleware will redirect

  const { data: orgs } = await supabase
    .from('memberships')
    .select('organization:organizations(id,name)')
    .eq('user_id', user.id)
    .eq('accepted', true)

  const list =
    (orgs as MembershipOrg[] | null)?.map(r => r.organization).filter((o): o is NonNullable<typeof o> => o !== null) ?? []

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your organizations</h1>
        <Link
          href="/organizations/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700"
        >
          New organization
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
            No orgs yet. Create your first one 👉
            <Link href="/organizations/new" className="ml-1 text-indigo-600 underline">Create</Link>
          </div>
        )}

        {list.map(org => (
          <Link
            key={org.id}
            href={`/organizations/${org.id}`}
            className="rounded-lg border bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="text-lg font-semibold text-gray-900">{org.name}</div>
            <div className="mt-1 text-sm text-gray-500">Open dashboard →</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
