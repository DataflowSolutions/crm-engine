"use client";
import Link from "next/link";
import { navItems } from "../constants/navItems";
import { Fragment } from "react";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  return (
    <Fragment>
      {(() => {
        // Import usePathname at the top: import { usePathname } from "next/navigation";
        // Use the hook inside the component
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const pathname = usePathname();

        return navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              href={item.href}
              key={item.label}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-blue-400 text-white shadow-md hover:text-white"
                  : ""
              }`}
            >
              <item.icon
                size={20}
                className={isActive ? "text-white" : "text-blue-500"}
              />
              <span>{item.label}</span>
            </Link>
          );
        });
      })()}
    </Fragment>
  );
}
