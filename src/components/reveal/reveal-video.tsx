"use client";

import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { plural, tidyNumber } from "@/lib/format";
import type { RevealPayload } from "@/lib/types";

export const CLIP_FPS = 30;
export const CLIP_WIDTH = 1080;
export const CLIP_HEIGHT = 1920;
export const CLIP_DURATION = 30 * CLIP_FPS; // 30 seconds

/**
 * The birthday impact clip: 1080×1920, 30fps, half a minute.
 *
 * Written as a real Remotion composition rather than a bespoke animation
 * so the frames are a pure function of `frame` and `inputProps`. That is
 * what makes it renderable to an MP4 later — pointing Remotion Lambda at
 * this file is a configuration change, not a rewrite — and it is also why
 * nothing here reads the clock or the DOM.
 *
 * Deliberately not using the app's CSS: a Remotion composition renders at
 * a fixed pixel size independent of the page, so Tailwind's responsive
 * classes and rem units would fight it. Colours are the design tokens
 * written out as hex, the same compromise share-card.tsx already makes
 * for canvas.
 */

const ACCENT_HEX: Record<string, [string, string]> = {
  ember: ["#b0492f", "#d98a6b"],
  gold: ["#7d5f16", "#c39a3e"],
  sage: ["#0e7c66", "#5cb9a2"],
  violet: ["#4a3aad", "#8f83e0"],
  rose: ["#a83259", "#d98cab"],
};

const INK = "#18181b";
const INK_2 = "#3f3f46";
const INK_3 = "#71717a";
const SURFACE = "#fafaf8";

const DISPLAY = 'var(--font-display-serif), "Source Serif 4", Georgia, serif';
const SANS = 'var(--font-inter), Inter, system-ui, sans-serif';

/** Scenes, in frames. They sum to CLIP_DURATION. */
const SCENES = {
  intro: { from: 0, duration: 4 * CLIP_FPS },
  number: { from: 4 * CLIP_FPS, duration: 9 * CLIP_FPS },
  lives: { from: 13 * CLIP_FPS, duration: 5 * CLIP_FPS },
  breakdown: { from: 18 * CLIP_FPS, duration: 6 * CLIP_FPS },
  people: { from: 24 * CLIP_FPS, duration: 4 * CLIP_FPS },
  outro: { from: 28 * CLIP_FPS, duration: 2 * CLIP_FPS },
};

/**
 * Fade + lift. A plain function of the frame rather than a hook, because
 * the list scenes stagger one of these per row — calling a hook inside a
 * map would break the rules of hooks the moment a list changed length.
 */
function enter(frame: number, fps: number, delay = 0) {
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 20 });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [28, 0])}px)`,
  };
}

/** The two hooks every scene needs, in one call. */
function useClock() {
  return { frame: useCurrentFrame(), fps: useVideoConfig().fps };
}

function Scene({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <AbsoluteFill
      style={{
        background: bg,
        alignItems: "center",
        justifyContent: "center",
        padding: 90,
        textAlign: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

export function RevealVideo({ reveal }: { reveal: RevealPayload }) {
  const { mission, owner, headline, stats, breakdown, contributors } = reveal;
  const [from, to] = ACCENT_HEX[mission.accent] ?? ACCENT_HEX.sage;
  const ownerName = owner?.display_name ?? "the birthday person";
  const softBg = `linear-gradient(160deg, #ffffff 0%, ${SURFACE} 55%, ${to}22 100%)`;

  return (
    <AbsoluteFill style={{ background: "#ffffff", fontFamily: SANS }}>
      <Sequence from={SCENES.intro.from} durationInFrames={SCENES.intro.duration}>
        <Intro ownerName={ownerName} bg={softBg} accent={from} />
      </Sequence>

      <Sequence from={SCENES.number.from} durationInFrames={SCENES.number.duration}>
        <BigNumber
          value={headline.unit_value > 0 ? headline.unit_value : headline.value}
          unit={headline.unit}
          people={headline.people}
          ownerName={ownerName}
          icon={mission.icon}
          bg={softBg}
          accent={from}
        />
      </Sequence>

      <Sequence from={SCENES.lives.from} durationInFrames={SCENES.lives.duration}>
        <Lives lives={stats.lives_impacted} impactLine={mission.impact_line} bg={softBg} accent={from} />
      </Sequence>

      <Sequence from={SCENES.breakdown.from} durationInFrames={SCENES.breakdown.duration}>
        <Breakdown rows={breakdown.slice(0, 4)} bg={softBg} accent={from} />
      </Sequence>

      <Sequence from={SCENES.people.from} durationInFrames={SCENES.people.duration}>
        <People names={contributors} bg={softBg} accent={from} />
      </Sequence>

      <Sequence from={SCENES.outro.from} durationInFrames={SCENES.outro.duration}>
        <Outro title={mission.title} ownerName={ownerName} bg={softBg} accent={from} />
      </Sequence>
    </AbsoluteFill>
  );
}

function Intro({ ownerName, bg, accent }: { ownerName: string; bg: string; accent: string }) {
  const { frame, fps } = useClock();
  const b = enter(frame, fps, 8);
  return (
    <Scene bg={bg}>
      {/* Deliberately not animated in. Frame 0 is the poster: it is what a
          paused player shows, what someone who asked for reduced motion
          sees for the whole clip, and what any thumbnail of this would
          capture. A first frame that fades up from nothing reads as a
          broken player. */}
      <p style={{ fontSize: 44, color: INK_3, letterSpacing: 6, textTransform: "uppercase", margin: 0 }}>
        {ownerName}&apos;s birthday
      </p>
      <div style={{ ...b, marginTop: 40 }}>
        <p style={{ fontFamily: DISPLAY, fontSize: 130, lineHeight: 1.05, color: accent, margin: 0 }}>
          Because of you…
        </p>
      </div>
    </Scene>
  );
}

