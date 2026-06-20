import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptsmith.vercel.app";
const DESCRIPTION =
  "Raw layman input in. Master-grade prompt out. A free, open-source prompt compiler that turns plain-English asks into expert prompts for frontend, Elementor, custom widgets, and WordPress/Woo plugins — armed with an anti-AI-slop / production-WP ruleset, and it learns from feedback.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "PROMPTSMITH — the prompt forge",
  description: DESCRIPTION,
  applicationName: "PROMPTSMITH",
  keywords: ["prompt engineering", "AI prompts", "frontend", "WordPress", "Elementor", "WooCommerce", "anti AI slop"],
  authors: [{ name: "Systical" }],
  openGraph: {
    title: "PROMPTSMITH — the prompt forge",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "PROMPTSMITH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PROMPTSMITH — the prompt forge",
    description: "Layman in. Master prompt out. A free, open-source anti-AI-slop prompt compiler.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
