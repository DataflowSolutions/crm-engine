"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { languages, getLanguageByCode } from "@/constants/languages";

export default function LanguageSwitcherCompact() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<
    "up" | "down" | "right"
  >("down");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();

  const currentLanguage = getLanguageByCode(currentLocale);

  // Calculate optimal dropdown position
  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return "down";

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = languages.length * 44; // Approximate height per item
    const viewportWidth = window.innerWidth;

    const spaceAbove = buttonRect.top;
    const spaceRight = viewportWidth - buttonRect.right;

    // Prefer upward if there's enough space (at least 20px margin)
    if (spaceAbove >= dropdownHeight + 20) {
      return "up";
    }

    // If not enough space above but enough space to the right, go right
    if (spaceRight >= 140 + 20) {
      // dropdown width + margin
      return "right";
    }

    // Default to down
    return "down";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      // Calculate position before opening
      const position = calculateDropdownPosition();
      setDropdownPosition(position);
    }
    setIsOpen(!isOpen);
  };

  const handleLanguageChange = (languageCode: string) => {
    // Remove the current locale from the pathname and add the new one
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, "") || "/";
    const newPath = `/${languageCode}${pathWithoutLocale}`;

    setIsOpen(false);
    // Use replace instead of push to avoid adding to browser history
    // This also helps with maintaining state like dark mode
    router.replace(newPath);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
        aria-label={t("UI.changeLanguage")}
      >
        <span className="text-lg">{currentLanguage?.flag}</span>
        <span className="text-sm font-medium">
          {currentLanguage?.code.toUpperCase()}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute min-w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden ${
            dropdownPosition === "up"
              ? "bottom-full left-0 mb-1"
              : dropdownPosition === "right"
              ? "top-0 left-full ml-1"
              : "top-full left-0 mt-1"
          }`}
        >
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors duration-150 ${
                language.code === currentLocale
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700"
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span className="text-sm font-medium">{language.nativeName}</span>
              {language.code === currentLocale && (
                <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
