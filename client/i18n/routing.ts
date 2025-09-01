import { defineRouting } from "next-intl/routing";

// Supported locales - easy to extend for future languages
export const supportedLocales = ["sv", "en"] as const;

export const routing = defineRouting({
  locales: supportedLocales,
  defaultLocale: "sv",
  // Optional: domain-based, localePrefix etc for future use
  localePrefix: "always", // Always show locale in URL for clarity
});

export type Locale = (typeof supportedLocales)[number];
