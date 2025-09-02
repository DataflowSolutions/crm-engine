import { createOrganization } from "../actions";
import { getTranslations } from "next-intl/server";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewOrgPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ error?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations();
  const searchParamsResolved = await searchParams;
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Back Link */}
          <div className="mb-8">
            <Link 
              href="/organizations"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Organizations
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
              <div className="flex items-center">
                <div className="p-3 bg-white/20 rounded-xl mr-4">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {t("Orgs.new.title")}
                  </h1>
                  <p className="text-blue-100 mt-1">
                    {t("Orgs.new.description")}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="px-8 py-8">
              {searchParamsResolved?.error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  {searchParamsResolved.error}
                </div>
              )}

              <form className="space-y-6">
                {/* Hidden field for locale */}
                <input type="hidden" name="locale" value={locale} />
                
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-semibold text-gray-700 mb-3"
                  >
                    {t("Orgs.new.nameLabel")}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder={t("Orgs.new.placeholder")}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 sm:text-sm"
                  />
                </div>

                <button
                  formAction={createOrganization}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/30 cursor-pointer"
                >
                  {t("Orgs.new.create")}
                </button>
              </form>

              {/* Additional Info */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  By creating an organization, you agree to our terms of service and privacy policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
