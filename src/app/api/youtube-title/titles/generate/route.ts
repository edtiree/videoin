import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS,
  NUM_TITLE_SUGGESTIONS,
} from "@/lib/youtube-title/config";
import {
  SYSTEM_PROMPT_TEMPLATE,
  USER_PROMPT_TEMPLATE,
  SUMMARY_PROMPT,
} from "@/lib/youtube-title/prompts";

interface SimilarVideo {
  video_id?: string;
  title?: string;
  channel_name?: string;
  view_count?: number;
}

interface RefChannel {
  name?: string;
  channel_id?: string;
}

interface GenerateRequest {
  transcript: string;
  analysisSummary?: string;
  titleStyle?: string;
  refChannels?: RefChannel[];
  extraRequest?: string;
  similarVideos?: SimilarVideo[];
  numTitles?: number;
}

async function fetchChannelVideos(
  channelId: string,
  maxVideos: number = 30
): Promise<Array<{ title: string; view_count: number }>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    // 1. 채널의 uploads 플레이리스트 ID 가져오기
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
    );
    const chData = await chRes.json();
    if (!chData.items?.length) return [];

    const uploadsId =
      chData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2. 플레이리스트에서 영상 ID 수집
    const videoIds: string[] = [];
    let nextPageToken: string | undefined;

    while (videoIds.length < maxVideos) {
      const plUrl = new URL(
        "https://www.googleapis.com/youtube/v3/playlistItems"
      );
      plUrl.searchParams.set("part", "contentDetails");
      plUrl.searchParams.set("playlistId", uploadsId);
      plUrl.searchParams.set("maxResults", "50");
      plUrl.searchParams.set("key", apiKey);
      if (nextPageToken) plUrl.searchParams.set("pageToken", nextPageToken);

      const plRes = await fetch(plUrl.toString());
      const plData = await plRes.json();

      for (const item of plData.items || []) {
        videoIds.push(item.contentDetails.videoId);
      }

      nextPageToken = plData.nextPageToken;
      if (!nextPageToken) break;
    }

    const ids = videoIds.slice(0, maxVideos);
    if (!ids.length) return [];

    // 3. 영상 상세 정보 (50개씩 배치)
    const videos: Array<{ title: string; view_count: number }> = [];
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${batch.join(",")}&key=${apiKey}`
      );
      const vData = await vRes.json();

      for (const item of vData.items || []) {
        videos.push({
          title: item.snippet.title,
          view_count: parseInt(item.statistics?.viewCount || "0", 10),
        });
      }
    }

    return videos;
  } catch {
    return [];
  }
}

async function analyzeThumbnails(
  thumbnailUrls: string[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!thumbnailUrls.length || !apiKey) return "";

  const client = new Anthropic({ apiKey });

  const imageBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  for (const url of thumbnailUrls.slice(0, 5)) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      });
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > 1000) {
        const b64 = Buffer.from(buffer).toString("base64");
        imageBlocks.push({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: b64 },
        });
      }
    } catch {
      continue;
    }
  }

  if (!imageBlocks.length) return "";

  imageBlocks.push({
    type: "text",
    text: `위 유튜브 인기 영상 썸네일 이미지들을 분석해주세요.
이 이미지들은 유튜브 썸네일입니다. 썸네일 위에 큰 글씨로 적혀있는 한국어 텍스트를 정확히 읽어야 합니다.

각 썸네일(1번부터 순서대로)에서:
1. 썸네일 위에 적혀있는 텍스트/문구를 한 글자도 빠짐없이 정확하게 읽어주세요 (한국어 텍스트에 집중)
2. 텍스트가 몇 줄인지
3. 글자 색상 (흰색, 노란색, 빨간색 등)
4. 강조 방식 (테두리, 그림자, 크기 차이 등)

마지막에 '공통 패턴 요약'으로 이 썸네일들의 문구 스타일 특징을 정리해주세요.
(숫자/금액 사용법, 자극적 단어, 줄 구성 패턴 등)`,
  });

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: imageBlocks }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  } catch {
    return "";
  }
}

function buildPatternData(req: GenerateRequest): { summary_for_prompt: string } {
  const parts: string[] = [req.analysisSummary || ""];

  // 스타일 지시
  if (
    req.titleStyle &&
    req.titleStyle !== "자동 (AI가 최적 스타일 선택)"
  ) {
    parts.push(
      `\n\n## 제목 스타일 지정\n사용자가 '${req.titleStyle}' 스타일을 요청했습니다. 이 스타일을 우선적으로 적용하세요.`
    );
  }

  return { summary_for_prompt: parts.join("") };
}

