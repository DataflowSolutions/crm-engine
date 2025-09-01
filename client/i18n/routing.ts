import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["sv", "en"],
  defaultLocale: "sv",
  // valfritt: domain-based, localePrefix osv i senare steg
});
