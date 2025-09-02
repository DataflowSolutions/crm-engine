// components/StatusBadge.tsx
import { StatusType } from "@/app/types/status";
import { CheckCircle, Clock, FileText } from "lucide-react";
import type { JSX } from "react";
import { useTranslations } from "next-intl";

export default function StatusBadge({ status }: { status: StatusType }) {
  const t = useTranslations();

  const styles: Record<StatusType, string> = {
    Stängd: "bg-gray-100 text-gray-500",
    Godkänd: "bg-blue-100 text-blue-600",
    Schemalagd: "bg-yellow-100 text-yellow-600",
    Utkast: "bg-gray-100 text-gray-600",
    draft: "bg-gray-100 text-gray-600",
    approved: "bg-blue-100 text-blue-600",
    scheduled: "bg-yellow-100 text-yellow-600",
    closed: "bg-gray-100 text-gray-500",
  };

  const icons: Record<StatusType, JSX.Element> = {
    Stängd: <FileText size={14} />,
    Godkänd: <CheckCircle size={14} />,
    Schemalagd: <Clock size={14} />,
    Utkast: <FileText size={14} />,
    draft: <FileText size={14} />,
    approved: <CheckCircle size={14} />,
    scheduled: <Clock size={14} />,
    closed: <FileText size={14} />,
  };

  const translationMap: Record<StatusType, string> = {
    Stängd: t("Orgs.leads.badges.closed"),
    Godkänd: t("Orgs.leads.badges.approved"),
    Schemalagd: t("Orgs.leads.badges.scheduled"),
    Utkast: t("Orgs.leads.badges.draft"),
    draft: t("Orgs.leads.badges.draft"),
    approved: t("Orgs.leads.badges.approved"),
    scheduled: t("Orgs.leads.badges.scheduled"),
    closed: t("Orgs.leads.badges.closed"),
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {icons[status]} {translationMap[status]}
    </span>
  );
}