async function buildPatternDataAsync(
  req: GenerateRequest
): Promise<{ summary_for_prompt: string }> {
  const base = buildPatternData(req);
  const parts: string[] = [base.summary_for_prompt];

  // 참고 채널 제목
  if (req.refChannels?.length) {
    let channelSection = "\n\n## 참고 채널 제목 스타일 분석\n";
    for (const rc of req.refChannels) {
      const chName = rc.name || "";
      const chId = rc.channel_id || "";
      channelSection += `\n### ${chName}\n`;
      try {
        if (chId) {
          const chVideos = await fetchChannelVideos(chId, 30);
          if (chVideos.length) {
            chVideos.sort((a, b) => b.view_count - a.view_count);
            channelSection += "이 채널의 인기 영상 제목:\n";
            for (const v of chVideos.slice(0, 20)) {
              channelSection += `- "${v.title}" (${v.view_count.toLocaleString()}회)\n`;
            }
          } else {
            channelSection += `('${chName}' 스타일을 참고하세요.)\n`;
          }
        } else {
          channelSection += `('${chName}' 스타일을 참고하세요.)\n`;
        }
      } catch {
        channelSection += `(영상 정보를 가져오지 못했습니다. '${chName}' 스타일을 참고하세요.)\n`;
      }
    }
    channelSection +=
      "\n위 채널들의 제목 패턴(문장 구조, 숫자 사용법, 말투, 강조 방식)을 분석하고, 비슷한 스타일로 제목을 만들어주세요.";
    parts.push(channelSection);
  }

  // 추가 요청사항
  if (req.extraRequest?.trim()) {
    parts.push(`\n\n## 추가 요청사항\n${req.extraRequest}`);
  }

  // 유사 영상 정보
  if (req.similarVideos?.length) {
    let similarSection =
      "\n\n## 비슷한 주제의 고조회수 영상 제목 (참고용)\n";
    for (const sv of req.similarVideos) {
      similarSection += `- "${sv.title || ""}" (${sv.channel_name || ""}, ${(sv.view_count || 0).toLocaleString()}회)\n`;
    }

    // 썸네일 분석
    const thumbUrls = req.similarVideos
      .slice(0, 5)
      .filter((sv) => sv.video_id)
      .map(
        (sv) =>
          `https://img.youtube.com/vi/${sv.video_id}/maxresdefault.jpg`
      );

    if (thumbUrls.length) {
      const thumbnailAnalysis = await analyzeThumbnails(thumbUrls);
      if (thumbnailAnalysis) {
        similarSection += `\n\n## 인기 영상 썸네일 문구 분석 (참고용)\n${thumbnailAnalysis}\n위 인기 영상들의 썸네일 문구 패턴을 참고하여 썸네일 문구를 추천하세요.`;
      }
    }

    parts.push(similarSection);
  }

  return { summary_for_prompt: parts.join("") };
}

async function summarizeTranscript(
  client: Anthropic,
  transcript: string
): Promise<string> {
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: SUMMARY_PROMPT.replace("{transcript}", transcript),
      },
    ],
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

function parseTitles(responseText: string): Array<Record<string, unknown>> {
  let text = responseText.trim();

  // ```json ... ``` 블록 찾기
  if (text.includes("```json")) {
    const start = text.indexOf("```json") + 7;
    const end = text.indexOf("```", start);
    if (end > start) text = text.slice(start, end).trim();
  } else if (text.includes("```")) {
    const start = text.indexOf("```") + 3;
    const end = text.indexOf("```", start);
    if (end > start) text = text.slice(start, end).trim();
  }

  try {
    const data = JSON.parse(text);
    const titles = data.titles || [];
    titles.sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        ((b.score as number) || 0) - ((a.score as number) || 0)
    );
    return titles;
  } catch {
    // 폴백: 텍스트에서 제목 추출
    return fallbackParse(responseText);
  }
}

function fallbackParse(
  text: string
): Array<Record<string, unknown>> {
  const titles: Array<Record<string, unknown>> = [];
  const lines = text.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line && (line.startsWith('"') || line.startsWith("\u300C"))) {
      const title = line.replace(/^["「」"']+|["「」"']+$/g, "");
      if (title && title.length > 5) {
        titles.push({
          title,
          score: 0,
          reasoning: "자동 파싱됨",
          patterns_used: [],
          style_reference: "",
        });
      }
    }
  }
  return titles;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      transcript,
      numTitles = NUM_TITLE_SUGGESTIONS,
    } = body;

    if (!transcript?.trim()) {
      return NextResponse.json(
        { error: "스크립트를 입력해주세요" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 긴 스크립트는 요약 후 사용
    let processedTranscript = transcript;
    if (transcript.length > 10000) {
      processedTranscript = await summarizeTranscript(client, transcript);
    }

    const patternData = await buildPatternDataAsync(body);

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(
      /\{pattern_summary\}/g,
      patternData.summary_for_prompt
    );
    const userPrompt = USER_PROMPT_TEMPLATE.replace(
      "{transcript}",
      processedTranscript
    ).replace("{num_titles}", String(numTitles));

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const titles = parseTitles(responseText);

    return NextResponse.json({ titles });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
