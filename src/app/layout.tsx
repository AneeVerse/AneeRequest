import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AneeRequest",
  description: "Advanced Request Management Hub",
  icons: {
    icon: [
      { url: "/favicon-final.png" },
      { url: "/favicon-final.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-final.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-final.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/favicon-final.png",
  },
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
