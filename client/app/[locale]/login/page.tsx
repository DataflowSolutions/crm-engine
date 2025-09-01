// app/[locale]/login/page.tsx  (SERVER-komponent)
import { getTranslations } from "next-intl/server";
import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  // Next ger detta som ett objekt, inte en Promise
  searchParams?: { message?: string };
}) {
  const t = await getTranslations(); // ✅ server-API, funkar i async
  const messageRaw =
    typeof searchParams?.message === "string"
      ? searchParams.message
      : undefined;
  const message = messageRaw ? decodeURIComponent(messageRaw) : undefined;

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
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              {t("Auth.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              {t("Auth.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              formAction={login}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {t("Auth.login.cta")}
            </button>
            <button
              formAction={signup}
              className="w-full rounded-md bg-gray-100 px-4 py-2 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none"
            >
              {t("Auth.signup.cta")}
            </button>
          </div>
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
