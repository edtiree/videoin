import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "@/lib/youtube-title/config";

interface RefVideo {
  title: string;
  channel_name?: string;
  view_count?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { title, transcript, refVideos } = (await request.json()) as {
      title: string;
      transcript: string;
      refVideos?: RefVideo[];
    };

    if (!title?.trim() || !transcript?.trim()) {
      return NextResponse.json(
        { error: "제목과 스크립트를 모두 입력해주세요" },
        { status: 400 }
      );
    }

    // 긴 대본은 앞/중간/뒤를 골고루 샘플링
    let processedTranscript = transcript;
    if (transcript.length > 8000) {
      const chunk = 2600;
      const mid = Math.floor(transcript.length / 2);
      processedTranscript =
        transcript.slice(0, chunk) +
        "\n[...중략...]\n" +
        transcript.slice(mid - Math.floor(chunk / 2), mid + Math.floor(chunk / 2)) +
        "\n[...중략...]\n" +
        transcript.slice(-chunk);
    }

    let refInfo = "";
    if (refVideos?.length) {
      refInfo = "\n\n## 비슷한 주제의 고조회수 레퍼런스 영상\n";
      for (const sv of refVideos) {
        refInfo += `- "${sv.title}" (${sv.channel_name || ""}, ${(sv.view_count || 0).toLocaleString()}회)\n`;
      }
    }

    const prompt = `아래 유튜브 영상 스크립트에 대해, 사용자가 직접 작성한 제목을 평가해주세요.
${refInfo}

## 사용자 제목
"${title}"

## 영상 스크립트
${processedTranscript}

아래 항목별로 평가해주세요:

1. **점수**: 100점 만점 (숫자만)
2. **잘한 점**: 이 제목의 장점 (1~2줄)
3. **아쉬운 점**: 개선할 부분 (1~2줄)
4. **개선 제안**: 이 제목을 살짝 다듬은 버전 2~3개 (원래 의도를 유지하면서)

간결하게 답변해주세요. 마크다운 형식으로.`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const evaluation =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ evaluation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "평가 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
