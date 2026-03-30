import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

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

function detectVideoType(url: string): string {
  if (/shorts\//.test(url)) return "숏폼";
  return "롱폼";
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

    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "ko",
    });

    const transcript = transcriptItems.map((item) => item.text).join(" ");

    if (!transcript.trim()) {
      return NextResponse.json({ error: "자막을 가져올 수 없습니다" }, { status: 400 });
    }

    const videoType = detectVideoType(url);
    const videoThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    return NextResponse.json({
      transcript,
      videoType,
      videoThumbnail,
      frames: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "자막 추출 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
