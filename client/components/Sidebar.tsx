"use client";
import Link from "next/link";
import { navItems } from "../constants/navItems";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./LanguageSwitcher";
import { Building2, Users, FileText, Plus, Settings, Home, Layers, User } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useState } from "react";
import ProfileModal from "./ProfileModal";
import { useUser } from "@/contexts/UserContext";

export default function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams();
  
  // Check if we're inside an organization
  const orgId = params?.id as string;
  const locale = params?.locale as string;
  const isInOrganization = pathname.includes('/organizations/') && orgId && orgId !== 'new';
  const permissions = usePermissions();

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user } = useUser();

  // Organization-specific navigation items (filtered by permissions)
  const allOrgNavItems = [
    { 
      icon: Building2, 
      labelKey: "Nav.dashboard", 
      href: `/${locale}/organizations/${orgId}`,
      permissionRequired: null, // Always visible
    },
    { 
      icon: FileText, 
      labelKey: "Nav.leads", 
      href: `/${locale}/organizations/${orgId}/leads`,
      permissionRequired: null, // Always visible
    },
    { 
      icon: Plus, 
      labelKey: "Nav.newLead", 
      href: `/${locale}/organizations/${orgId}/leads/new`,
      permissionRequired: 'canCreateLeads',
    },
    { 
      icon: Layers, 
      labelKey: "Nav.templates", 
      href: `/${locale}/organizations/${orgId}/templates`,
      permissionRequired: 'canManageTemplates',
    },
    { 
      icon: Users, 
      labelKey: "Nav.members", 
      href: `/${locale}/organizations/${orgId}/members`,
      permissionRequired: 'canManageMembers',
    },
    { 
      icon: Settings, 
      labelKey: "Nav.settings", 
      href: `/${locale}/organizations/${orgId}/settings`,
      permissionRequired: 'canManageOrganization',
    },
  ];

  // Filter navigation items based on permissions (show loading state items if permissions are loading)
  const orgNavItems = allOrgNavItems.filter(item => {
    if (!item.permissionRequired) return true; // Always show items with no permission requirement
    if (!permissions) return false; // Hide permission-gated items while loading
    return permissions[item.permissionRequired as keyof typeof permissions] === true;
  });

  const currentNavItems = isInOrganization ? orgNavItems : navItems.filter(item => item.href !== '/dashboard');

  return (
    <div className="flex flex-col h-full fixed py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-r border-gray-200">
      {/* Back to Organizations link when in organization */}
      {isInOrganization && (
        <div className="px-6 pb-6 border-b border-gray-200 mb-6">
          <Link
            href={`/${locale}/organizations`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-all duration-200 hover:translate-x-1"
          >
            <Home size={16} />
            ← {t("Nav.backToOrganizations")}
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-1 px-3">
        {currentNavItems.map((item, index) => {
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
            "Nav.settings": "Settings",
            "Nav.backToOrganizations": "Back to Organizations"
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
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out cursor-pointer transform hover:scale-105 ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
                  : "text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md"
              }`}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animation: 'slideInLeft 0.4s ease-out forwards'
              }}
            >
              <item.icon
                size={20}
                className={`transition-all duration-200 ${
                  isActive 
                    ? "text-white" 
                    : "text-gray-500 group-hover:text-blue-600 group-hover:scale-110"
                }`}
              />
              <span className="font-medium">{getDisplayLabel()}</span>
            </Link>
          );
        })}
      </div>

      {/* Settings section at the bottom */}
      <div className="mt-auto space-y-3 px-3 pb-2">
        <div className="border-t border-gray-200 pt-4 space-y-3">
          {/* Profile Button */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out cursor-pointer transform hover:scale-105 w-full text-left text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md"
          >
            <User
              size={20}
              className="text-gray-500 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-200"
            />
            <div className="flex-1">
              <span className="font-medium">{t("Nav.profile")}</span>
              {user?.user_metadata?.display_name && (
                <div className="text-xs text-gray-500 group-hover:text-blue-500">
                  {user.user_metadata.display_name}
                </div>
              )}
            </div>
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
        
        {!isInOrganization && (
          <Link
            href={`/${locale}/settings`}
            className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ease-out cursor-pointer transform hover:scale-105 ${
              pathname === `/${locale}/settings`
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
                : "text-gray-700 hover:bg-white hover:text-blue-600 hover:shadow-md"
            }`}
          >
            <Settings
              size={20}
              className={`transition-all duration-200 ${
                pathname === `/${locale}/settings` 
                  ? "text-white" 
                  : "text-gray-500 group-hover:text-blue-600 group-hover:scale-110"
              }`}
            />
            <span className="font-medium">{t("Nav.settings")}</span>
          </Link>
        )}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user || {}}
      />
    </div>
  );
}