function BigNumber({
  value,
  unit,
  people,
  ownerName,
  icon,
  bg,
  accent,
}: {
  value: number;
  unit: string;
  people: number;
  ownerName: string;
  icon: string;
  bg: string;
  accent: string;
}) {
  const { frame, fps } = useClock();
  // Counts up over the first second and a half, then holds.
  const progress = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 45 });
  const shown = Math.round(interpolate(progress, [0, 1], [0, value]));
  const a = enter(frame, fps, 30);

  return (
    <Scene bg={bg}>
      <p style={{ fontSize: 150, margin: 0 }}>{icon}</p>
      <p
        style={{
          fontFamily: DISPLAY,
          fontSize: 300,
          lineHeight: 1,
          color: accent,
          margin: "30px 0 0",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {tidyNumber(shown)}
      </p>
      <p style={{ fontFamily: DISPLAY, fontSize: 96, color: INK, margin: "16px 0 0" }}>{unit}</p>
      <p style={{ ...a, fontSize: 46, color: INK_2, margin: "48px 0 0", lineHeight: 1.4 }}>
        {people} {plural(people, "person", "people")} showed up
        <br />
        for {ownerName}&apos;s birthday
      </p>
    </Scene>
  );
}

function Lives({
  lives,
  impactLine,
  bg,
  accent,
}: {
  lives: number;
  impactLine: string | null;
  bg: string;
  accent: string;
}) {
  const { frame, fps } = useClock();
  const a = enter(frame, fps);
  const b = enter(frame, fps, 12);
  return (
    <Scene bg={bg}>
      <p style={{ ...a, fontSize: 50, color: INK_3, margin: 0 }}>Which means</p>
      <p
        style={{
          ...b,
          fontFamily: DISPLAY,
          fontSize: 240,
          lineHeight: 1,
          color: accent,
          margin: "24px 0 0",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {tidyNumber(lives)}
      </p>
      <p style={{ ...b, fontFamily: DISPLAY, fontSize: 86, color: INK, margin: "12px 0 0" }}>
        {plural(lives, "life", "lives")} touched
      </p>
      {impactLine ? (
        <p style={{ ...b, fontSize: 42, color: INK_2, margin: "48px 0 0", fontStyle: "italic", lineHeight: 1.4 }}>
          “{impactLine}”
        </p>
      ) : null}
    </Scene>
  );
}

function Breakdown({
  rows,
  bg,
  accent,
}: {
  rows: RevealPayload["breakdown"];
  bg: string;
  accent: string;
}) {
  const { frame, fps } = useClock();
  const a = enter(frame, fps);
  return (
    <Scene bg={bg}>
      <p style={{ ...a, fontSize: 50, color: INK_3, margin: "0 0 56px" }}>What people did</p>
      <div style={{ width: "100%" }}>
        {rows.map((row, i) => {
          const r = enter(frame, fps, 8 + i * 8);
          return (
            <div
              key={`${row.track}-${row.action_label}`}
              style={{
                ...r,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 28,
                padding: "26px 0",
                borderBottom: "2px solid #ecebe7",
              }}
            >
              <span style={{ fontFamily: DISPLAY, fontSize: 56, color: INK, textAlign: "left" }}>
                {row.action_label}
              </span>
              <span style={{ fontSize: 52, color: accent, fontVariantNumeric: "tabular-nums" }}>
                {row.entries}
              </span>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}

function People({ names, bg, accent }: { names: string[]; bg: string; accent: string }) {
  const { frame, fps } = useClock();
  const a = enter(frame, fps);
  const shown = names.slice(0, 18);
  return (
    <Scene bg={bg}>
      <p style={{ ...a, fontSize: 50, color: INK_3, margin: "0 0 48px" }}>They did it</p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 20,
          width: "100%",
        }}
      >
        {shown.map((name, i) => {
          const r = enter(frame, fps, 6 + i * 3);
          return (
            <span
              key={name}
              style={{
                ...r,
                fontSize: 44,
                color: INK_2,
                background: "#ffffff",
                border: `2px solid ${accent}33`,
                borderRadius: 999,
                padding: "14px 30px",
              }}
            >
              {name}
            </span>
          );
        })}
      </div>
    </Scene>
  );
}

function Outro({
  title,
  ownerName,
  bg,
  accent,
}: {
  title: string;
  ownerName: string;
  bg: string;
  accent: string;
}) {
  const { frame, fps } = useClock();
  const a = enter(frame, fps);
  return (
    <Scene bg={bg}>
      <p style={{ ...a, fontFamily: DISPLAY, fontSize: 96, color: INK, margin: 0, lineHeight: 1.15 }}>
        Happy birthday,
        <br />
        {ownerName}.
      </p>
      <p style={{ ...a, fontSize: 44, color: INK_2, margin: "40px 0 0" }}>{title}</p>
      <p
        style={{
          ...a,
          fontFamily: DISPLAY,
          fontSize: 56,
          color: accent,
          margin: "70px 0 0",
          letterSpacing: 2,
        }}
      >
        Asar
      </p>
      <p style={{ ...a, fontSize: 34, color: INK_3, margin: "10px 0 0" }}>
        turn a birthday into impact
      </p>
    </Scene>
  );
}
