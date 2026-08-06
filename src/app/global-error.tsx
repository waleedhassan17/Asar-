"use client";

/**
 * Only reached when the root layout itself fails, so it cannot rely on
 * any of the app's styling — hence the inline styles and its own <html>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fff",
          color: "#18181b",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, margin: 0 }}>
            Asar hit an unexpected error
          </h1>
          <p style={{ color: "#3f3f46", lineHeight: 1.6 }}>
            Reloading usually fixes it. Nothing you did was lost.
          </p>
          {error.digest ? (
            <p style={{ color: "#71717a", fontSize: 12 }}>Reference: {error.digest}</p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "12px 22px",
              borderRadius: 999,
              border: 0,
              background: "#0e7c66",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
