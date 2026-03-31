import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "에디트리 영상 제작팀";
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
          에디트리
        </div>
        <div
          style={{
            fontSize: 36,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          영상 제작팀 내부 시스템
        </div>
      </div>
    ),
    { ...size }
  );
}
