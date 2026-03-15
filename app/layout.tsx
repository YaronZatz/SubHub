import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { CurrencyProvider } from "../contexts/CurrencyContext";
import PlatformWrapper from "../components/shared/PlatformWrapper";

function getMetadataBase(): URL | undefined {
  try {
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return new URL(url);
  } catch {
    return undefined;
  }
}

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "SubHub — One Map | Zero Noise",
  description: "Find sublets on one map with zero noise.",
  robots: { index: true, follow: true },
  metadataBase: getMetadataBase(),
  openGraph: {
    type: 'website',
    siteName: 'SubHub',
    title: 'SubHub — One Map | Zero Noise',
    description: 'Find sublets on one map with zero noise.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://web--gen-lang-client-0322888127.us-east4.hosted.app',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://web--gen-lang-client-0322888127.us-east4.hosted.app'}/og-image.png`,
        width: 1024,
        height: 1024,
        alt: 'SubHub — One Map | Zero Noise',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SubHub — One Map | Zero Noise',
    description: 'Find sublets on one map with zero noise.',
    images: [`${process.env.NEXT_PUBLIC_APP_URL || 'https://web--gen-lang-client-0322888127.us-east4.hosted.app'}/og-image.png`],
  },
};
export const viewport = {
  width: 'device-width' as const,
  initialScale: 1,
  maximumScale: 1,
};

// Fix: Added React import above to resolve 'Cannot find namespace React' error for React.ReactNode
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
          __html: `window.process = window.process || { env: {} };`
        }} />
      </head>
      <body className="antialiased" style={{ margin: 0, minHeight: '100vh' }}>
        <AuthProvider>
          <CurrencyProvider>
            <PlatformWrapper 
              web={children}
              mobile={<div className="pb-20">{children}</div>}
            />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}