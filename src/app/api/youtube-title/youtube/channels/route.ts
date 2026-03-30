import { NextRequest, NextResponse } from "next/server";

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

// GET: 채널 검색
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query");
    const maxResultsParam = request.nextUrl.searchParams.get("maxResults");
    const maxResults = maxResultsParam ? parseInt(maxResultsParam, 10) : 5;

    if (!query) {
      return NextResponse.json({ error: "검색어를 입력해주세요" }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YouTube API 키가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    // 채널 검색
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=${maxResults}&key=${apiKey}`
    );
    const searchData = await searchRes.json();

    const channelIds = (searchData.items || []).map(
      (item: { snippet: { channelId: string } }) => item.snippet.channelId
    );

    if (!channelIds.length) {
      return NextResponse.json({ channels: [] });
    }

    // 구독자 수 등 상세 정보
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.join(",")}&key=${apiKey}`
    );
    const chData = await chRes.json();

    const channels = (chData.items || []).map(
      (item: {
        id: string;
        snippet: {
          title: string;
          description: string;
          thumbnails: { default: { url: string } };
        };
        statistics: { subscriberCount: string };
      }) => {
        const subCount = parseInt(item.statistics?.subscriberCount || "0", 10);
        return {
          channel_id: item.id,
          name: item.snippet?.title || "",
          description: (item.snippet?.description || "").slice(0, 100),
          thumbnail: item.snippet?.thumbnails?.default?.url || "",
          subscriber_count: subCount,
          subscriber_display: formatCount(subCount),
        };
      }
    );

    // 검색어와 채널명 일치도 순으로 정렬
    const qLower = query.toLowerCase().replace(/\s/g, "");
    channels.sort(
      (
        a: { name: string; subscriber_count: number },
        b: { name: string; subscriber_count: number }
      ) => {
        const scoreA = matchScore(a.name, qLower);
        const scoreB = matchScore(b.name, qLower);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return b.subscriber_count - a.subscriber_count;
      }
    );

    return NextResponse.json({ channels });
  } catch (error) {
    const message = error instanceof Error ? error.message : "채널 검색 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function matchScore(name: string, queryLower: string): number {
  const nameLower = name.toLowerCase().replace(/\s/g, "");
  if (nameLower === queryLower) return 0;
  if (nameLower.startsWith(queryLower)) return 1;
  if (nameLower.includes(queryLower)) return 2;
  return 3;
}

// POST: 채널 영상 목록
export async function POST(request: NextRequest) {
  try {
    const { channelId, maxVideos = 30 } = (await request.json()) as {
      channelId: string;
      maxVideos?: number;
    };

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId를 입력해주세요" },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YouTube API 키가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    // 1. 채널의 uploads 플레이리스트 ID 가져오기
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet,statistics&id=${channelId}&key=${apiKey}`
    );
    const chData = await chRes.json();

    if (!chData.items?.length) {
      return NextResponse.json({ videos: [] });
    }

    const uploadsId =
      chData.items[0].contentDetails.relatedPlaylists.uploads;

    // 2. 플레이리스트에서 영상 ID 수집
    const videoIds: string[] = [];
    let nextPageToken: string | undefined;

    while (videoIds.length < maxVideos) {
      const plParams = new URLSearchParams({
        part: "contentDetails",
        playlistId: uploadsId,
        maxResults: "50",
        key: apiKey,
      });
      if (nextPageToken) plParams.set("pageToken", nextPageToken);

      const plRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${plParams.toString()}`
      );
      const plData = await plRes.json();

      for (const item of plData.items || []) {
        videoIds.push(item.contentDetails.videoId);
      }

      nextPageToken = plData.nextPageToken;
      if (!nextPageToken) break;
    }

    const ids = videoIds.slice(0, maxVideos);
    if (!ids.length) {
      return NextResponse.json({ videos: [] });
    }

    // 3. 영상 상세 정보 (50개씩 배치)
    const videos: Array<{
      video_id: string;
      title: string;
      view_count: number;
      like_count: number;
      published_at: string;
    }> = [];

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${batch.join(",")}&key=${apiKey}`
      );
      const vData = await vRes.json();

      for (const item of vData.items || []) {
        const stats = item.statistics || {};
        videos.push({
          video_id: item.id,
          title: item.snippet?.title || "",
          view_count: parseInt(stats.viewCount || "0", 10),
          like_count: parseInt(stats.likeCount || "0", 10),
          published_at: item.snippet?.publishedAt || "",
        });
      }
    }

    return NextResponse.json({ videos });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "채널 영상 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
