"use client";
import { useTranslations } from "next-intl";
import LanguageSwitcherCompact from "./LanguageSwitcherCompact";

export default function TopNavigation() {
  const t = useTranslations();

  return (
    <div className="flex justify-end items-center p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 hidden sm:block">
          {t("UI.language")}:
        </span>
        <LanguageSwitcherCompact />
      </div>
    </div>
  );
}
