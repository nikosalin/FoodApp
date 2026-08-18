import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/lib/i18n";
import "./globals.css";
import I18nProvider from "@/components/providers/i18nProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Der Schöne Grieche",
  description: "Griechische Spezialitäten online bestellen.",
  icons: {
    icon: "/home1.png",
    apple: "/home1.png",
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
      <body className="min-h-full flex flex-col">
        {" "}
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
