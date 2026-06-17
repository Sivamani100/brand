import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import ClientShell from "@/components/shared/ClientShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Brand — Where Brands Meet Creators",
    template: "%s | Brand",
  },
  description:
    "The simplest B2B2C collaboration marketplace. Brands post campaigns, creators apply in 2 steps, and accepted deals open instant realtime chat.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Brand — Where Brands Meet Creators",
    description:
      "Post a collaboration. Get matched. Chat. Ship.",
    type: "website",
    siteName: "Brand",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brand — Where Brands Meet Creators",
    description: "Post a collaboration. Get matched. Chat. Ship.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Brand",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    shortcut: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-full flex flex-col bg-black text-[#fbfbef]">
        <ClientShell>
          {children}
        </ClientShell>
        {process.env.NODE_ENV === "development" && (
          <Script
            id="dev-sw-cleanup"
            strategy="afterInteractive"
          >{`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                  registration.unregister().then(() => {
                    console.log('SW unregistered in dev mode');
                  });
                }
              });
            }
            if ('caches' in window) {
              caches.keys().then((keys) => {
                keys.forEach((key) => {
                  caches.delete(key).then(() => {
                    console.log('Cache cleared in dev mode:', key);
                  });
                });
              });
            }
          `}</Script>
        )}
      </body>
    </html>
  );
}

