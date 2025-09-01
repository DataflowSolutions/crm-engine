import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import InteractiveStatusBadge from "../InteractiveStatusBadge";
import { StatusType } from "@/app/types/status";
import { getLeadDisplayName, getLeadFieldValue } from "@/utils/leadHelpers";

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function LeadsPage({ params }: PageProps) {
  const { id: orgId, locale } = await params;
  const sb = await createClient();

  // Check auth and access
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect(`/${locale}/login`);
  }

  // Get organization
  const { data: org } = await sb
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (!org) {
    redirect(`/${locale}/organizations`);
  }

  // Get leads with field values using the same query structure as dashboard
  const { data: leads } = await sb
    .from("leads")
    .select(`
      id, 
      template_id, 
      created_by, 
      created_at, 
      updated_at, 
      status,
      lead_field_values!lead_field_values_lead_id_fkey (
        value,
        lead_fields!lead_field_values_field_id_fkey (
          label,
          field_type
        )
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href={`/${locale}/organizations/${orgId}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
              <p className="text-gray-600">{org.name}</p>
            </div>
          </div>
          <Link 
            href={`/${locale}/organizations/${orgId}/leads/new`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Lead
          </Link>
        </div>

        {/* Leads List */}
        {!leads || leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first lead to start managing your prospects.
              </p>
              <Link 
                href={`/${locale}/organizations/${orgId}/leads/new`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Lead
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => {
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getLeadDisplayName(lead)}
                            </div>
                            {getLeadFieldValue(lead, 'email') && (
                              <div className="text-sm text-gray-500">
                                {getLeadFieldValue(lead, 'email')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 relative">
                          <InteractiveStatusBadge 
                            leadId={lead.id} 
                            currentStatus={lead.status as StatusType} 
                            orgId={orgId}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link 
                            href={`/${locale}/organizations/${orgId}/leads/${lead.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
