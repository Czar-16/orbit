import type { Metadata } from "next";
import { databaseStatus } from "@/lib/db";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { themeBootstrapScript } from "@/lib/theme";
import { ThemeController } from "@/components/theme-controller";
import "./globals.css";
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
export const metadata: Metadata = {
  title: {
    default: "Orbit · Local application workspace",
    template: "%s · Orbit",
  },
  description: "A local workspace for preparing and tracking job applications.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await databaseStatus();
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head>
      <body className={`${sans.variable} ${mono.variable}`}>
        <ThemeController />
        <AppShell importAvailable={status.state === "ready"}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
