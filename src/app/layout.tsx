import type { Metadata } from "next";
import { databaseStatus } from "@/lib/db";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
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
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${mono.variable}`}>
        <AppShell importAvailable={status.state === "ready"}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
