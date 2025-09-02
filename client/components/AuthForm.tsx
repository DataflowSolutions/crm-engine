"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

interface AuthFormProps {
  login: (formData: FormData) => Promise<void>;
  signup: (formData: FormData) => Promise<void>;
}

export default function AuthForm({ login, signup }: AuthFormProps) {
  const t = useTranslations();
  const [showNameField, setShowNameField] = useState(false);

  const handleSignupClick = () => {
    setShowNameField(true);
  };

  return (
    <div className="space-y-5">
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

      {/* Full Name (only shown for signup) */}
      {showNameField && (
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-gray-700"
          >
            {t("Auth.fullName")}
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:text-sm"
            placeholder="John Doe"
          />
        </div>
      )}

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
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white font-semibold shadow-sm transition hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
        >
          {t("Auth.login.cta")}
        </button>
        <button
          formAction={signup}
          onClick={handleSignupClick}
          className="w-full rounded-md bg-gray-100 px-4 py-2 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:outline-none cursor-pointer"
        >
          {t("Auth.signup.cta")}
        </button>
      </div>
    </div>
  );
}