"use client";
import Link from "next/link";
import { navItems } from "../constants/navItems";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Sidebar() {
  const t = useTranslations();

  return (
    <div className="flex flex-col h-full fixed py-4">
      <div className="flex flex-col gap-2">
        {(() => {
          // Import usePathname at the top: import { usePathname } from "next/navigation";
          // Use the hook inside the component
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const pathname = usePathname();

          return navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                href={item.href}
                key={t(item.labelKey)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md hover:text-white"
                    : ""
                }`}
              >
                <item.icon
                  size={20}
                  className={isActive ? "text-white" : "text-blue-500"}
                />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          });
        })()}
      </div>

      {/* Settings section at the bottom */}
      <div className="mt-auto space-y-2 sidebar-settings ">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
