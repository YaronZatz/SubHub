import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { CurrencyProvider } from "../contexts/CurrencyContext";

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "SubHub | One Map. Zero Noise.",
  description: "AI-Powered Facebook Sublet Aggregator",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
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
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
        <script dangerouslySetInnerHTML={{
          __html: `window.process = window.process || { env: {} };`
        }} />
      </head>
      <body className="antialiased" style={{ margin: 0, minHeight: '100vh' }}>
        <AuthProvider>
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}