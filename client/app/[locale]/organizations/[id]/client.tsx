"use client";

import React, { useState } from "react";
import { FileText, Clock, CheckCircle, FileStack, Users, Plus, ArrowUpDown, ArrowUp, ArrowDown, Upload } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import InteractiveStatusBadge from "./InteractiveStatusBadge";
import { StatusType } from "@/app/types/status";
import { useTranslations } from "next-intl";
import { getLeadDisplayName } from "@/utils/leadHelpers";

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
}: {
  org: Org;
  summary: { totalLeads: number; approved: number; scheduled: number; closed: number };
  leads?: Lead[];
  hasTemplate?: boolean;
  locale?: string;
  userName?: string;
}) {
  const t = useTranslations();
  const params = useParams();
  const currentLocale = locale || (params.locale as string);
  const displayName = userName && userName.trim() ? userName : "";

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

  const getSortIcon = (field: 'name' | 'created_at' | 'status') => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  // Sort leads
  const sortedLeads = [...leads].sort((a, b) => {
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
    { icon: <FileStack size={24} />, label: t("Orgs.leads.cards.all"), value: summary.totalLeads },
    { icon: <CheckCircle size={24} />, label: t("Orgs.leads.cards.approved"), value: summary.approved },
    { icon: <Clock size={24} />, label: t("Orgs.leads.cards.scheduled"), value: summary.scheduled },
    { icon: <FileText size={24} />, label: t("Orgs.leads.cards.closed"), value: summary.closed },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <main className="flex-1 px-2 md:px-4 py-8">
        {/* Organization Header with Navigation */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {displayName ? `${t("Orgs.welcome")}, ${displayName}!` : t("Orgs.welcome")}
              </h1>
              <p className="text-sm text-gray-500">{org.name}</p>
            </div>
            <div className="flex gap-2">
              {!hasTemplate ? (
                <Link 
                  href={`/${currentLocale}/organizations/${org.id}/templates/new`}
                  className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Setup Lead Template
                </Link>
              ) : (
                <>
                  <Link 
                    href={`/${currentLocale}/organizations/${org.id}/templates/import`}
                    className="inline-flex items-center px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import Leads
                  </Link>
                  <Link 
                    href={`/${currentLocale}/organizations/${org.id}/leads/new`}
                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Lead
                  </Link>
                </>
              )}
              <Link
                href={`/${currentLocale}/organizations/${org.id}/members`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Members
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {summaryCards.map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-2xl shadow p-4 md:p-6 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition select-none"
            >
              <div className="mb-2">{item.icon}</div>
              <div className="text-2xl md:text-3xl font-bold">{item.value}</div>
              <div className="text-xs md:text-sm text-gray-500 font-medium mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t("Orgs.leads.table.title")}</h2>
          <div className="flex gap-2">
            <Link
              href={`/${currentLocale}/organizations/${org.id}/templates`}
              className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
            >
              <FileStack className="w-4 h-4 mr-2" />
              Templates
            </Link>
            {hasTemplate ? (
              <>
                <Link 
                  href={`/${currentLocale}/organizations/${org.id}/templates/import`}
                  className="inline-flex items-center px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Leads
                </Link>
                <Link 
                  href={`/${currentLocale}/organizations/${org.id}/leads/new`}
                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Lead
                </Link>
                <Link 
                  href={`/${currentLocale}/organizations/${org.id}/leads`} 
                  className="inline-flex items-center px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-200 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {t("Orgs.leads.table.showall")}
                </Link>
              </>
            ) : (
              <Link 
                href={`/${currentLocale}/organizations/${org.id}/templates/new`}
                className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Setup Template First
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm table-auto relative">
            <thead>
              <tr className="text-left text-black">
                <th className="py-4 px-4 whitespace-nowrap">
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{t("Orgs.leads.table.name")}</span>
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="py-4 px-4 whitespace-nowrap hidden lg:block">
                  <button 
                    onClick={() => handleSort('created_at')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{t("Orgs.leads.table.created")}</span>
                    {getSortIcon('created_at')}
                  </button>
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <span>{t("Orgs.leads.table.status")}</span>
                    {getSortIcon('status')}
                  </button>
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  <span>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!hasTemplate ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileStack className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-sm mb-2">No lead template set up yet</p>
                      <Link 
                        href={`/${currentLocale}/organizations/${org.id}/templates/new`}
                        className="inline-flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-md hover:bg-yellow-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create your lead template first
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (!leads || leads.length === 0) ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileStack className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-sm">No leads yet</p>
                      <Link 
                        href={`/${currentLocale}/organizations/${org.id}/leads/new`}
                        className="mt-2 inline-flex items-center px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-md hover:bg-green-200 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create your first lead
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {sortedLeads.slice(0, 5).map((lead) => (
                    <tr key={lead.id} className="border-t border-black/10 text-gray-800">
                      <td className="font-medium truncate py-3 px-4 max-w-[160px]">{getLeadDisplayName({...lead, lead_field_values: lead.lead_field_values || []})}</td>
                      <td className="truncate px-4 hidden lg:table-cell">{new Date(lead.created_at).toLocaleDateString('en-US')}</td>
                      <td className="px-4 relative">
                        <InteractiveStatusBadge 
                          leadId={lead.id} 
                          currentStatus={lead.status as StatusType} 
                          orgId={org.id}
                        />
                      </td>
                      <td className="px-4">
                        <Link 
                          href={`/${locale}/organizations/${org.id}/leads/${lead.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {sortedLeads.length > 5 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-center text-gray-500 text-sm px-4">
                        <Link href={`/${currentLocale}/organizations/${org.id}/leads`} className="text-blue-600 hover:underline font-medium">
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