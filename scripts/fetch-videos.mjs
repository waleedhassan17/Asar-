#!/usr/bin/env node
/**
 * Fetches the impact-reel footage from Pexels, compresses it, and writes
 * posters and credits into public/videos.
 *
 * This is a build-time tool, not part of the app. It runs by hand when the
 * footage needs changing:
 *
 *   PEXELS_API_KEY=... node scripts/fetch-videos.mjs
 *
 * The key never reaches the browser and never belongs in Vercel — the
 * clips are self-hosted, so at runtime there is no Pexels dependency at
 * all. That is also why the ids below are hardcoded rather than the result
 * of a live search: a search re-run months from now returns different
 * footage, and the whole point of the list is that a human looked at every
 * frame of it against the rules in the header comment of ImpactReel.
 *
 * Selection rules, applied by eye and not by keyword:
 *   - hands and action, not faces; nobody is identifiable as a recipient
 *   - no distress framing, no queues for aid, no children as subjects
 *   - no branded charity clothing, which would imply a partnership
 *   - the hero must be low-detail: a headline sits on top of it
 *
 * Requires ffmpeg and ffprobe on PATH.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const KEY = process.env.PEXELS_API_KEY;
if (!KEY) {
  console.error("PEXELS_API_KEY is not set. See the comment at the top of this file.");
  process.exit(1);
}

const OUT = join(process.cwd(), "public", "videos");

/** Hand-picked. `seconds` trims to the most usable stretch of each clip. */
const CLIPS = [
  {
    id: 6963393,
    name: "impact-hero",
    seconds: 8,
    width: 1280,
    // A single hand holding a seedling against a soft, near-plain
    // background — the emptiness is the point, the headline goes there.
    alt: "A hand holding a young seedling in a little soil",
    caption: "The kind of good a birthday can start.",
  },
  {
    id: 4238310,
    name: "impact-plant",
    seconds: 6,
    width: 854,
    alt: "Two hands settling a seedling into dark soil",
    caption: "Plant",
  },
  {
    id: 6894121,
    name: "impact-feed",
    seconds: 6,
    width: 854,
    alt: "A meal container passing from one pair of hands to another",
    caption: "Feed",
  },
  {
    id: 8617052,
    name: "impact-care",
    seconds: 6,
    width: 854,
    alt: "A hand pointing to a page of a notebook on a desk",
    caption: "Care",
  },

  // ------------------------------------------------------------------
  // Mission-category clips.
  //
  // These are matched to a mission's own subject on the dashboard, so a
  // mission about meals shows food and one about trees shows planting.
  // That makes the footage information rather than decoration — which is
  // the only reason to put video on a dashboard at all.
  //
  // Same selection rules as above. The health clip is deliberately two
  // hands holding another pair, not a needle or a blood bag: a mission to
  // find blood donors is about care, and the clinical framing reads as
  // illness. Nothing here shows a face.
  // ------------------------------------------------------------------
  {
    id: 7522356,
    name: "mission-health",
    seconds: 6,
    width: 640,
    alt: "Two hands resting on an older person's hand",
    caption: "Health",
  },
  {
    id: 5602279,
    name: "mission-general",
    seconds: 6,
    width: 640,
    alt: "Warm candle flames out of focus",
    caption: "General",
  },
  {
    id: 2236003,
    name: "mission-water",
    seconds: 6,
    width: 640,
    alt: "Water running from a tap",
    caption: "Water",
  },
];

const UA = "asar-fetch-videos (+https://github.com/waleedhassan17/Asar-)";

async function pexels(id) {
  const res = await fetch(`https://api.pexels.com/videos/videos/${id}`, {
    headers: { Authorization: KEY, "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Pexels ${id} -> HTTP ${res.status}`);
  return res.json();
}

/** The largest mp4 at or under 1080p — anything bigger is wasted on a scaled-down loop. */
function bestSource(video) {
  const files = video.video_files
    .filter((f) => f.file_type === "video/mp4" && f.height && f.height <= 1080)
    .sort((a, b) => b.height - a.height);
  if (!files.length) throw new Error(`no usable mp4 for ${video.id}`);
  return files[0];
}

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
}

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2);

async function main() {
  mkdirSync(OUT, { recursive: true });
  const credits = [];

  // Existing clips are left alone so a re-run only fetches what is
  // missing — re-downloading everything makes the script hostage to a
  // flaky connection for footage that is already on disk. FORCE=1 to
  // rebuild the lot.
  const force = process.env.FORCE === "1";

  for (const clip of CLIPS) {
    // Metadata is fetched even for clips already on disk: it costs one
    // small request and it is what keeps CREDITS.md accurate. Only the
    // download and re-encode are skipped.
    const video = await pexels(clip.id);
    credits.push(
      `| \`${clip.name}.mp4\` | [Pexels #${clip.id}](${video.url}) | ${video.user.name} |`,
    );

    const mp4Path = join(OUT, `${clip.name}.mp4`);
    if (!force && existsSync(mp4Path)) {
      console.log(`\n${clip.name} — already present, skipping download`);
      continue;
    }

    const source = bestSource(video);
    console.log(`\n${clip.name} — ${source.width}x${source.height}, ${video.duration}s`);

    const raw = join(OUT, `${clip.name}.src.mp4`);
    const mp4 = join(OUT, `${clip.name}.mp4`);
    const jpg = join(OUT, `${clip.name}.jpg`);

    const bytes = Buffer.from(await (await fetch(source.link)).arrayBuffer());
    writeFileSync(raw, bytes);

    // No audio track at all: these loop silently behind text, and an
    // unused stream is pure weight. faststart puts the moov atom first so
    // playback can begin before the file finishes arriving.
    ffmpeg([
      "-i", raw,
      "-t", String(clip.seconds),
      "-vf", `scale=${clip.width}:-2:flags=lanczos,fps=25`,
      "-c:v", "libx264", "-crf", "30", "-preset", "slow",
      "-profile:v", "main", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart", "-an",
      mp4,
    ]);

    // Poster: a frame from just inside the clip, so it matches what the
    // first painted frame looks like rather than a black lead-in.
    ffmpeg([
      "-ss", "0.4", "-i", raw, "-frames:v", "1",
      "-vf", `scale=${clip.width}:-2:flags=lanczos`,
      "-q:v", "5", jpg,
    ]);

    execFileSync("rm", ["-f", raw]);
    console.log(`  -> ${clip.name}.mp4 ${mb(mp4)} MB · ${clip.name}.jpg ${mb(jpg)} MB`);
  }

  writeFileSync(
    join(OUT, "CREDITS.md"),
    `# Impact reel footage

Fetched with \`scripts/fetch-videos.mjs\`, which also records the selection
rules these clips were chosen against.

Every clip is used under the [Pexels License](https://www.pexels.com/license/):
free for commercial use, no attribution required. Credit is given anyway —
the people below made this footage and it costs us nothing to say so.

All clips are trimmed, scaled and stripped of audio. Each has a matching
\`.jpg\` poster, which is what people who ask for reduced motion see instead.

| File | Source | Photographer |
|---|---|---|
${credits.join("\n")}
`,
  );

  console.log(`\nWrote ${CLIPS.length} clips + posters + CREDITS.md to public/videos`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
