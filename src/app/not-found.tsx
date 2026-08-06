import { Card, LinkButton } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-5 py-20">
        <Card className="w-full p-8 text-center">
          <Logo variant="tile" size={52} className="mx-auto" />
          <h1 className="mt-6 font-display text-2xl text-ink">We couldn&apos;t find that page</h1>
          <p className="mt-3 text-ink-2">
            The link may have expired, or the mission may have been made private. If a friend sent
            it to you, ask them for the link again — private missions need the token in it.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <LinkButton href="/">Back to Asar</LinkButton>
            <LinkButton href="/give" variant="outline">
              Browse causes
            </LinkButton>
          </div>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
