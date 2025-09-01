import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import LeadsClient from './LeadsClient';

type PageProps = { params: Promise<{ id: string; locale: string }> };

// Type for raw Supabase query result
type RawLeadFieldValue = {
  value: string;
  lead_fields: {
    label: string;
    field_type: string;
  }[] | null;
};

type RawLead = {
  id: string;
  template_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
  lead_field_values: RawLeadFieldValue[];
};

export default async function LeadsPage({ params }: PageProps) {
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

  // Get leads with field values using the same query structure as dashboard
  const { data: leads } = await sb
    .from("leads")
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
    .order("created_at", { ascending: false });

  return (
    <LeadsClient 
      leads={(leads || []) as RawLead[]} 
      orgId={orgId} 
      orgName={org.name} 
      locale={locale} 
    />
  );
}
