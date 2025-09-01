// app/organizations/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import OrgDashboardClient from "./client";

type PageProps = { params: { id: string; locale: string } };

export default async function Page({ params }: PageProps) {
  const orgId = params.id;
  const locale = params.locale;
  const sb = await createClient();

  // 1) Require auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    const target = `/${locale}/login?redirect=${encodeURIComponent(`/${locale}/organizations/${orgId}`)}`;
    redirect(target);
  }

  // 2) Check access by SELECTing the org.
  //    Thanks to RLS, this only returns a row for owners/admins/accepted members.
  const { data: org, error: orgErr } = await sb
    .from("organizations")
    .select("id,name,slug,owner_id,created_at")
    .eq("id", orgId)
    .single();

  // If RLS blocks or row doesn't exist, org is null (or single() throws 406).
  if (orgErr?.code === "PGRST116" /* No rows */ || !org) {
    // Up to you: 404 feels fine (don't leak org IDs)
    notFound();
  }
  if (orgErr) {
    // Unexpected error -> also 404 (or render an error boundary)
    console.error("Organization query error:", orgErr);
    notFound();
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
