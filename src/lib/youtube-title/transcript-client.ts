// 클라이언트 사이드에서 YouTube 자막을 추출하는 모듈
// 브라우저에서 실행되므로 사용자 IP로 YouTube에 요청 → Vercel IP 차단 우회

const ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";
const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36";

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_: string, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_: string, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

export function extractVideoId(url: string): string | null {
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

// 방법 1: ANDROID innertube API
async function fetchViaInnerTube(videoId: string): Promise<CaptionTrack[]> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", hl: "ko" } },
        videoId,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    return Array.isArray(tracks) ? tracks : [];
  } catch {
    return [];
  }
}

// 방법 2: 웹 페이지에서 자막 트랙 추출 (CORS proxy 필요 없음 - 서버 API 경유)
async function fetchViaWebPage(videoId: string): Promise<CaptionTrack[]> {
  try {
    const res = await fetch(`/api/youtube-title/transcript/youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${videoId}`, mode: "tracks-only" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.tracks || [];
  } catch {
    return [];
  }
}

// 자막 XML에서 텍스트 추출
function parseTranscriptXml(xml: string): string[] {
  const results: string[] = [];

  // srv3 format: <p t="123" d="456"><s>text</s></p>
  const srv3Pattern = /<p\s+t="\d+"\s+d="\d+"[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = srv3Pattern.exec(xml)) !== null) {
    const inner = m[1];
    let text = "";
    const sPattern = /<s[^>]*>([^<]*)<\/s>/g;
    let sm;
    while ((sm = sPattern.exec(inner)) !== null) text += sm[1];
    if (!text) text = inner.replace(/<[^>]+>/g, "");
    text = decodeEntities(text).trim();
    if (text) results.push(text);
  }
  if (results.length > 0) return results;

  // Legacy format: <text start="0" dur="1.5">text</text>
  const legacyPattern = /<text[^>]*>([^<]*)<\/text>/g;
  while ((m = legacyPattern.exec(xml)) !== null) {
    const text = decodeEntities(m[1]).trim();
    if (text) results.push(text);
  }

  return results;
}

export async function fetchYoutubeTranscript(videoId: string): Promise<{
  transcript: string;
  videoType: string;
  videoThumbnail: string;
}> {
  // 1차: ANDROID innertube (브라우저에서 직접 호출)
  let tracks = await fetchViaInnerTube(videoId);

  // 2차: 서버 경유 웹 스크래핑
  if (tracks.length === 0) {
    tracks = await fetchViaWebPage(videoId);
  }

  if (tracks.length === 0) {
    throw new Error("이 영상에 자막이 없습니다. 자막이 활성화된 영상의 링크를 사용해주세요.");
  }

  // 한국어 자막 우선
  let selectedTrack = tracks.find((t) => t.languageCode === "ko") || tracks[0];

  // 자막 XML 가져오기 (브라우저에서 직접)
  const captionRes = await fetch(selectedTrack.baseUrl);
  const xml = await captionRes.text();
  const texts = parseTranscriptXml(xml);

  if (texts.length === 0) {
    throw new Error("자막 텍스트를 추출할 수 없습니다.");
  }

  return {
    transcript: texts.join(" "),
    videoType: "롱폼",
    videoThumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
}
