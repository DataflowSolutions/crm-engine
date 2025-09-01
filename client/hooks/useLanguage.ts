"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { getLanguageByCode, languages } from "@/constants/languages";

export function useLanguage() {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const currentLanguage = getLanguageByCode(currentLocale);

  const changeLanguage = (languageCode: string) => {
    // Remove the current locale from the pathname and add the new one
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, "") || "/";
    const newPath = `/${languageCode}${pathWithoutLocale}`;
    // Use replace to maintain current navigation state
    router.replace(newPath);
  };

  const getAvailableLanguages = () => {
    return languages;
  };

  const isCurrentLanguage = (languageCode: string) => {
    return currentLocale === languageCode;
  };

  return {
    currentLocale,
    currentLanguage,
    changeLanguage,
    getAvailableLanguages,
    isCurrentLanguage,
    availableLanguages: languages,
  };
}
