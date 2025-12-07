import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#4d9b96", // Teal 계열로 변경
};

export const metadata: Metadata = {
  title: "Voice Organizer",
  description: "AI-powered voice memo organizer with speech recognition and smart organization",
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
        <meta name="theme-color" content="#4d9b96" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
