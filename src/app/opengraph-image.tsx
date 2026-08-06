import { ImageResponse } from "next/og";
import { MARK_PATH, MARK_VIEWBOX } from "@/components/brand/logo";

export const alt = "Asar — turn your birthday into a trace that keeps giving";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The link preview. Deliberately plain: the mark, the name, one line.
 * Satori has no access to the app's CSS, so the tokens are repeated here
 * as literals — keep them in step with globals.css.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#0E7C66",
          color: "#FFFFFF",
          fontFamily: "Georgia, serif",
        }}
      >
        <svg viewBox={MARK_VIEWBOX} width={132} height={132} fill="#E4CC8A">
          <path d={MARK_PATH} fillRule="evenodd" />
        </svg>

        <div style={{ marginTop: 36, fontSize: 76, letterSpacing: -2, lineHeight: 1.1 }}>
          Don&apos;t just turn a year older —
        </div>
        <div style={{ fontSize: 76, letterSpacing: -2, lineHeight: 1.1, color: "#E4CC8A" }}>
          leave a mark that keeps giving.
        </div>

        <div style={{ marginTop: 34, fontSize: 30, color: "rgba(255,255,255,0.82)" }}>
          Asar · pledge an act of good for someone&apos;s birthday
        </div>
      </div>
    ),
    size,
  );
}
