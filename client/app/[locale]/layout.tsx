import type { Metadata } from "next";
import "../globals.css";
import Sidebar from "@/components/Sidebar";
import SidebarHamMenu from "@/components/SidebarHamMenu";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";

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
      <body className="flex flex-col min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <div className="flex">
            <div>
              <SidebarHamMenu />
            </div>
            <aside className="hidden md:flex flex-col gap-2 w-56 bg-white border-r border-black/10 px-4 min-h-screen">
              <Sidebar />
            </aside>
            <div className="flex-1">{children}</div>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
