import Link from "next/link";
import { PhotoBackground } from "@/components/brand/photo-background";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/site/footer";

/**
 * The auth pages get the same warm photograph the landing page opens
 * with, so signing in doesn't feel like leaving the product. The form
 * itself sits in a frosted card over the scrim — ink text on white glass,
 * never light text on a photo.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <PhotoBackground
        src="/backgrounds/hero-01.jpg"
        alt=""
        eager
        className="flex flex-1 flex-col"
      >
        <div className="flex min-h-[100svh] flex-col px-5 py-6 sm:py-10">
          <div className="mx-auto w-full max-w-md">
            <Link
              href="/"
              className="inline-flex rounded-md focus-visible:outline-2"
              aria-label="Asar — home"
            >
              {/* On the photo the wordmark needs to be white, not evergreen. */}
              <Logo size={34} tone="onPhoto" />
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 items-center py-8">
            <div className="w-full">{children}</div>
          </div>
        </div>
      </PhotoBackground>

      <SiteFooter />
    </>
  );
}
