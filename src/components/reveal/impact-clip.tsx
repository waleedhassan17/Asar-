"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore, type ComponentType, type CSSProperties } from "react";
import { Badge, Card } from "@/components/ui";
import type { RevealPayload } from "@/lib/types";
import {
  CLIP_DURATION,
  CLIP_FPS,
  CLIP_HEIGHT,
  CLIP_WIDTH,
  RevealVideo,
} from "./reveal-video";

/**
 * The 30-second impact clip, played in the browser.
 *
 * The Player is loaded with `next/dynamic` and `ssr: false` so Remotion's
 * runtime is fetched only by people who actually reach a reveal — it has
 * no business in the bundle of a landing page.
 *
 * There is no MP4 here on purpose. Rendering one needs headless Chromium,
 * which does not fit inside a Vercel function, and this deployment has no
 * background-job infrastructure to put a renderer in. The composition is
 * written as a real Remotion composition precisely so that pointing
 * Remotion Lambda at it later is configuration rather than a rewrite.
 * Meanwhile the PNG card below it is the artefact that always works, on
 * every device — video is the upgrade, the card is the guarantee.
 */
/**
 * next/dynamic erases the Player's generic parameter, so the props are
 * restated here and the import is cast once. Doing it in one named place
 * keeps every call site below properly checked.
 */
interface ClipPlayerProps {
  component: ComponentType<{ reveal: RevealPayload }>;
  inputProps: { reveal: RevealPayload };
  durationInFrames: number;
  fps: number;
  compositionWidth: number;
  compositionHeight: number;
  style?: CSSProperties;
  controls?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  acknowledgeRemotionLicense?: boolean;
}

const Player = dynamic(
  async () => {
    const mod = await import("@remotion/player");
    return mod.Player as unknown as ComponentType<ClipPlayerProps>;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto w-full max-w-[280px] rounded-card bg-surface-2"
        style={{ aspectRatio: "9 / 16" }}
        aria-hidden
      />
    ),
  },
);

/**
 * Modelled as a subscription rather than state set from an effect: the
 * media query is external, it can change while the page is open, and the
 * server has no answer for it. The server snapshot is `true` so the very
 * first paint never autoplays anything.
 */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

export function ImpactClip({ reveal }: { reveal: RevealPayload }) {
  // Autoplay is a courtesy, not a default: someone who asked the system
  // for less movement gets a still first frame and a play button.
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">Your 30-second clip</h2>
          <p className="mt-1 text-sm text-ink-2">
            Built from the real numbers on this page. Play it, then share the card below.
          </p>
        </div>
        <Badge tone="gold">New</Badge>
      </div>

      <div className="mt-5 flex justify-center">
        <div className="w-full max-w-[280px] overflow-hidden rounded-card border border-line">
          <Player
            component={RevealVideo}
            inputProps={{ reveal }}
            durationInFrames={CLIP_DURATION}
            fps={CLIP_FPS}
            compositionWidth={CLIP_WIDTH}
            compositionHeight={CLIP_HEIGHT}
            style={{ width: "100%" }}
            controls
            loop
            autoPlay={!reducedMotion}
            acknowledgeRemotionLicense
          />
        </div>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-3">
        The clip plays here rather than downloading as a video file. The image card below saves and
        shares on every device, so use that one for WhatsApp or Instagram.
      </p>
    </Card>
  );
}
