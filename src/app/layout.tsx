import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { Providers } from "@/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baby Tracker | 宝宝成长记录",
  description: "Track your baby's daily life | 记录宝宝的日常生活",
  icons: {
    icon: [{ url: "/favicon.ico?v=20260518e", type: "image/x-icon" }],
    shortcut: "/favicon.ico?v=20260518e",
    apple: "/favicon.ico?v=20260518e",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased pt-safe-top">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}

