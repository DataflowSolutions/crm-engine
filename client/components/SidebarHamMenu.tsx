"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Building2, Users, FileText, Plus, Settings, Layers, User, Home, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import LanguageSwitcherCompact from "./LanguageSwitcherCompact";

// Icon mapping for string-based icon names
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Users,
  FileText,
  Plus,
  Settings,
  Layers,
  User,
  Home,
  LayoutDashboard,
};

// Server-compatible navigation items
const generalNavItems = [
  { iconName: "Home", labelKey: "Nav.home", href: "/" },
  { iconName: "Building2", labelKey: "Nav.organizations", href: "/organizations" },
  { iconName: "Settings", labelKey: "Nav.settings", href: "/settings" },
];

export default function SidebarHamMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <Fragment>
      {/* Hamburger button - visible only on mobile */}
      {!open && (
        <button
          className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-full bg-blue-500 shadow-md cursor-pointer hover:bg-blue-600 transition-colors duration-200"
          aria-label={t("UI.openMenu")}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Menu size={28} color="white" />
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 bg-opacity-40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar menu - mobile only */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 md:hidden px-2 flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <span className="font-bold text-lg text-black">{t("UI.menu")}</span>
          <button
            aria-label={t("UI.closeMenu")}
            onClick={() => setOpen(false)}
            className="p-2 rounded hover:bg-gray-100 cursor-pointer transition-colors duration-200"
          >
            <X size={20} className="text-gray-700" />
          </button>
        </div>
        <div className="flex flex-col gap-1 mt-2 flex-1">
          {generalNavItems.map((item) => {
            const isActive = pathname === item.href;
            const IconComponent = iconMap[item.iconName];
            
            // Skip item if no icon found
            if (!IconComponent) return null;
            
            return (
              <Link
                href={item.href}
                key={t(item.labelKey)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md hover:text-white"
                    : ""
                }`}
                onClick={() => setOpen(false)}
              >
                <IconComponent
                  className={`w-5 h-5 ${isActive ? "text-white" : "text-blue-500"}`}
                />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>

        {/* Language Switcher at the bottom */}
        <div className="px-2 pb-4 space-y-3">
          <LanguageSwitcherCompact />
        </div>
      </aside>
    </Fragment>
  );
}
