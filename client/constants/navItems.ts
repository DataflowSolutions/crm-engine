import { Home, LayoutDashboard } from "lucide-react";

export const navItems = [
  { icon: Home, labelKey: "Nav.home", href: "/" },
  { icon: LayoutDashboard, labelKey: "Nav.dashboard", href: "/dashboard" },
] as const;
