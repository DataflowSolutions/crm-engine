export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const languages: Language[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
  },
  {
    code: "sv",
    name: "Swedish",
    nativeName: "Svenska",
    flag: "🇸🇪",
  },
  // Easy to add more languages in the future:
  // {
  //   code: 'es',
  //   name: 'Spanish',
  //   nativeName: 'Español',
  //   flag: '🇪🇸'
  // },
  // {
  //   code: 'fr',
  //   name: 'French',
  //   nativeName: 'Français',
  //   flag: '🇫🇷'
  // },
  // {
  //   code: 'de',
  //   name: 'German',
  //   nativeName: 'Deutsch',
  //   flag: '🇩🇪'
  // }
];

export const getLanguageByCode = (code: string): Language | undefined => {
  return languages.find((lang) => lang.code === code);
};

export const getLanguageName = (code: string): string => {
  const language = getLanguageByCode(code);
  return language?.nativeName || code;
};

export const getLanguageFlag = (code: string): string => {
  const language = getLanguageByCode(code);
  return language?.flag || "🌐";
};
