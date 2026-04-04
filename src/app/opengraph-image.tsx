import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "영상인 - 크리에이터와 편집자를 위한 플랫폼";
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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #3182f6 0%, #1b6de8 100%)",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: 16,
          }}
        >
          영상인
        </div>
        <div
          style={{
            fontSize: 36,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          크리에이터와 편집자를 위한 플랫폼
        </div>
      </div>
    ),
    { ...size }
  );
}
