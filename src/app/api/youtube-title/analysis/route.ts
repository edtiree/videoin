import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/lib/youtube-title/config";
import { ANALYSIS_PROMPT } from "@/lib/youtube-title/prompts";

function safeParseJson(text: string): Record<string, unknown> {
  const empty = {
    summary: "",
    guest: "",
    guest_name: "",
    keywords: [],
    search_queries: [],
    key_points: [],
    notable_quotes: [],
  };

  let cleaned = text.trim();

  // 코드블록 제거
  if (cleaned.includes("```json")) {
    cleaned = cleaned.slice(cleaned.indexOf("```json") + 7);
    if (cleaned.includes("```")) {
      cleaned = cleaned.slice(0, cleaned.indexOf("```"));
    }
  } else if (cleaned.includes("```")) {
    cleaned = cleaned.slice(cleaned.indexOf("```") + 3);
    if (cleaned.includes("```")) {
      cleaned = cleaned.slice(0, cleaned.indexOf("```"));
    }
  }

  // { } 추출
  cleaned = cleaned.trim();
  if (cleaned.includes("{")) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }

  // 1차 시도
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // 2차: 줄바꿈/제어문자 정리
  let fixed = cleaned
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/ {2,}/g, " ");

  try {
    return JSON.parse(fixed);
  } catch {
    // continue
  }

  // 3차: 이스케이프 안 된 따옴표 처리
  try {
    fixed = fixed.replace(
      /(?<=: ")(.*?)(?="[,\s]*[}\]])/g,
      (match) => match.replace(/"/g, "'")
    );
    return JSON.parse(fixed);
  } catch {
    // give up
  }

  return empty;
}

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json({ error: "스크립트를 입력해주세요" }, { status: 400 });
    }

    // 긴 대본은 앞/중간/뒤를 골고루 샘플링
    let text = transcript;
    if (transcript.length > 8000) {
      const chunk = 2600;
      const mid = Math.floor(transcript.length / 2);
      text =
        transcript.slice(0, chunk) +
        "\n\n[...중략...]\n\n" +
        transcript.slice(mid - Math.floor(chunk / 2), mid + Math.floor(chunk / 2)) +
        "\n\n[...중략...]\n\n" +
        transcript.slice(-chunk);
    }

    const prompt = ANALYSIS_PROMPT.replace("{transcript}", text);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const result = safeParseJson(responseText);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "분석 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
