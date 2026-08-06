import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Asar — turn your birthday into impact",
    template: "%s · Asar",
  },
  description:
    "Instead of gifts, pick a mission. Friends pledge an action — money, time or voice — and on your birthday you find out what everyone did together.",
  openGraph: {
    title: "Asar — turn your birthday into impact",
    description:
      "Pick a mission. Friends pledge actions. On your birthday, see what you did together.",
    type: "website",
  },
};

export const viewport: Viewport = {
  // The palette is white-first in both system themes, so the browser
  // chrome should not go dark underneath it.
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
