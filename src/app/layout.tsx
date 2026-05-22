import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/providers/Web3Provider";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TIFO | World Cup Territory War",
  description:
    "48 factions battle for territory on a real world map. Every rally, capture, and defection is a verifiable transaction on X Layer.",
  other: {
    "viewport": "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
    "theme-color": "#030712",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-gray-950 text-white antialiased`}>
        <Web3Provider><ToastProvider>{children}</ToastProvider></Web3Provider>
      </body>
    </html>
  );
}
