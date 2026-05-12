import type { Metadata } from "next";

import { FloatingWhatsAppButton } from "@/components/floating-whatsapp-button";
import { AuthProvider } from "@/components/providers/auth-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "SwiftVote",
  description:
    "SwiftVote helps organisers run approved event campaigns with nominations, contestants, paid voting, Paystack verification, and vote reporting.",
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
        <FloatingWhatsAppButton />
      </body>
    </html>
  );
}
