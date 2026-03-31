// youtube-transcript 패키지의 핵심 로직을 인라인으로 가져옴
// 패키지의 CJS/ESM 호환 문제를 해결하기 위해 직접 구현

const VIDEO_ID_RE = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)";
const ANDROID_UA = "com.google.android.youtube/19.02.39 (Linux; U; Android 14)";
const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

interface TranscriptItem {
  text: string;
  duration: number;
  offset: number;
  lang: string;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)));
}

function parseTranscriptXml(xml: string, lang: string): TranscriptItem[] {
  const results: TranscriptItem[] = [];

  // srv3 format: <p t="ms" d="ms">...</p>
  const srv3 = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = srv3.exec(xml)) !== null) {
    const offset = parseInt(m[1], 10);
    const duration = parseInt(m[2], 10);
    const inner = m[3];
    let text = "";
    const sTag = /<s[^>]*>([^<]*)<\/s>/g;
    let sm;
    while ((sm = sTag.exec(inner)) !== null) text += sm[1];
    if (!text) text = inner.replace(/<[^>]+>/g, "");
    text = decodeEntities(text).trim();
    if (text) results.push({ text, duration, offset, lang });
  }

  if (results.length > 0) return results;

  // Legacy format: <text start="sec" dur="sec">text</text>
  const legacy = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;
  while ((m = legacy.exec(xml)) !== null) {
    const text = decodeEntities(m[3]).trim();
    if (text) {
      results.push({
        text,
        duration: parseFloat(m[2]),
        offset: parseFloat(m[1]),
        lang,
      });
    }
  }

  return results;
}

function parseInlineJson(html: string, varName: string): Record<string, unknown> | null {
  const marker = `var ${varName} = `;
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;

  const jsonStart = startIdx + marker.length;
  let depth = 0;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(jsonStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function fetchTranscriptFromTracks(
  tracks: CaptionTrack[],
  videoId: string,
  lang?: string
): Promise<TranscriptItem[]> {
  if (lang && !tracks.some((t) => t.languageCode === lang)) {
    // 요청된 언어가 없으면 언어 지정 없이 첫 번째 트랙 사용
    lang = undefined;
  }

  const track = lang
    ? tracks.find((t) => t.languageCode === lang) || tracks[0]
    : tracks[0];

  const captionUrl = track.baseUrl;

  // URL 검증
  try {
    const parsed = new URL(captionUrl);
    if (!parsed.hostname.endsWith(".youtube.com")) return [];
  } catch {
    return [];
  }

  const res = await fetch(captionUrl, {
    headers: { "User-Agent": WEB_UA, ...(lang && { "Accept-Language": lang }) },
  });

  if (!res.ok) return [];
  const xml = await res.text();
  const useLang = lang || track.languageCode;
  return parseTranscriptXml(xml, useLang);
}

// 방법 1: ANDROID innertube API
async function fetchViaInnerTube(videoId: string, lang?: string): Promise<TranscriptItem[] | null> {
  try {
    const res = await fetch(INNERTUBE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
      body: JSON.stringify({
        context: { client: { clientName: "ANDROID", clientVersion: "19.02.39" } },
        videoId,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks = (data as any)?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    return fetchTranscriptFromTracks(tracks, videoId, lang);
  } catch {
    return null;
  }
}

// 방법 2: 웹페이지 스크래핑
async function fetchViaWebPage(videoId: string, lang?: string): Promise<TranscriptItem[] | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": WEB_UA,
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Cookie": "CONSENT=PENDING+987; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMxMTE0LjA3X3AxGgJrbyACGgYIgJnSmgY",
      },
    });
    const html = await res.text();

    if (html.includes('class="g-recaptcha"')) return null;
    if (!html.includes('"playabilityStatus":')) return null;

    const player = parseInlineJson(html, "ytInitialPlayerResponse");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracks = (player as any)?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    return fetchTranscriptFromTracks(tracks, videoId, lang);
  } catch {
    return null;
  }
}

export async function fetchTranscript(
  videoIdOrUrl: string,
  options?: { lang?: string }
): Promise<TranscriptItem[]> {
  // videoId 추출
  let videoId = videoIdOrUrl;
  if (videoIdOrUrl.length !== 11) {
    const m = videoIdOrUrl.match(VIDEO_ID_RE);
    if (m) videoId = m[1];
  }

  const lang = options?.lang;

  // 1차: ANDROID innertube
  let items = await fetchViaInnerTube(videoId, lang);
  if (items && items.length > 0) return items;

  // 2차: 웹페이지 스크래핑
  items = await fetchViaWebPage(videoId, lang);
  if (items && items.length > 0) return items;

  // 3차: 언어 지정 없이 재시도
  if (lang) {
    items = await fetchViaInnerTube(videoId);
    if (items && items.length > 0) return items;

    items = await fetchViaWebPage(videoId);
    if (items && items.length > 0) return items;
  }

  throw new Error("이 영상에서 자막을 가져올 수 없습니다. 자막이 없거나 비활성화된 영상입니다.");
}
