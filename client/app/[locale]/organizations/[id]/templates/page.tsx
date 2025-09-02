import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import TemplatesList from "./TemplatesList";
import { getUserPermissions } from "@/utils/permissions";

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function TemplatesPage({ params }: PageProps) {
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

  // Get all available templates (organization-specific + universal)
  const { data: templates } = await sb
    .from("lead_templates")
    .select(`
      id,
      name,
      description,
      is_default,
      created_at,
      organization_id,
      lead_fields!fld_tpl_fk (id)
    `)
    .or(`organization_id.eq.${orgId},organization_id.eq.00000000-0000-0000-0000-000000000000`)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  // Separate universal and organization templates
  const universalTemplates = templates?.filter(t => t.organization_id === '00000000-0000-0000-0000-000000000000') || [];
  const orgTemplates = templates?.filter(t => t.organization_id === orgId) || [];

  // Get user permissions
  const permissions = await getUserPermissions(orgId, auth.user.id);

  return (
    <TemplatesList
      orgTemplates={orgTemplates}
      universalTemplates={universalTemplates}
      orgId={orgId}
      locale={locale}
      orgName={org.name}
      permissions={permissions}
    />
  );
}
