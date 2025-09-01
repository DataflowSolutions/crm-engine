import { createOrganization } from "../actions";
import { getTranslations } from "next-intl/server";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">
          {t("Orgs.new.title")}
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          {t("Orgs.new.description")}
        </p>

        {searchParamsResolved?.error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {searchParamsResolved.error}
          </div>
        )}

        <form className="space-y-4">
          {/* Hidden field for locale */}
          <input type="hidden" name="locale" value={locale} />
          
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              {t("Orgs.new.nameLabel")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder={t("Orgs.new.placeholder")}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
            />
          </div>

          <button
            formAction={createOrganization}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {t("Orgs.new.create")}
          </button>
        </form>
      </div>
    </div>
  );
}
