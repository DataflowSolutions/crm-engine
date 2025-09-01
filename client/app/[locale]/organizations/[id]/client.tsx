"use client";

import React from "react";
import { FileText, Clock, CheckCircle, FileStack, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { useTranslations } from "next-intl";

// Replace this later with real leads list
import { mockLeads } from "@/constants/mockLeads";

type Org = {
  id: string;
  name: string | null;
  slug: string | null;
  owner_id: string;
  created_at: string | null;
};

export default function OrgDashboardClient({
  org,
  summary,
}: {
  org: Org;
  summary: { totalLeads: number; approved: number; scheduled: number; closed: number };
}) {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const UserName = "Joel Frick"; // Replace with current user's name if you fetch it

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
                {t("Orgs.welcome")}, {UserName}!
              </h1>
              <p className="text-sm text-gray-500">{org.name}</p>
            </div>
            <Link
              href={`/${locale}/organizations/${org.id}/members`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Members
            </Link>
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

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold mb-4">{t("Orgs.leads.table.title")}</h2>
          <Link href="" className="text-blue-600 hover:underline text-sm font-medium">
            {t("Orgs.leads.table.showall")}
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="min-w-full text-sm table-auto">
            <thead>
              <tr className="text-left text-black">
                <th className="py-4 px-4 whitespace-nowrap">{t("Orgs.leads.table.name")}</th>
                <th className="py-4 px-4 whitespace-nowrap hidden lg:block">{t("Orgs.leads.table.created")}</th>
                <th className="py-4 px-4 whitespace-nowrap">{t("Orgs.leads.table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {mockLeads.slice(0, 5).map((lead) => (
                <tr key={lead.id} className="border-t border-black/10 text-gray-800">
                  <td className="font-medium truncate py-3 px-4 max-w-[160px]">{lead.namn}</td>
                  <td className="truncate px-4 hidden lg:table-cell">{lead.created_at}</td>
                  <td className="px-4">
                    <StatusBadge status={lead.status} />
                  </td>
                </tr>
              ))}
              {mockLeads.length > 5 && (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-gray-500 text-sm px-4">
                    <Link href="" className="text-blue-600 hover:underline font-medium">
                      {mockLeads.length - 5} {t("Orgs.leads.table.overflow")}
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
