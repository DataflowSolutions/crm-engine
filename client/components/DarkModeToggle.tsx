"use client";
import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useTranslations } from "next-intl";

export default function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const t = useTranslations();

  return (
    <button
      onClick={toggleDarkMode}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer mt-auto mb-4 ${
        isDarkMode
          ? "bg-gradient-to-r from-purple-500 to-purple-400 text-white shadow-md hover:text-white hover:from-purple-600 hover:to-purple-500"
          : "hover:bg-blue-50"
      }`}
      aria-label={isDarkMode ? t("UI.lightMode") : t("UI.darkMode")}
    >
      {isDarkMode ? (
        <Sun size={20} className="text-yellow-300" />
      ) : (
        <Moon size={20} className="text-blue-500" />
      )}
      <span className="text-sm font-medium">
        {isDarkMode ? t("UI.lightMode") : t("UI.darkMode")}
      </span>
    </button>
  );
}
