"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { plural, tidyNumber } from "@/lib/format";
import type { RevealPayload } from "@/lib/types";

// Canvas can't read Tailwind tokens, so the accent jewel tones are
// mirrored here. Keep in step with the [data-accent] block in globals.css.
const ACCENT_HEX: Record<string, [string, string]> = {
  ember: ["#b0492f", "#d98a6b"],
  gold: ["#7d5f16", "#c39a3e"],
  sage: ["#0e7c66", "#5cb9a2"],
  violet: ["#4a3aad", "#8f83e0"],
  rose: ["#a83259", "#d98cab"],
};

/**
 * R-04 — the one-tap export.
 *
 * Drawn on a canvas rather than screenshotted so the result is a clean
 * 1080×1080 image with no browser chrome, and so the caption is
 * copy-pasteable separately for WhatsApp and Instagram.
 */
export function ShareCard({ reveal, url }: { reveal: RevealPayload; url: string }) {
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);

  const { mission, headline, owner } = reveal;
  const caption = `For my birthday, we ${headline.unit_value > 0 ? `${mission.icon} ${tidyNumber(headline.unit_value)} ${headline.unit}` : "came together"} — thanks to ${headline.people} ${plural(headline.people, "person", "people")} ❤️`;

  async function draw(): Promise<HTMLCanvasElement | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Use the same typefaces as the page; they're already loaded by
    // next/font, we just need their generated family names.
    const styles = getComputedStyle(document.body);
    const displayFont = styles.getPropertyValue("--font-fraunces").trim() || "Georgia, serif";
    const sansFont = styles.getPropertyValue("--font-inter").trim() || "system-ui, sans-serif";
    try {
      await document.fonts.ready;
    } catch {
      /* fonts are best-effort */
    }

    const S = 1080;
    canvas.width = S;
    canvas.height = S;

    const [from, to] = ACCENT_HEX[mission.accent] ?? ACCENT_HEX.sage;

    const bg = ctx.createLinearGradient(0, 0, S, S);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(1, "#fafaf8");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);

    const glow = ctx.createRadialGradient(S * 0.8, S * 0.12, 0, S * 0.8, S * 0.12, S * 0.6);
    glow.addColorStop(0, `${from}44`);
    glow.addColorStop(1, "#ffffff00");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, S, S);

    ctx.textAlign = "center";

    ctx.font = `64px ${sansFont}`;
    ctx.fillText(mission.icon, S / 2, 210);

    ctx.fillStyle = "#3f3f46";
    ctx.font = `500 34px ${sansFont}`;
    ctx.fillText("BECAUSE OF YOU", S / 2, 300);

    // The headline number, sized to fit whatever it turns out to be.
    const big = tidyNumber(headline.unit_value > 0 ? headline.unit_value : headline.value);
    ctx.fillStyle = from;
    let size = 230;
    ctx.font = `700 ${size}px ${displayFont}`;
    while (ctx.measureText(big).width > S - 160 && size > 90) {
      size -= 10;
      ctx.font = `700 ${size}px ${displayFont}`;
    }
    ctx.fillText(big, S / 2, 520);

    ctx.fillStyle = "#18181b";
    ctx.font = `600 58px ${displayFont}`;
    wrapText(ctx, headline.unit, S / 2, 600, S - 200, 68);

    ctx.fillStyle = "#3f3f46";
    ctx.font = `400 34px ${sansFont}`;
    wrapText(
      ctx,
      `${headline.people} ${plural(headline.people, "person", "people")} made this happen for ${owner?.display_name ?? "a friend"}'s birthday`,
      S / 2,
      710,
      S - 220,
      46,
    );

    // Footer strip
    ctx.fillStyle = to;
    ctx.beginPath();
    ctx.roundRect(S / 2 - 300, 850, 600, 96, 48);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `600 34px ${sansFont}`;
    ctx.fillText("asar · turn a birthday into impact", S / 2, 908);

    ctx.fillStyle = "#71717a";
    ctx.font = `400 26px ${sansFont}`;
    ctx.fillText(url.replace(/^https?:\/\//, ""), S / 2, 1010);

    return canvas;
  }

  async function download() {
    setBusy(true);
    try {
      const canvas = await draw();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `asar-${mission.slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("Card saved to your downloads", "success");
    } catch {
      toast("Couldn't build the image — you can still copy the caption.", "warn");
    } finally {
      setBusy(false);
    }
  }

  async function shareImage() {
    setBusy(true);
    try {
      const canvas = await draw();
      if (!canvas) return;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("no blob");

      const file = new File([blob], `asar-${mission.slug}.png`, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption, url });
      } else {
        await download();
      }
    } catch {
      // Dismissing the share sheet throws; that isn't worth a message.
    } finally {
      setBusy(false);
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(`${caption}\n${url}`);
      toast("Caption copied", "success");
    } catch {
      toast("Couldn't copy the caption.", "warn");
    }
  }

  return (
    <div>
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="accent" onClick={shareImage} disabled={busy}>
          {busy ? "Preparing…" : "Share the card"}
        </Button>
        <Button variant="outline" onClick={download} disabled={busy}>
          Download image
        </Button>
        <Button variant="ghost" onClick={copyCaption}>
          Copy caption
        </Button>
      </div>
      <p className="mt-3 text-center text-sm text-ink-2">“{caption}”</p>
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cursor = y;

  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = attempt;
    }
  }
  ctx.fillText(line, x, cursor);
}
