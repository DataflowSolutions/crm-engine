// Optimized Organization Page
// /app/[locale]/organizations/[id]/page-optimized.tsx

import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import { getUserPermissions } from "@/utils/permissions";
import Link from "next/link";
import { Plus, Users, FileText, BarChart3, Clock } from "lucide-react";
import RecentLeadsClient from "./RecentLeadsClient";

type PageProps = { params: Promise<{ id: string; locale: string }> };

// Type for dashboard data
type DashboardData = {
  total_leads: number;
  leads_by_status: Record<string, number>;
  recent_leads: Array<{
    id: string;
    status: string;
    created_at: string;
    created_by_name: string;
    template_name: string;
    lead_field_values: Array<{
      value: string;
      lead_fields: {
        label: string;
        field_type: string;
      } | null;
    }>;
  }>;
  total_templates: number;
  total_members: number;
  recent_activity: Array<{
    id: string;
    type: string;
    content: string;
    created_at: string;
    user_name: string;
    lead_id: string;
  }>;
};

type OrganizationInfoResponse = {
  role: string;
  is_org_creator: boolean;
  org_name: string;
  org_slug: string;
};

export default async function OrganizationPageOptimized({ params }: PageProps) {
  const { id: orgId, locale } = await params;
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect(`/${locale}/login`);
  }

  // Get organization info and permissions using optimized function
  const { data: orgInfo, error: orgError } = await sb
    .rpc('get_user_permissions_fast', {
      p_user_id: auth.user.id,
      p_org_id: orgId
    })
    .single() as { data: OrganizationInfoResponse | null; error: unknown };

  if (orgError || !orgInfo) {
    redirect(`/${locale}/organizations`);
  }

  // Get dashboard data using optimized function
  const { data: dashboardData, error: dashboardError } = await sb
    .rpc('get_organization_dashboard', {
      p_org_id: orgId,
      p_user_id: auth.user.id
    })
    .single() as { data: DashboardData | null; error: unknown };

  if (dashboardError) {
    console.error('Error fetching dashboard data:', dashboardError);
  }

  // Get user permissions
  const permissions = await getUserPermissions(orgId, auth.user.id);

  const leadsByStatus = dashboardData?.leads_by_status || {};
  const recentLeads = dashboardData?.recent_leads || [];
  const recentActivity = dashboardData?.recent_activity || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {orgInfo.org_name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Organization Dashboard
              </p>
            </div>
            <div className="flex space-x-3">
              {permissions.canCreateLeads && (
                <Link
                  href={`/${locale}/organizations/${orgId}/leads/new`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Lead
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Leads
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.total_leads || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link 
                  href={`/${locale}/organizations/${orgId}/leads`}
                  className="font-medium text-blue-700 hover:text-blue-900"
                >
                  View all leads
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Templates
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.total_templates || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link 
                  href={`/${locale}/organizations/${orgId}/templates`}
                  className="font-medium text-blue-700 hover:text-blue-900"
                >
                  Manage templates
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Members
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.total_members || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link 
                  href={`/${locale}/organizations/${orgId}/members`}
                  className="font-medium text-blue-700 hover:text-blue-900"
                >
                  Manage members
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Approved Leads
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {leadsByStatus.approved || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {permissions.canCreateLeads && (
                  <Link
                    href={`/${locale}/organizations/${orgId}/leads/new`}
                    className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-700 transition-colors">
                      <Plus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Create New Lead</div>
                      <div className="text-xs text-gray-600">Add a new prospect to your pipeline</div>
                    </div>
                  </Link>
                )}
                
                {permissions.canImportLeads && (
                  <Link
                    href={`/${locale}/organizations/${orgId}/templates/import`}
                    className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-purple-700 transition-colors">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Import Leads</div>
                      <div className="text-xs text-gray-600">Upload leads from a spreadsheet</div>
                    </div>
                  </Link>
                )}

                {permissions.canManageMembers && (
                  <Link
                    href={`/${locale}/organizations/${orgId}/members`}
                    className="flex items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-700 transition-colors">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Manage Team</div>
                      <div className="text-xs text-gray-600">Invite and manage organization members</div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Leads</h3>
            </div>
            <div className="p-6">
              <RecentLeadsClient 
                leads={recentLeads.map(lead => ({
                  ...lead,
                  template_id: null,
                  created_by: '',
                  updated_at: lead.created_at
                }))}
                orgId={orgId}
                locale={locale}
                permissions={permissions}
              />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user_name}</span>{' '}
                        {activity.content}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
