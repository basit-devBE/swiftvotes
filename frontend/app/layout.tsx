import type { Metadata } from "next";
import { Cormorant_Garamond, Instrument_Sans } from "next/font/google";

import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const body = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "SwiftVote",
  description:
    "SwiftVote is a fast, secure, and trustworthy platform for nominations, online voting, and event engagement.",
  icons: {
    icon: "/swiftvote-logo.png",
    shortcut: "/swiftvote-logo.png",
    apple: "/swiftvote-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${display.variable} ${body.variable} bg-canvas font-body text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
