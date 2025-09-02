import type { Metadata } from "next";
import "../globals.css";
import Sidebar from "@/components/Sidebar";
import SidebarHamMenu from "@/components/SidebarHamMenu";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { UserProvider } from "@/contexts/UserContext";

export const metadata: Metadata = {
  title: "CRM - Customer Relationship Management",
  description: "Manage your leads, organizations, and customer relationships",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <UserProvider>
            <div className="flex min-h-screen">
              {/* Mobile hamburger menu */}
              <div className="md:hidden">
                <SidebarHamMenu />
              </div>
            
            {/* Desktop sidebar */}
            <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-40">
              <Sidebar />
            </aside>
            
            {/* Main content with proper margin for sidebar */}
            <div className="flex-1 md:ml-56">
              {children}
            </div>
          </div>
          </UserProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
