import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import ThemePaletteBar from "@/components/ThemePaletteBar";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

// next/font downloads at build time → served from your own domain
// zero Google Fonts network request at runtime
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--ff-body",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--ff-display",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ff-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlowScrape — Intelligent Web Automation",
  description: "Build, run, and analyse web scraping workflows at scale",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl={"/"}
      appearance={{
        elements: {
          formButtonPrimary:
            "bg-primary hover:bg-primary/90 text-sm !shadow-none",
        },
      }}
    >
      <html
        lang="en"
        className={`h-full ${inter.variable} ${jakarta.variable} ${jetBrainsMono.variable}`}
        suppressHydrationWarning
      >
        <head>
          <Script
            src="https://checkout.razorpay.com/v1/checkout.js"
            strategy="beforeInteractive"
          />
        </head>
        <body className="h-full">
          <AppProviders>
            <div className="h-full">{children}</div>
            <ThemePaletteBar />
          </AppProviders>
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}
