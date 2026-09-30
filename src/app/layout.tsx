import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/styles/fonts";
import { siteMeta } from "@/config/site.config";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteMeta.url),
  title: siteMeta.title,
  description: siteMeta.description,
  openGraph: { title: siteMeta.title, description: siteMeta.description, type: "website" },
  icons: { icon: "/brand/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070504",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} data-tone="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
