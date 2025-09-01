import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import ImportWizard from "./ImportWizard";

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function ImportPage({ params }: PageProps) {
  const { id: orgId, locale } = await params;
  const sb = await createClient();

  // Check auth and access
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect(`/${locale}/login`);
  }

  // Get organization
  const { data: org } = await sb
    .from("organizations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  if (!org) {
    redirect(`/${locale}/organizations`);
  }

  // Check if user has access to this organization
  const { data: membership } = await sb
    .from("memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", auth.user.id)
    .single();

  if (!membership) {
    redirect(`/${locale}/organizations`);
  }

  return (
    <ImportWizard
      orgId={orgId}
      locale={locale}
      orgName={org.name}
      userId={auth.user.id}
    />
  );
}
