import Link from "next/link";
import { createClient } from "@/app/utils/supabase/server";
import { getTranslations } from "next-intl/server";

interface Organization {
  id: string;
  name: string;
}

export default async function OrganizationsHome() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // middleware will redirect

  console.log("🔍 [Organizations] Debug info:");
  console.log("- User ID:", user.id);
  console.log("- User email:", user.email);

  // First, let's check if the user exists in public.users
  const { data: publicUser, error: userError } = await supabase
    .from("users")
    .select("id, email, full_name")
    .eq("id", user.id)
    .single();

  console.log("- Public user error:", userError);
  console.log("- Public user data:", publicUser);

  // Let's check all memberships for this user (any status)
  const { data: allMemberships, error: allMemError } = await supabase
    .from("memberships")
    .select("id, user_id, organization_id, role, status, accepted, invited_email")
    .eq("user_id", user.id);

  console.log("- All memberships error:", allMemError);
  console.log("- All memberships data:", allMemberships);

  // Let's also check organizations where this user is the owner (excluding universal template org)
  const { data: ownedOrgs, error: ownedError } = await supabase
    .from("organizations")
    .select("id, name, owner_id")
    .eq("owner_id", user.id)
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Exclude universal template org

  console.log("- Owned orgs error:", ownedError);
  console.log("- Owned orgs data:", ownedOrgs);

  // Now let's get organizations through memberships (accepted members, excluding universal template org)
  const { data: membershipOrgs, error: membershipError } = await supabase
    .from("memberships")
    .select(`
      organization:organizations!memberships_organization_id_fkey(id, name)
    `)
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .neq("organization_id", "00000000-0000-0000-0000-000000000000"); // Exclude universal template org

  console.log("- Membership orgs error:", membershipError);
  console.log("- Membership orgs data:", membershipOrgs);

  // Combine owned organizations and membership organizations
  const membershipOrgList = membershipOrgs
    ?.map(m => m.organization)
    .filter((org): org is NonNullable<typeof org> => org !== null && org !== undefined) || [];
  const ownedOrgList = ownedOrgs || [];
  
  // Remove duplicates (in case user owns an org they're also a member of)
  const allOrgsMap = new Map<string, Organization>();
  [...ownedOrgList, ...membershipOrgList].forEach(org => {
    if (org && typeof org === 'object' && 'id' in org && 'name' in org) {
      allOrgsMap.set(org.id, { id: org.id, name: org.name });
    }
  });
  
  const list: Organization[] = Array.from(allOrgsMap.values());

  console.log("- Final organization list:", list);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("Orgs.title")}</h1>
        <Link
          href="/organizations/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700"
        >
          {t("Orgs.newButton")}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {list.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-600">
            {t("Orgs.noOrgs")}
            <Link
              href="/organizations/new"
              className="ml-1 text-indigo-600 underline"
            >
              {t("Orgs.create")}
            </Link>
          </div>
        )}

        {list.map((org) => (
          <Link
            key={org.id}
            href={`/organizations/${org.id}`}
            className="rounded-lg border bg-white p-5 shadow-sm hover:shadow-md"
          >
            <div className="text-lg font-semibold text-gray-900">
              {org.name}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {t("Orgs.openDashboard")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
