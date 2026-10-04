import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";
import { Open_Sans, Be_Vietnam_Pro } from "next/font/google";
import { PwaManager } from "@/components/pwa/PwaManager";
import { WebPushPrompt } from "@/components/pwa/WebPushPrompt";

const openSans = Open_Sans({
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-open-sans",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#003B3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: {
    default: "SSM - Sky-Line",
    template: "%s | SSM Sky-Line",
  },
  description: "Hệ thống Quản lý và Điều hành Công việc Giáo dục Sky-Line (SSM)",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SSM",
  },
  icons: {
    icon: [
      { url: "/icons/ssm-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/ssm-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${openSans.variable} ${beVietnamPro.variable}`} suppressHydrationWarning>
      <body className={`${openSans.className} font-sans antialiased`} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
          <PwaManager />
          <WebPushPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
