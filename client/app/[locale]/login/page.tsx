// app/[locale]/login/page.tsx  (SERVER-komponent)
import { getTranslations } from "next-intl/server";
import { login, signup } from "./actions";
import AuthForm from "@/components/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  // Next ger detta som ett objekt, inte en Promise
  searchParams?: Promise<{ message?: string; redirect?: string }>;
}) {
  const t = await getTranslations(); // ✅ server-API, funkar i async
  const resolvedSearchParams = await searchParams;
  const messageRaw =
    typeof resolvedSearchParams?.message === "string"
      ? resolvedSearchParams.message
      : undefined;
  const message = messageRaw ? decodeURIComponent(messageRaw) : undefined;
  const redirectTo = resolvedSearchParams?.redirect;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
          {t("Auth.welcome") /* ex. nyckel i dina messages */}
        </h1>

        {message && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {message}
          </div>
        )}

        <form className="space-y-6">
          {/* Hidden field for redirect */}
          {redirectTo && (
            <input type="hidden" name="redirect" value={redirectTo} />
          )}
          
          <AuthForm login={login} signup={signup} />
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {t("Auth.footer")}{" "}
          <a
            href="#"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {t("Auth.terms")}
          </a>{" "}
          {t("Auth.and")}{" "}
          <a
            href="#"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {t("Auth.privacy")}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
