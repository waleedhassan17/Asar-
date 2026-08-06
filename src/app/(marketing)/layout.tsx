import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

/** The public, unauthenticated pages: our story and the give directory. */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
