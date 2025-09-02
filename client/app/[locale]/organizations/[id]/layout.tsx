// Enhanced Organization Layout that optimizes permissions
import { createClient } from "@/app/utils/supabase/server";
import { getUserPermissions } from "@/utils/permissions";
import { notFound } from "next/navigation";
import ServerSidebar from "@/components/ServerSidebar";
import SidebarHamMenu from "@/components/SidebarHamMenu";

interface OrganizationLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; locale: string }>;
}

export default async function OrganizationLayout({ 
  children, 
  params 
}: OrganizationLayoutProps) {
  const { id: orgId, locale } = await params;
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    notFound();
  }

  // Get organization info and permissions
  let orgName = '';
  let permissions = null;

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

  return (
    <div className="flex min-h-screen">
      {/* Mobile hamburger menu */}
      <div className="md:hidden">
        <SidebarHamMenu />
      </div>
    
      {/* Desktop sidebar - server-rendered with permissions */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-40">
        <ServerSidebar 
          orgId={orgId}
          locale={locale}
          permissions={permissions || undefined}
          orgName={orgName}
        />
      </aside>
    
      {/* Main content with proper margin for sidebar */}
      <div className="flex-1 md:ml-56">
        {children}
      </div>
    </div>
  );
}
