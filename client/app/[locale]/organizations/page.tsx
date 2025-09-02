import Link from "next/link";
import { createClient } from "@/app/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { Building2, Plus, ArrowRight, Users, Calendar } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="mx-auto max-w-6xl p-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("Orgs.title")}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Choose an organization to access your CRM dashboard, manage leads, and collaborate with your team.
          </p>
          
          <Link
            href="/organizations/new"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("Orgs.newButton")}
          </Link>
        </div>

        {/* Organizations Grid */}
        <div className="max-w-4xl mx-auto">
          {list.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 shadow-sm">
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Organizations Found</h3>
                <p className="text-gray-600 mb-6">
                  {t("Orgs.noOrgs")} Get started by creating your first organization.
                </p>
                <Link
                  href="/organizations/new"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t("Orgs.create")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((org) => (
                <Link
                  key={org.id}
                  href={`/organizations/${org.id}`}
                  className="group relative bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer overflow-hidden"
                >
                  {/* Background Decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-3xl"></div>
                  
                  {/* Organization Icon */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                  </div>

                  {/* Organization Info */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                      {org.name}
                    </h3>
                    
                    <p className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors duration-300">
                      {t("Orgs.openDashboard")}
                    </p>

                    {/* Stats Preview */}
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3" />
                        <span>Team</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {list.length > 0 && (
          <div className="text-center mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need to create a new organization?{" "}
              <Link
                href="/organizations/new"
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                Click here to get started
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
