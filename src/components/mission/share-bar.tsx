"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

/**
 * Sharing is a first-class contribution here (C-302), so the share
 * controls sit in the page rather than hiding behind a kebab menu.
 */
export function ShareBar({
  url,
  text,
  onShared,
  compact,
}: {
  url: string;
  text: string;
  onShared?: () => void;
  compact?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: text, text, url });
        onShared?.();
        return;
      } catch {
        // The person dismissed the sheet — not an error worth surfacing.
        return;
      }
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      toast("Link copied", "success");
      onShared?.();
    } catch {
      toast("Couldn't copy — long-press the link instead.", "warn");
    }
  }

  const encoded = encodeURIComponent(`${text} ${url}`);

  return (
    <div className={compact ? "flex gap-2" : "flex flex-wrap gap-2"}>
      <Button size={compact ? "sm" : "md"} variant="outline" onClick={nativeShare}>
        Share
      </Button>
      <Button size={compact ? "sm" : "md"} variant="ghost" onClick={copy}>
        {copied ? "Copied ✓" : "Copy link"}
      </Button>
      <a
        href={`https://wa.me/?text=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onShared}
        className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink"
      >
        WhatsApp
      </a>
      <a
        href={`https://x.com/intent/tweet?text=${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onShared}
        className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink"
      >
        X
      </a>
    </div>
  );
}
