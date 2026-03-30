import { NextRequest, NextResponse } from "next/server";

interface SearchRequest {
  keywords: string[];
  summary?: string;
  maxResults?: number;
  order?: string;
  durationFilter?: string;
  customQuery?: string;
}

interface VideoResult {
  video_id: string;
  title: string;
  channel_name: string;
  view_count: number;
  view_display: string;
  thumbnail: string;
  published_at: string;
  duration_sec: number;
  duration_display: string;
  type: string;
  _relevance?: number;
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] || "0", 10);
  const mi = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + mi * 60 + s;
}

function formatDuration(sec: number): string {
  if (sec < 3600) {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }
  return `${Math.floor(sec / 3600)}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const {
      keywords,
      summary = "",
      maxResults = 10,
      order = "relevance",
      durationFilter = "any",
      customQuery = "",
    } = body;

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YouTube API 키가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    // 쿼리 조합
    let queries: string[];
    if (customQuery) {
      queries = [customQuery];
    } else {
      const kwList = keywords.filter((kw) => kw.trim());
      const hasPhrase = kwList.some((kw) => kw.includes(" "));

      if (hasPhrase) {
        queries = kwList;
      } else if (kwList.length >= 2) {
        // 키워드 조합
        const pairs: string[] = [];
        for (let i = 0; i < kwList.length; i++) {
          for (let j = i + 1; j < kwList.length; j++) {
            pairs.push(`${kwList[i]} ${kwList[j]}`);
          }
        }
        const all = [kwList.join(" "), ...pairs.slice(0, 4)];
        const seen = new Set<string>();
        queries = [];
        for (const q of all) {
          if (!seen.has(q)) {
            seen.add(q);
            queries.push(q);
          }
        }
      } else if (kwList.length > 0) {
        queries = kwList;
      } else {
        queries = summary ? [summary.slice(0, 50)] : [];
      }
    }

    if (!queries.length) {
      return NextResponse.json({ videos: [] });
    }

    // 키워드별로 검색 후 합치기
    const allVideoIds: string[] = [];
    const seenIds = new Set<string>();
    const multiQueryHits: Record<string, number> = {};
    const perQuery = Math.max(Math.floor(maxResults / queries.length), 5);

    for (const query of queries) {
      const params = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "video",
        maxResults: String(perQuery),
        order,
        regionCode: "KR",
        relevanceLanguage: "ko",
        key: apiKey,
      });
      if (durationFilter !== "any") {
        params.set("videoDuration", durationFilter);
      }

      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
      );
      const searchData = await searchRes.json();

      for (const item of searchData.items || []) {
        const vid = item.id.videoId;
        multiQueryHits[vid] = (multiQueryHits[vid] || 0) + 1;
        if (!seenIds.has(vid)) {
          seenIds.add(vid);
          allVideoIds.push(vid);
        }
      }
    }

    if (!allVideoIds.length) {
      return NextResponse.json({ videos: [] });
    }

    // 영상 상세 정보 (50개씩 배치)
    const videos: VideoResult[] = [];
    for (let i = 0; i < allVideoIds.length; i += 50) {
      const batch = allVideoIds.slice(i, i + 50);
      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch.join(",")}&key=${apiKey}`
      );
      const vData = await vRes.json();

      for (const item of vData.items || []) {
        const stats = item.statistics || {};
        const snippet = item.snippet || {};
        const viewCount = parseInt(stats.viewCount || "0", 10);
        const durationStr = item.contentDetails?.duration || "";
        const durationSec = parseDuration(durationStr);

        videos.push({
          video_id: item.id,
          title: snippet.title || "",
          channel_name: snippet.channelTitle || "",
          view_count: viewCount,
          view_display: formatCount(viewCount),
          thumbnail: snippet.thumbnails?.medium?.url || "",
          published_at: snippet.publishedAt || "",
          duration_sec: durationSec,
          duration_display: formatDuration(durationSec),
          type: durationSec <= 180 ? "숏폼" : "롱폼",
        });
      }
    }

    // 관련성 점수 계산
    const genericWords = new Set([
      "유튜브", "영상", "방법", "추천", "정리", "공개", "진짜", "최신", "직접",
      "전부", "완벽", "이렇게", "하는", "되는", "만드는", "하면", "시작",
      "어떻게", "소개", "알려", "해보", "한번", "지금", "올해", "요즘",
    ]);

    const coreKeywords = new Set<string>();
    for (const kw of keywords) {
      for (const word of kw.trim().split(/\s+/)) {
        if (word.length >= 2 && !genericWords.has(word)) {
          coreKeywords.add(word);
        }
      }
    }

    const phraseKeywords: string[] = [];
    for (const kw of keywords) {
      const words = kw
        .trim()
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !genericWords.has(w));
      if (words.length >= 2) {
        phraseKeywords.push(words.join(" "));
      }
    }

    for (const v of videos) {
      let score = 0;
      // 개별 키워드 매칭
      for (const kw of coreKeywords) {
        if (v.title.includes(kw)) score += 1;
      }
      // 구문 매칭 보너스
      for (const phrase of phraseKeywords) {
        const phraseWords = phrase.split(" ");
        const matched = phraseWords.filter((pw) => v.title.includes(pw)).length;
        if (matched >= 2) score += 3;
      }
      // 다중 쿼리 등장 보너스
      const queryHits = multiQueryHits[v.video_id] || 1;
      if (queryHits >= 2) score += (queryHits - 1) * 5;

      v._relevance = score;
    }

    // 관련도 높은 순 -> 같으면 조회수 높은 순
    videos.sort((a, b) => {
      const relDiff = (b._relevance || 0) - (a._relevance || 0);
      if (relDiff !== 0) return relDiff;
      return b.view_count - a.view_count;
    });

    return NextResponse.json({ videos: videos.slice(0, maxResults) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "검색 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
