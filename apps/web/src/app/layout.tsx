import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PWAInstall } from "@/components/pwa/PWAInstall";
import { OfflineIndicator, OfflineNotification } from "@/components/pwa/OfflineSupport";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voice Organizer",
  description: "AI-powered voice memo organizer with speech recognition and smart organization",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#3b82f6",
  manifest: "/manifest.json",
  keywords: ["voice memo", "speech recognition", "AI organizer", "음성 메모", "음성 인식"],
  authors: [{ name: "Voice Organizer Team" }],
  robots: "index, follow",
  openGraph: {
    title: "Voice Organizer",
    description: "AI-powered voice memo organizer",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Voice Organizer" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PWAInstall>
            <OfflineIndicator />
            <OfflineNotification />
            {children}
          </PWAInstall>
        </AuthProvider>
      </body>
    </html>
  );
}
