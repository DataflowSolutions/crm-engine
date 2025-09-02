// Optimized server-rendered sidebar that replaces the client component
import { createClient } from "@/app/utils/supabase/server";
import { getUserPermissions } from "@/utils/permissions";
import { headers } from "next/headers";
import ClientSidebarWrapper from "./ClientSidebarWrapper";

export default async function OptimizedSidebar() {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("referer") || "";
  
  // Extract organization ID from pathname if we're in an organization
  const orgMatch = pathname.match(/\/organizations\/([^\/]+)/);
  const orgId = orgMatch?.[1];
  const localeMatch = pathname.match(/^\/([^\/]+)/);
  const locale = localeMatch?.[1] || "en";
  
  const isInOrganization = orgId && orgId !== 'new';
  
  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  
  let permissions = null;
  let orgName = '';

  // If we're in an organization, get permissions server-side
  if (isInOrganization && auth?.user) {
    try {
      const { data: orgInfo } = await sb
        .rpc('get_user_permissions_fast', {
          p_user_id: auth.user.id,
          p_org_id: orgId
        })
        .single() as { data: { org_name: string; role: string; is_org_creator: boolean } | null };

      if (orgInfo) {
        orgName = orgInfo.org_name;
        permissions = await getUserPermissions(orgId, auth.user.id);
      }
    } catch (error) {
      console.error('Error fetching organization permissions:', error);
    }
  }

  // Organization-specific navigation items (filtered by permissions)
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
      orgName={isInOrganization ? orgName : undefined}
      user={auth?.user || null}
      isInOrganization={!!isInOrganization}
    />
  );
}
