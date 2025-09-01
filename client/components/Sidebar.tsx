"use client";
import Link from "next/link";
import { navItems } from "../constants/navItems";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
<<<<<<< HEAD
import DarkModeToggle from "./DarkModeToggle";
import { Settings } from "lucide-react";
=======
import LanguageSwitcher from "./LanguageSwitcher";
>>>>>>> 73deee38056640f34784bfa07c821bba66b35930

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

<<<<<<< HEAD
      {/* Dark Mode Toggle and Settings at the bottom */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between px-2">
          <DarkModeToggle />
          <Link
            href="/settings"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
            title={t("Settings.title")}
          >
            <Settings size={18} />
          </Link>
        </div>
=======
      {/* Settings section at the bottom */}
      <div className="mt-auto space-y-2 sidebar-settings ">
        <LanguageSwitcher />
>>>>>>> 73deee38056640f34784bfa07c821bba66b35930
      </div>
    </div>
  );
}
