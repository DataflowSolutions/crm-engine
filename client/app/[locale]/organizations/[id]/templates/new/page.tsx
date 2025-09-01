import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TemplateBuilder from "./template-builder";

type PageProps = { params: Promise<{ id: string; locale: string }> };

export default async function NewTemplatePage({ params }: PageProps) {
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

  // Check if this org already has a default template
  const { data: existingTemplate } = await sb
    .from("lead_templates")
    .select("id")
    .eq("organization_id", orgId)
    .eq("is_default", true)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={`/${locale}/organizations/${orgId}/leads/new`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Create Lead
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {existingTemplate ? 'Edit Lead Template' : 'Create Lead Template'}
          </h1>
          <p className="text-gray-600">{org.name}</p>
        </div>

        {/* Template Builder */}
        <TemplateBuilder 
          orgId={orgId} 
          locale={locale} 
          isDefault={!existingTemplate}
        />
      </div>
    </div>
  );
}
