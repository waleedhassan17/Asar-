import type { Metadata, Viewport } from "next";
import { Amiri_Quran, Inter, Source_Serif_4 } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

/**
 * Source Serif 4 for headlines, Inter for everything else.
 *
 * The display face was Fraunces, which carries `SOFT` and `WONK` axes —
 * it is drawn to be characterful, and at headline size that character
 * reads as a wobble rather than as warmth. Source Serif is the quieter
 * choice: a screen-first text serif with the same editorial weight and
 * none of the quirk, and it sits properly alongside Inter.
 */
const display = Source_Serif_4({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Khat-e-Usmani — the Uthmani script the Qur'an is written in. Amiri
 * Quran is the face cut for it, so the hadith is set in the script it
 * belongs to rather than in whatever the body font happens to do with
 * Arabic glyphs.
 *
 * One weight is all it has, and all this needs.
 */
const arabic = Amiri_Quran({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: "400",
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
    <html lang="en" className={`${display.variable} ${sans.variable} ${arabic.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
