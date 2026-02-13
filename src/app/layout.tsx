import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ApolloWrapper } from "@/lib/apollo/provider";
import { PWARegister } from "@/components/pwa-register";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0078D4",
};

export const metadata: Metadata = {
  title: "MoneyBro - Personal Finance Manager",
  description: "Manage your expenses, installments, and debts with ease",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MoneyBro",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ApolloWrapper>
          {children}
          <Toaster position="top-right" richColors />
          <PWARegister />
          <Analytics />
          <SpeedInsights />
        </ApolloWrapper>
      </body>
    </html>
  );
}
