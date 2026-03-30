import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text, videoType } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "텍스트를 입력해주세요" }, { status: 400 });
    }

    return NextResponse.json({
      transcript: text.trim(),
      videoType: videoType || "롱폼",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "처리 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
