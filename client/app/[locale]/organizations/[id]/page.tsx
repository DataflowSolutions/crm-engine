// app/organizations/[id]/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import OrgDashboardClient from "./client";
import AccessDeniedPage from "./access-denied";
import { getUserPermissions } from "@/utils/permissions";

type PageProps = { params: Promise<{ id: string; locale: string }> };

type DatabaseLead = {
  id: string;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  lead_field_values: {
    value: string;
    lead_fields: {
      label: string;
      field_type: string;
    } | null;
  }[];
};

export default async function Page({ params }: PageProps) {
  const { id: orgId, locale } = await params;
  const sb = await createClient();

  // 1) Require auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    const target = `/${locale}/login?redirect=${encodeURIComponent(`/${locale}/organizations/${orgId}`)}`;
    redirect(target);
  }

  // Get user profile information from the users table
  let userName = "";
  try {
    const { data: userProfile } = await sb
      .from("users")
      .select("full_name")
      .eq("id", auth.user.id)
      .single();
    
    userName = userProfile?.full_name || "";
  } catch {
    // If users table doesn't exist or other error, try profiles table as fallback
    try {
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name")
        .eq("id", auth.user.id)
        .single();
      
      userName = profile?.full_name || "";
    } catch (profileError) {
      console.log("Could not fetch user profile from either table:", profileError);
    }
  }

  // 2) Check if user has access via RLS
  const { data: org, error: orgErr } = await sb
    .from("organizations")
    .select("id,name,slug,owner_id,created_at")
    .eq("id", orgId)
    .single();

  // If RLS blocks access, show appropriate message
  if (orgErr?.code === "PGRST116" || !org) {
    // For now, assume org exists if it's a valid UUID and show access denied
    // In a real implementation, you might want to check with service role
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orgId);
    return <AccessDeniedPage locale={locale} orgId={orgId} orgExists={isValidUUID} userEmail={auth.user?.email || ''} />;
  }
  
  if (orgErr) {
    // Unexpected error -> show access denied (don't leak technical details)
    console.error("Organization query error:", orgErr);
    return <AccessDeniedPage locale={locale} orgId={orgId} orgExists={true} userEmail={auth.user?.email || ''} />;
  }

  // 3) Check if organization has templates available (org-specific OR universal)
  const { data: availableTemplates } = await sb
    .from("lead_templates")
    .select("id, name, organization_id, is_default")
    .or(`organization_id.eq.${orgId},organization_id.eq.00000000-0000-0000-0000-000000000000`);

  // Check if there's any usable template (org-specific default, universal default, or any template)
  const hasTemplate = availableTemplates && availableTemplates.length > 0;

  console.log("🔍 [Org Dashboard] Template check:");
  console.log("- Available templates:", availableTemplates?.map(t => ({
    id: t.id,
    name: t.name,
    org_id: t.organization_id,
    is_default: t.is_default,
    is_universal: t.organization_id === '00000000-0000-0000-0000-000000000000'
  })));
  console.log("- Has usable template:", hasTemplate);

  // Get user permissions for this organization
  const permissions = await getUserPermissions(orgId, auth.user.id);

  // 4) Fetch leads summary and recent leads for this organization
  const [
    { count: totalLeads }, 
    { count: approved }, 
    { count: scheduled }, 
    { count: closed },
    recentLeadsResult
  ] = await Promise.all([
    sb.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    sb.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "approved"),
    sb.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "scheduled"),
    sb.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "closed"),
    sb.from("leads")
      .select(`
        id, 
        template_id, 
        created_by, 
        created_at, 
        updated_at, 
        status,
        lead_field_values!lead_field_values_lead_id_fkey (
          value,
          lead_fields!lead_field_values_field_id_fkey (
            label,
            field_type
          )
        )
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  // Extract the data and handle potential errors
  const recentLeads = recentLeadsResult.data;

  const summary = {
    totalLeads: totalLeads ?? 0,
    approved: approved ?? 0,
    scheduled: scheduled ?? 0,
    closed: closed ?? 0,
  };

  // Debug info to check what's happening with leads
  console.log("🔍 [Leads Debug - With Field Values]:");
  console.log("- Total leads:", totalLeads);
  console.log("- Recent leads result:", recentLeadsResult);
  console.log("- Recent leads data:", recentLeads);
  console.log("- Recent leads length:", recentLeads?.length);
  console.log("- Recent leads error:", recentLeadsResult.error);
  if (recentLeads && recentLeads.length > 0) {
    console.log("- First lead field values:", recentLeads[0]?.lead_field_values);
  }

  // 5) Render your client UI
  return (
    <OrgDashboardClient 
      org={org} 
      summary={summary} 
      leads={(recentLeads as unknown as DatabaseLead[]) || []}
      hasTemplate={!!hasTemplate}
      locale={locale}
      userName={userName}
      permissions={permissions}
    />
  );
}