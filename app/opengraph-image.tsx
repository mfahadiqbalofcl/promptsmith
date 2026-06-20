import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PROMPTSMITH — the prompt forge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamically-rendered share card in the brand palette (obsidian + ember).
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#0b0a09",
          backgroundImage:
            "radial-gradient(900px 500px at 85% -10%, rgba(255,106,43,0.22), transparent 60%)",
          color: "#f3ece1",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, letterSpacing: 8, fontSize: 28 }}>
          PROMPT<span style={{ color: "#ff6a2b" }}>SMITH</span>
          <span style={{ color: "#877d6f", letterSpacing: 2, fontSize: 22 }}>· the prompt forge</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: 72, lineHeight: 1.02, fontWeight: 700, letterSpacing: -1 }}>
            <span>Layman in.&nbsp;</span>
            <span style={{ color: "#ff8a52" }}>Master prompt out.</span>
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#c8bdb0", maxWidth: 980, lineHeight: 1.35 }}>
            A free, open-source prompt compiler that kills AI-slop output — for frontend, Elementor, widgets and WordPress/Woo plugins.
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 22, color: "#9a8f80", letterSpacing: 1 }}>
          <span style={{ border: "1px solid #2a2520", borderRadius: 6, padding: "8px 16px" }}>free engine · no key</span>
          <span style={{ border: "1px solid #2a2520", borderRadius: 6, padding: "8px 16px" }}>4 domains</span>
          <span style={{ border: "1px solid #2a2520", borderRadius: 6, padding: "8px 16px" }}>learns from feedback</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
