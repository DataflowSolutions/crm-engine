"use client";
import Link from "next/link";
import { navItems } from "../constants/navItems";
import { Fragment, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SidebarHamMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <Fragment>
      {/* Hamburger button - visible only on mobile */}
      {!open && (
        <button
          className="md:hidden fixed top-4 right-4 z-50 p-2 rounded-full bg-blue-500 shadow-md"
          aria-label={t("UI.openMenu")}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Menu size={28} color="white" />
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 bg-opacity-40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar menu - mobile only */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 md:hidden px-2 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <span className="font-bold text-lg text-black">{t("UI.menu")}</span>
          <button
            aria-label={t("UI.closeMenu")}
            onClick={() => setOpen(false)}
            className="p-2 rounded hover:bg-gray-100"
          >
            <X size={20} className="text-gray-700" />
          </button>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                href={item.href}
                key={t(item.labelKey)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md hover:text-white"
                    : ""
                }`}
                onClick={() => setOpen(false)}
              >
                <item.icon
                  size={20}
                  className={isActive ? "text-white" : "text-blue-500"}
                />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </aside>
    </Fragment>
  );
}
