import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const appTitle = "Golf Camp 2026";
const appDescription =
  "Golf Camp 2026 — Night Golf, Shenanigans, Camp Roster, and live scoring.";
const appLogo = "/longview-invitational-logo.png";
const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase,
  title: appTitle,
  description: appDescription,
  applicationName: appTitle,
  appleWebApp: {
    title: appTitle,
    capable: true,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: appLogo, type: "image/png" }],
    apple: [{ url: appLogo, type: "image/png" }],
  },
  openGraph: {
    title: appTitle,
    description: appDescription,
    siteName: appTitle,
    images: [
      {
        url: appLogo,
        alt: appTitle,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: appTitle,
    description: appDescription,
    images: [appLogo],
  },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
