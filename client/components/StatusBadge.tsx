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
  };

  const icons: Record<StatusType, JSX.Element> = {
    Stängd: <FileText size={14} />,
    Godkänd: <CheckCircle size={14} />,
    Schemalagd: <Clock size={14} />,
  };

  const translationMap: Record<StatusType, string> = {
    Stängd: t("Orgs.leads.badges.closed"),
    Godkänd: t("Orgs.leads.badges.approved"),
    Schemalagd: t("Orgs.leads.badges.scheduled"),
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {icons[status]} {translationMap[status]}
    </span>
  );
}
