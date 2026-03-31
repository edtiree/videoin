import { NextRequest, NextResponse } from "next/server";

const TRANSCRIPT_SERVER_URL = process.env.TRANSCRIPT_SERVER_URL || "https://web-production-7867d.up.railway.app";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:v=|\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL을 입력해주세요" }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "올바른 YouTube URL이 아닙니다" }, { status: 400 });
    }

    // Railway 자막 서버에 요청
    const res = await fetch(`${TRANSCRIPT_SERVER_URL}/transcript`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || "자막 추출 실패" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "자막 추출 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
