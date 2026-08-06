import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PhotoSlideshow, type Slide } from "@/components/brand/photo-slideshow";

/**
 * Split screen: the form on plain white, the product's reason for
 * existing on a photographic panel beside it.
 *
 * The form deliberately does *not* sit on the photograph. Frosted glass
 * over a moving image means the contrast behind every input changes as
 * the slideshow turns, which is exactly the wrong place to be clever —
 * people are typing a password here. So the picture keeps its own half
 * and the form gets undisturbed white.
 *
 * On small screens the panel becomes a banner above the form rather than
 * disappearing: it is the same single component instance either way, so
 * the extra photographs are never downloaded twice.
 */
const SLIDES: Slide[] = [
  {
    src: "/backgrounds/hero-01.jpg",
    alt: "Candlelight and a small lantern house on a table",
    caption: "A birthday is a good excuse to do something that lasts.",
  },
  {
    src: "/backgrounds/hero-02.jpg",
    alt: "A pair of cupped hands holding dark soil",
    caption: "Ask for meals, trees or blood donors instead of gifts.",
  },
  {
    src: "/backgrounds/hero-03.jpg",
    alt: "Four people standing together, silhouetted against a sunset",
    caption: "Your friends join with one link. No account, no payment.",
  },
  {
    src: "/backgrounds/hero-06.jpg",
    alt: "A pine seedling growing on the forest floor",
    caption: "Open the reveal on the day and see everything they did.",
  },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen flex-1 grid-rows-[auto_1fr] lg:grid-rows-1 lg:grid-cols-[minmax(30rem,42rem)_1fr]">
      {/* The grid row stretches this to full height on large screens, so it
          needs no height of its own beyond the mobile banner. */}
      <PhotoSlideshow slides={SLIDES} className="h-48 sm:h-60 lg:order-2 lg:h-auto" />

      {/*
        Not pure white. A flat #FFFFFF half butted against a warm
        photograph reads as an unfinished panel rather than a designed one,
        and on a wide screen it leaves the form adrift in the middle of
        nothing. The column is capped so it never grows past a comfortable
        reading width, and carries a very faint evergreen/gold wash — the
        two brand tints, at an opacity where they register as warmth rather
        than as colour.
      */}
      <div className="relative flex flex-col bg-surface-2 px-5 py-8 sm:px-10 lg:order-1 lg:px-14 lg:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(115% 75% at 0% 0%, var(--color-primary-100) 0%, transparent 55%)," +
              "radial-gradient(85% 55% at 100% 100%, var(--color-gold-100) 0%, transparent 60%)",
          }}
        />

        <header className="relative flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex rounded-md" aria-label="Asar — home">
            <Logo size={32} />
          </Link>
          <Link
            href="/"
            className="text-sm text-ink-2 underline-offset-4 transition hover:text-primary-600 hover:underline"
          >
            ← Back to Asar
          </Link>
        </header>

        <main className="relative flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[27rem] rounded-card border border-line bg-surface p-7 shadow-md sm:p-8">
            {children}
          </div>
        </main>

        <p className="relative mx-auto max-w-[27rem] text-xs leading-relaxed text-ink-3">
          Asar never handles your money. Every gift happens on the receiving
          organisation&apos;s own official website.
        </p>
      </div>
    </div>
  );
}
