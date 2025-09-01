// app/organizations/[id]/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import OrgDashboardClient from "./client";
import AccessDeniedPage from "./access-denied";

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function Page({ params }: PageProps) {
  const { id: orgId, locale } = await params;
  const sb = await createClient();

  // 1) Require auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    const target = `/${locale}/login?redirect=${encodeURIComponent(`/${locale}/organizations/${orgId}`)}`;
    redirect(target);
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
    return <AccessDeniedPage locale={locale} orgId={orgId} orgExists={isValidUUID} userEmail={auth.user.email} />;
  }
  
  if (orgErr) {
    // Unexpected error -> show access denied (don't leak technical details)
    console.error("Organization query error:", orgErr);
    return <AccessDeniedPage locale={locale} orgId={orgId} orgExists={true} userEmail={auth.user.email} />;
  }

  // 3) (Optional) Example of server-side counts you can wire later.
  //    These use RLS too, so they’re already scoped to org members.
  //    If you don’t have statuses yet, skip this block.
  const [{ count: totalLeads }, { count: approved }, { count: scheduled }, { count: closed }] =
    await Promise.all([
      sb.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      sb.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "approved"),
      sb.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "scheduled"),
      sb.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "closed"),
    ]);

  const summary = {
    totalLeads: totalLeads ?? 0,
    approved: approved ?? 0,
    scheduled: scheduled ?? 0,
    closed: closed ?? 0,
  };

  // 4) Render your client UI (can keep useTranslations there)
  return <OrgDashboardClient org={org} summary={summary} />;
}
