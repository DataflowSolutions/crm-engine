"use client";

import React, { useState } from "react";
import { FileText, Clock, CheckCircle, FileStack, Users, Plus, ArrowUpDown, ArrowUp, ArrowDown, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import InteractiveStatusBadge from "./InteractiveStatusBadge";
import { StatusType } from "@/app/types/status";
import { useTranslations } from "next-intl";
import { getLeadDisplayName } from "@/utils/leadHelpers";
import { UserPermissions } from "@/utils/permissions";
import { updateLeadStatus } from "./actions";

type Org = {
  id: string;
  name: string | null;
  slug: string | null;
  owner_id: string;
  created_at: string | null;
};

type Lead = {
  id: string;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  lead_field_values?: {
    value: string;
    lead_fields: {
      label: string;
      field_type: string;
    } | null;
  }[];
};

export default function OrgDashboardClient({
  org,
  summary,
  leads = [],
  hasTemplate = false,
  locale,
  userName,
  permissions,
}: {
  org: Org;
  summary: { totalLeads: number; approved: number; scheduled: number; closed: number };
  leads?: Lead[];
  hasTemplate?: boolean;
  locale?: string;
  userName?: string;
  permissions: UserPermissions;
}) {
  const t = useTranslations();
  const params = useParams();
  const currentLocale = locale || (params.locale as string);
  const displayName = userName && userName.trim() ? userName : "";

  // State management for leads and summary
  const [leadsState, setLeadsState] = useState(leads);
  const [summaryState, setSummaryState] = useState(summary);
  const [updatingLeads, setUpdatingLeads] = useState<Set<string>>(new Set());

  // Sorting state for leads
  const [sortField, setSortField] = useState<'name' | 'created_at' | 'status'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'name' | 'created_at' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle status update for dashboard
  const handleStatusUpdate = async (leadId: string, newStatus: StatusType) => {
    console.log('Dashboard: handleStatusUpdate called for lead', leadId, 'new status:', newStatus);
    console.log('Dashboard: Can edit leads:', permissions.canEditLeads);
    
    if (!permissions.canEditLeads) {
      console.log('Dashboard: No permission to edit leads');
      return;
    }
    
    setUpdatingLeads(prev => new Set([...prev, leadId]));
    
    try {
      console.log('Dashboard: Calling updateLeadStatus...');
      await updateLeadStatus(leadId, newStatus, org.id);
      console.log('Dashboard: updateLeadStatus completed successfully');
      
      // Update local state
      setLeadsState(prevLeads => {
        const updatedLeads = prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
            : lead
        );
        console.log('Dashboard: Local state updated. Lead status should now be:', newStatus);
        return updatedLeads;
      });

      // Update summary counts
      setSummaryState(prevSummary => {
        const leadToUpdate = leadsState.find(lead => lead.id === leadId);
        if (!leadToUpdate) return prevSummary;

        const oldStatus = leadToUpdate.status;
        const newSummary = { ...prevSummary };

        // Decrease old status count
        if (oldStatus === 'approved') newSummary.approved--;
        else if (oldStatus === 'scheduled') newSummary.scheduled--;
        else if (oldStatus === 'closed') newSummary.closed--;

        // Increase new status count
        if (newStatus === 'approved') newSummary.approved++;
        else if (newStatus === 'scheduled') newSummary.scheduled++;
        else if (newStatus === 'closed') newSummary.closed++;

        console.log('Dashboard: Summary updated from', prevSummary, 'to', newSummary);
        return newSummary;
      });
    } catch (error) {
      console.error('Dashboard: Failed to update lead status:', error);
    } finally {
      setUpdatingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const getSortIcon = (field: 'name' | 'created_at' | 'status') => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  // Sort leads
  const sortedLeads = [...leadsState].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'name':
        aValue = getLeadDisplayName({...a, lead_field_values: a.lead_field_values || []}).toLowerCase();
        bValue = getLeadDisplayName({...b, lead_field_values: b.lead_field_values || []}).toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'status':
        aValue = a.status.toLowerCase();
        bValue = b.status.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const summaryCards = [
    { icon: <FileStack size={24} />, label: t("Orgs.leads.cards.all"), value: summaryState.totalLeads },
    { icon: <CheckCircle size={24} />, label: t("Orgs.leads.cards.approved"), value: summaryState.approved },
    { icon: <Clock size={24} />, label: t("Orgs.leads.cards.scheduled"), value: summaryState.scheduled },
    { icon: <FileText size={24} />, label: t("Orgs.leads.cards.closed"), value: summaryState.closed },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 overflow-hidden">
        {/* Organization Header with Navigation */}
        <div className="mb-8 animate-in slide-in-from-top duration-500">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                {displayName ? `${t("Orgs.welcome")}, ${displayName}!` : t("Orgs.welcome")}
              </h1>
              <p className="text-gray-600 font-medium">{org.name}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!hasTemplate ? (
                permissions.canCreateTemplates && (
                  <Link 
                    href={`/${currentLocale}/organizations/${org.id}/templates/new`}
                    className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{t("Buttons.setupTemplate")}</span>
                    <span className="sm:hidden">Setup</span>
                  </Link>
                )
              ) : null}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t("Orgs.quickActions.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {permissions.canCreateLeads && (
              <Link
                href={`/${currentLocale}/organizations/${org.id}/leads/new`}
                className="group bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center mb-3">
                  <Plus className="w-6 h-6 mr-3" />
                  <h3 className="text-lg font-semibold">{t("Orgs.quickActions.createLead.title")}</h3>
                </div>
                <p className="text-emerald-100 text-sm">{t("Orgs.quickActions.createLead.description")}</p>
              </Link>
            )}
            
            {permissions.canImportLeads && (
              <Link
                href={`/${currentLocale}/organizations/${org.id}/templates/import`}
                className="group bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center mb-3">
                  <Upload className="w-6 h-6 mr-3" />
                  <h3 className="text-lg font-semibold">{t("Orgs.quickActions.importLeads.title")}</h3>
                </div>
                <p className="text-purple-100 text-sm">{t("Orgs.quickActions.importLeads.description")}</p>
              </Link>
            )}
            
            {permissions.canViewMembers && (
              <Link
                href={`/${currentLocale}/organizations/${org.id}/members`}
                className="group bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center mb-3">
                  <Users className="w-6 h-6 mr-3" />
                  <h3 className="text-lg font-semibold">{t("Orgs.quickActions.manageTeam.title")}</h3>
                </div>
                <p className="text-blue-100 text-sm">{t("Orgs.quickActions.manageTeam.description")}</p>
              </Link>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {summaryCards.map((item, index) => (
            <div
              key={item.label}
              className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md p-6 flex flex-col items-center text-center border border-white/50"
              style={{ 
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards'
              }}
            >
              <div className="mb-3 text-slate-600 bg-slate-100 p-3 rounded-xl">{item.icon}</div>
              <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{item.value}</div>
              <div className="text-sm text-gray-600 font-medium leading-tight">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Leads Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden animate-in slide-in-from-bottom duration-700">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t("Orgs.leads.table.recent")}</h2>
                <p className="text-sm text-gray-600 mt-1">{t("Orgs.leads.table.recentDescription", {default: "Latest 5 leads from your organization"})}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions.canViewLeads && (
                  <Link 
                    href={`/${currentLocale}/organizations/${org.id}/leads`} 
                    className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-all duration-200 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t("Orgs.leads.table.showall")}
                  </Link>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr className="text-left text-gray-700">
                <th className="py-3 px-4 whitespace-nowrap font-medium">
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{t("Orgs.leads.table.name")}</span>
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap hidden lg:block font-medium">
                  <button 
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{t("Orgs.leads.table.created")}</span>
                    {getSortIcon('created_at')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap font-medium">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{t("Orgs.leads.table.status")}</span>
                    {getSortIcon('status')}
                  </button>
                </th>
                <th className="py-3 px-4 whitespace-nowrap font-medium">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!hasTemplate ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileStack className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-sm mb-2">No lead template set up yet</p>
                      {permissions.canCreateTemplates && (
                        <Link 
                          href={`/${currentLocale}/organizations/${org.id}/templates/new`}
                          className="inline-flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-lg hover:bg-yellow-200 transition-all duration-200 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create your lead template first
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (!leads || leads.length === 0) ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileStack className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-sm">No leads yet</p>
                      {permissions.canCreateLeads && (
                        <Link 
                          href={`/${currentLocale}/organizations/${org.id}/leads/new`}
                          className="mt-2 inline-flex items-center px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-all duration-200 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create your first lead
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {sortedLeads.slice(0, 5).map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="font-medium truncate py-3 px-4 max-w-[160px] text-gray-900">{getLeadDisplayName({...lead, lead_field_values: lead.lead_field_values || []})}</td>
                      <td className="truncate px-4 hidden lg:table-cell text-gray-600">{new Date(lead.created_at).toISOString().split('T')[0]}</td>
                      <td className="px-4 relative">
                        <InteractiveStatusBadge 
                          status={lead.status as StatusType}
                          onStatusChange={(newStatus) => handleStatusUpdate(lead.id, newStatus)}
                          isUpdating={updatingLeads.has(lead.id)}
                        />
                      </td>
                      <td className="px-4">
                        <Link 
                          href={`/${locale}/organizations/${org.id}/leads/${lead.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium transition-colors duration-150 cursor-pointer"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {sortedLeads.length > 5 && (
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="py-3 text-center text-gray-500 text-sm px-4">
                        <Link href={`/${currentLocale}/organizations/${org.id}/leads`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors duration-150 cursor-pointer">
                          {sortedLeads.length - 5} {t("Orgs.leads.table.overflow")}
                        </Link>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </div>
  );
}