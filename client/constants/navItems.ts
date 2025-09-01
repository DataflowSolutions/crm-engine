import { Home, LayoutDashboard, Settings, Building2 } from "lucide-react";

export const navItems = [
  { icon: Home, labelKey: "Nav.home", href: "/" },
  { icon: Building2, labelKey: "Nav.organizations", href: "/organizations" },
  { icon: LayoutDashboard, labelKey: "Nav.dashboard", href: "/dashboard" },
  { icon: Settings, labelKey: "Nav.settings", href: "/settings" },
] as const;
