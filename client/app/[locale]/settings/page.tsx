import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import { updateProfile } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const message = params?.message;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t("Settings.title")}
        </h1>

        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <form className="space-y-6">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("Auth.email")}
            </label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t("Settings.emailReadOnly")}
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("Auth.fullName")}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={user.user_metadata?.full_name || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              formAction={updateProfile}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t("Settings.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
