"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, Users, FileText, Plus, Settings, Layers, User, Home, LayoutDashboard } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import ProfileModal from "./ProfileModal";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";

interface NavItem {
  iconName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  labelKey: string;
  href: string;
  permissionRequired?: string | null;
}

interface ClientSidebarWrapperProps {
  navItems: NavItem[];
  locale: string;
  orgName?: string;
  user: SupabaseUser | null;
  isInOrganization: boolean;
}

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

export default function ClientSidebarWrapper({
  navItems,
  locale,
  orgName,
  user,
  isInOrganization
}: ClientSidebarWrapperProps) {
  const pathname = usePathname();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const t = useTranslations();

  return (
    <div className="flex flex-col h-full fixed py-6 bg-gradient-to-br from-gray-50 to-gray-100 border-r border-gray-200">
      <div className="flex items-center justify-center h-16 mb-8">
        <Link 
          href={`/${locale}`}
          className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
        >
          CRM Engine
        </Link>
      </div>

      {/* Organization Header */}
      {isInOrganization && orgName && (
        <div className="px-6 mb-6">
          <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {orgName}
              </p>
              <p className="text-xs text-gray-500">Organization</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-6 space-y-2">
        {navItems.map((item, index) => {
          // Get the icon component from iconName or use the passed icon
          const IconComponent = item.iconName ? iconMap[item.iconName] : item.icon;
          const isActive = pathname === item.href;
          
          // Skip item if no icon found
          if (!IconComponent) return null;
          
          return (
            <Link
              key={index}
              href={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                ${isActive 
                  ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm' 
                  : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border hover:border-gray-200'
                }
              `}
            >
              <IconComponent 
                className={`mr-3 h-5 w-5 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                }`} 
              />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 space-y-4">
        <LanguageSwitcher />
        
        {user && (
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-white hover:text-gray-900 hover:shadow-sm hover:border hover:border-gray-200 transition-all duration-200 cursor-pointer"
            >
              <User className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-600" />
              Profile
            </button>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && user && (
        <ProfileModal 
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
        />
      )}
    </div>
  );
}
