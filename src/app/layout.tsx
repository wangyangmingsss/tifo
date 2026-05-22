import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/providers/Web3Provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TIFO | World Cup Territory War",
  description:
    "48 factions battle for territory on a real world map. Every rally, capture, and defection is a verifiable transaction on X Layer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-gray-950 text-white antialiased`}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
