import type React from "react"
import { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import AppProviders from "@/components/app-providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "LifeStages | Bible for Life Stages",
  description:
    "AI-powered devotionals that personalize YouVersion's Verse of the Day for YOUR age, gender, and life stage.",
  applicationName: "LifeStages",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeStages",
  },
  category: "religion",
}

export const viewport: Viewport = {
  themeColor: "#0c1929",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link
          rel="stylesheet"
          href="/fonts/material-symbols.css"
        />
      </head>
      <body className="font-sans antialiased overscroll-none select-none">
        <Suspense fallback={<div className="min-h-screen bg-[#0c1929]" />}><AppProviders>{children}</AppProviders></Suspense>
      </body>
    </html>
  )
}

