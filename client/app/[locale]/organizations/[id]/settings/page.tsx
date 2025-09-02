import { notFound } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import { getTranslations } from "next-intl/server";
import { getUserPermissions } from "@/utils/permissions";
import { Shield } from "lucide-react";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const params = await props.params;
  const { id } = params;
  const t = await getTranslations();
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return notFound();
  }

  // Check permissions
  const permissions = await getUserPermissions(id, user.id);
  if (!permissions.canManageOrganization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <Shield className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t("errors.accessDenied")}
          </h1>
          <p className="text-gray-600">
            {t("errors.insufficientPermissions")}
          </p>
        </div>
      </div>
    );
  }

  // Get organization details
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (orgError || !organization) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 overflow-hidden">
        {/* Header */}
        <div className="mb-8 animate-in slide-in-from-top duration-500">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                {t("settings.title")}
              </h1>
              <p className="text-gray-600 font-medium">
                {t("settings.subtitle", { orgName: organization.name })}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <SettingsClient organization={organization} />
      </main>
    </div>
  );
}
