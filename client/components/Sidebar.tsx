"use client";
import Link from "next/link";
import { navItems } from "../constants/navItems";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import { Building2, Users, FileText, Plus, Settings, Home, Layers } from "lucide-react";

export default function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams();
  
  // Check if we're inside an organization
  const orgId = params?.id as string;
  const locale = params?.locale as string;
  const isInOrganization = pathname.includes('/organizations/') && orgId && orgId !== 'new';

  // Organization-specific navigation items
  const orgNavItems = [
    { 
      icon: Building2, 
      labelKey: "Nav.dashboard", 
      href: `/${locale}/organizations/${orgId}`,
    },
    { 
      icon: FileText, 
      labelKey: "Nav.leads", 
      href: `/${locale}/organizations/${orgId}/leads`,
    },
    { 
      icon: Plus, 
      labelKey: "Nav.newLead", 
      href: `/${locale}/organizations/${orgId}/leads/new`,
    },
    { 
      icon: Layers, 
      labelKey: "Nav.templates", 
      href: `/${locale}/organizations/${orgId}/templates`,
    },
    { 
      icon: Users, 
      labelKey: "Nav.members", 
      href: `/${locale}/organizations/${orgId}/members`,
    },
  ];

  const currentNavItems = isInOrganization ? orgNavItems : navItems.filter(item => item.href !== '/dashboard');

  return (
    <div className="flex flex-col h-full fixed py-4">
      {/* Back to Organizations link when in organization */}
      {isInOrganization && (
        <div className="px-4 pb-4 border-b border-gray-200 mb-4">
          <Link
            href={`/${locale}/organizations`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Home size={16} />
            ← Back to Organizations
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {currentNavItems.map((item) => {
          // More precise active state logic
          let isActive = false;
          if (item.href.includes('/organizations/') && orgId) {
            // For organization pages, check exact matches or specific patterns
            if (item.href.endsWith(`/organizations/${orgId}`)) {
              // Dashboard - only active on exact match
              isActive = pathname === item.href;
            } else if (item.href.endsWith('/leads')) {
              // All leads page - only active on exact match
              isActive = pathname === item.href;
            } else if (item.href.endsWith('/leads/new')) {
              // New lead page - active on exact match or edit pages
              isActive = pathname === item.href || pathname.includes('/leads/new') || pathname.includes('/leads/edit');
            } else {
              // Other pages - check if pathname starts with the href
              isActive = pathname.startsWith(item.href);
            }
          } else {
            // For non-organization pages, use exact match
            isActive = pathname === item.href;
          }

          // Fallback labels for missing translations
          const fallbackLabels: Record<string, string> = {
            "Nav.dashboard": "Dashboard",
            "Nav.leads": "All Leads",
            "Nav.newLead": "Create Lead",
            "Nav.templates": "Templates",
            "Nav.members": "Members",
            "Nav.home": "Home",
            "Nav.organizations": "Organizations",
            "Nav.settings": "Settings"
          };

          const getDisplayLabel = () => {
            try {
              return t(item.labelKey);
            } catch {
              return fallbackLabels[item.labelKey] || item.labelKey;
            }
          };

          return (
            <Link
              href={item.href}
              key={item.labelKey}
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
              <span>{getDisplayLabel()}</span>
            </Link>
          );
        })}
      </div>

      {/* Settings section at the bottom */}
      <div className="mt-auto space-y-2 sidebar-settings">
        <LanguageSwitcher />
        {!isInOrganization && (
          <Link
            href={`/${locale}/settings`}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer ${
              pathname === `/${locale}/settings`
                ? "bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md hover:text-white"
                : ""
            }`}
          >
            <Settings
              size={20}
              className={pathname === `/${locale}/settings` ? "text-white" : "text-blue-500"}
            />
            <span>{t("Nav.settings")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
