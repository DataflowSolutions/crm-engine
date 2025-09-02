import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { createLead } from "./actions";

type PageProps = { 
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ template?: string }>;
};

type LeadField = {
  id: string;
  label: string;
  field_key: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
};

type Template = {
  id: string;
  name: string;
  organization_id: string;
  is_default: boolean;
  is_universal?: boolean;
  fields: LeadField[];
};

type NewLeadPageData = {
  org_id: string;
  org_name: string;
  user_permissions: {
    role: string;
    is_org_creator: boolean;
    can_create_leads: boolean;
  };
  available_templates: Template[];
  selected_template: Template;
  has_access: boolean;
};

export default async function NewLeadPage({ params, searchParams }: PageProps) {
  const { id: orgId, locale } = await params;
  const urlParams = await searchParams;
  const selectedTemplateId = urlParams?.template;
  
  const sb = await createClient();

  // Check auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    redirect(`/${locale}/login`);
  }

  try {
    // Use optimized database function to get all data in one query
    const { data: pageData, error } = await sb
      .rpc('get_new_lead_page_data', {
        p_org_id: orgId,
        p_user_id: auth.user.id,
        p_selected_template_id: selectedTemplateId || null
      })
      .single() as { data: NewLeadPageData | null; error: unknown };

    if (error) {
      console.error('Error fetching new lead page data:', error);
      redirect(`/${locale}/organizations`);
    }

    if (!pageData || !pageData.has_access) {
      redirect(`/${locale}/organizations/${orgId}/access-denied`);
    }

    if (!pageData.user_permissions.can_create_leads) {
      redirect(`/${locale}/organizations/${orgId}/access-denied`);
    }

    if (!pageData.selected_template || !pageData.selected_template.id) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md text-center bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              No Lead Template Found
            </h2>
            <p className="text-gray-600 mb-6">
              You need to create a lead template first. This defines what information you want to collect for each lead.
            </p>
            <Link
              href={`/${locale}/organizations/${orgId}/templates/new`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Lead Template
            </Link>
          </div>
        </div>
      );
    }

    const template = pageData.selected_template;
    const sortedFields = template.fields.sort((a: LeadField, b: LeadField) => a.sort_order - b.sort_order);
    
    // Prepare templates for selection UI
    const templatesForSelection = pageData.available_templates.map(t => ({
      ...t,
      isUniversal: t.is_universal || t.organization_id === '00000000-0000-0000-0000-000000000000',
      isSelected: t.id === template.id
    }));

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href={`/${locale}/organizations/${orgId}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Lead</h1>
                <p className="text-gray-600">{pageData.org_name}</p>
              </div>
              <Link
                href={`/${locale}/organizations/${orgId}/templates`}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Manage Templates
              </Link>
            </div>
          </div>

          {/* Template Selection */}
          {templatesForSelection.length > 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Template</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {templatesForSelection.map((t) => (
                  <Link
                    key={t.id}
                    href={`/${locale}/organizations/${orgId}/leads/new?template=${t.id}`}
                    className={`p-4 border rounded-lg transition-all hover:shadow-md ${
                      t.isSelected 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-20' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{t.name}</h3>
                      <div className="flex space-x-1">
                        {t.is_default && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Default</span>
                        )}
                        {t.isUniversal && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Universal</span>
                        )}
                      </div>
                    </div>
                    {t.isSelected && (
                      <p className="text-sm text-blue-600 font-medium">✓ Currently selected</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Lead Creation Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Lead Information</h2>
              <span className="text-sm text-gray-500">Using: {template.name}</span>
            </div>
            <form action={createLead} className="space-y-6">
              <input type="hidden" name="organizationId" value={orgId} />
              <input type="hidden" name="templateId" value={template.id} />
              <input type="hidden" name="locale" value={locale} />

              <div className="space-y-6">
                {sortedFields.map((field: LeadField) => (
                  <div key={field.id}>
                    <label 
                      htmlFor={field.field_key}
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {field.label}
                      {field.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.field_type === 'textarea' ? (
                      <textarea
                        id={field.field_key}
                        name={field.field_key}
                        required={field.is_required}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type={field.field_type === 'text' ? 'text' : field.field_type}
                        id={field.field_key}
                        name={field.field_key}
                        required={field.is_required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}

                <div>
                  <label 
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue="draft"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="should_call">Should Call</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Create Lead
                </button>
                <Link
                  href={`/${locale}/organizations/${orgId}/leads`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in new lead page:', error);
    redirect(`/${locale}/organizations/${orgId}/leads`);
  }
}