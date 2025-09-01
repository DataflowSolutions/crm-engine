import React from "react";
import { FileText, Clock, CheckCircle, FileStack } from "lucide-react";
import Link from "next/link";
import { mockLeads } from "@/constants/mockLeads";
import StatusBadge from "@/components/StatusBadge";
import { useTranslations } from "next-intl";

const UserName = "Joel Frick";

export default function LeadDashboard() {
  const t = useTranslations();

  const summary = [
    {
      icon: <FileStack className="text-blue-500" size={24} />,
      label: t("Orgs.leads.cards.all"),
      value: mockLeads.length,
    },
    {
      icon: <CheckCircle className="text-blue-600" size={24} />,
      label: t("Orgs.leads.cards.approved"),
      value: mockLeads.filter((lead) => lead.status === "Godkänd").length,
    },
    {
      icon: <Clock className="text-yellow-500" size={24} />,
      label: t("Orgs.leads.cards.scheduled"),
      value: mockLeads.filter((lead) => lead.status === "Schemalagd").length,
    },
    {
      icon: <FileText className="text-gray-500" size={24} />,
      label: t("Orgs.leads.cards.closed"),
      value: mockLeads.filter((lead) => lead.status === "Stängd").length,
    },
  ];

  return (
    <div className="min-h-screen  bg-gray-50 text-gray-800">
      {/* Navbar */}

      <div className="flex">
        {/* Sidebar */}

        {/* Main Content */}
        <main className="flex-1 px-2 md:px-4 py-8">
          <h1 className="text-2xl font-bold mb-6">
            {t("Orgs.welcome")}, {UserName}!
          </h1>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {summary.map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-2xl shadow p-4 md:p-6 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition select-none"
              >
                <div className="mb-2 text-blue-600 text-xl md:text-2xl">
                  {item.icon}
                </div>
                <div className="text-2xl md:text-3xl font-bold">
                  {item.value}
                </div>
                <div className="text-xs md:text-sm text-gray-500 font-medium mt-1">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Job table */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold mb-4">
              {t("Orgs.leads.table.title")}
            </h2>
            <Link
              href=""
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              {t("Orgs.leads.table.showall")}
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            <table className="min-w-full text-sm table-auto">
              <thead>
                <tr className="text-left text-black">
                  <th className="py-4 px-4 whitespace-nowrap">
                    {t("Orgs.leads.table.name")}
                  </th>
                  <th className="py-4 px-4 whitespace-nowrap hidden lg:block">
                    {t("Orgs.leads.table.created")}
                  </th>
                  <th className="py-4 px-4 whitespace-nowrap">
                    {t("Orgs.leads.table.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockLeads.slice(0, 5).map((lead) => {
                  return (
                    <tr
                      key={lead.id}
                      className="border-t border-black/10 text-gray-800"
                    >
                      <td className="font-medium truncate py-3 px-4 max-w-[160px]">
                        {lead.namn}
                      </td>
                      <td className="truncate px-4 hidden lg:table-cell">
                        {lead.created_at}
                      </td>
                      <td className="px-4">
                        <StatusBadge status={lead.status} />
                      </td>
                    </tr>
                  );
                })}
                {mockLeads.length > 5 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-3 text-center text-gray-500 text-sm px-4"
                    >
                      <Link
                        href=""
                        className="text-blue-600 hover:underline font-medium"
                      >
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
    </div>
  );
}
