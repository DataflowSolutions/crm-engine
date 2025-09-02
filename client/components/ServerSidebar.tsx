// Server-side rendered Sidebar component
import { UserPermissions } from "@/utils/permissions";
import { createClient } from "@/app/utils/supabase/server";
import ClientSidebarWrapper from "./ClientSidebarWrapper";

interface ServerSidebarProps {
  orgId?: string;
  locale: string;
  permissions?: UserPermissions;
  orgName?: string;
}

export default async function ServerSidebar({ 
  orgId, 
  locale, 
  permissions,
  orgName 
}: ServerSidebarProps) {
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  
  const isInOrganization = orgId && orgId !== 'new';

  // Organization-specific navigation items (using string-based icons for serialization)
  const allOrgNavItems = [
    { 
      iconName: "Building2", 
      labelKey: "Nav.dashboard", 
      href: `/${locale}/organizations/${orgId}`,
      permissionRequired: null, // Always visible
    },
    { 
      iconName: "FileText", 
      labelKey: "Nav.leads", 
      href: `/${locale}/organizations/${orgId}/leads`,
      permissionRequired: null, // Always visible
    },
    { 
      iconName: "Plus", 
      labelKey: "Nav.newLead", 
      href: `/${locale}/organizations/${orgId}/leads/new`,
      permissionRequired: 'canCreateLeads',
    },
    { 
      iconName: "Layers", 
      labelKey: "Nav.templates", 
      href: `/${locale}/organizations/${orgId}/templates`,
      permissionRequired: 'canViewTemplates',
    },
    { 
      iconName: "Users", 
      labelKey: "Nav.members", 
      href: `/${locale}/organizations/${orgId}/members`,
      permissionRequired: 'canViewMembers',
    },
    { 
      iconName: "Settings", 
      labelKey: "Nav.settings", 
      href: `/${locale}/organizations/${orgId}/settings`,
      permissionRequired: 'canManageOrganization',
    },
  ];

  // Filter navigation items based on permissions
  const orgNavItems = allOrgNavItems.filter(item => {
    if (!item.permissionRequired) return true; // Always show items with no permission requirement
    if (!permissions) return false; // Hide permission-gated items if no permissions
    return permissions[item.permissionRequired as keyof typeof permissions] === true;
  });

  // General navigation items (server-compatible)
  const generalNavItems = [
    { iconName: "Home", labelKey: "Nav.home", href: "/" },
    { iconName: "Building2", labelKey: "Nav.organizations", href: "/organizations" },
    { iconName: "Settings", labelKey: "Nav.settings", href: "/settings" },
  ];

  const currentNavItems = isInOrganization ? orgNavItems : generalNavItems;

  return (
    <ClientSidebarWrapper
      navItems={currentNavItems}
      locale={locale}
      orgName={orgName}
      user={auth?.user || null}
      isInOrganization={!!isInOrganization}
    />
  );
}
