import type { Metadata } from "next";

import { AuthProvider } from "@/components/providers/auth-provider";

import "./globals.css";

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
      <body className="bg-canvas font-body text-ink antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
