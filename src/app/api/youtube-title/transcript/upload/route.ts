import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "파일을 업로드해주세요" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: file,
      language: "ko",
    });

    const transcript = transcription.text;

    if (!transcript.trim()) {
      return NextResponse.json({ error: "음성 인식 결과가 비어있습니다" }, { status: 400 });
    }

    return NextResponse.json({
      transcript,
      videoType: "롱폼",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "음성 인식 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
