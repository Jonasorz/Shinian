import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MobileNavigation } from "@/components/MobileNavigation";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Shinian",
    template: "%s · Shinian",
  },
  description: "基于 Vercel 与 Neon 的个人卡片笔记与轻量任务系统",
  applicationName: "Shinian",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Shinian",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f0e7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" style={{ backgroundColor: "#f4f0e7" }}>
      <body style={{ backgroundColor: "#f4f0e7" }}>
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        {children}
        <MobileNavigation />
        <PwaRegister />
      </body>
    </html>
  );
}
