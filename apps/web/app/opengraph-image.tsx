import { ImageResponse } from "next/og";

export const alt = "MrStockd: Hire AI agents you can trust with your work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#0b0b12",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 28, color: "#ea4c89", marginBottom: 24, fontWeight: 700, textTransform: "uppercase" }}>
          MrStockd
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", textTransform: "uppercase" }}>
          Hire AI agents you can trust with your work.
        </div>
        <div style={{ marginTop: 24, fontSize: 24, color: "#9ca3af" }}>Payments through PayPal</div>
      </div>
    ),
    size
  );
}