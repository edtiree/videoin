"use client";

import type { TitleSuggestion, VideoResult } from "@/stores/titleProjectStore";

const COLOR_MAP: Record<string, string> = {
  "흰색": "#fff",
  "노란색": "#FFE500",
  "빨간색": "#FF3B30",
  "초록색": "#34C759",
  "녹색": "#34C759",
  "파란색": "#007AFF",
  "주황색": "#FF9500",
  "검은색": "#000",
};

function parseThumbnailLines(text: string) {
  const rawLines = text.includes("\\n") ? text.split("\\n") : text.split("\n");
  return rawLines
    .filter((l) => l.trim())
    .map((line, i) => {
      let color = "#fff";
      const colorMatch = line.match(/\[([가-힣]+색?)\]/);
      if (colorMatch) {
        color = COLOR_MAP[colorMatch[1]] || "#fff";
        line = line.slice(0, colorMatch.index).trim();
      }
      if (i > 0 && color === "#fff") color = "#FFE500";
      return { text: line, color };
    });
}

interface Props {
  title: TitleSuggestion;
  bgImage?: string;
  channelName?: string;
  channelThumb?: string;
  similarVideos?: VideoResult[];
}

export default function TitleResultCard({ title: td, bgImage, channelName = "내 채널", channelThumb, similarVideos = [] }: Props) {
  const lines = parseThumbnailLines(td.thumbnail_text || "");
  const numLines = lines.length;
  const baseSize = numLines <= 2 ? 26 : numLines === 3 ? 21 : 18;

  const findRefVideo = (refText: string) => {
    for (const sv of similarVideos) {
      if (refText.includes(sv.title) || sv.title.includes(refText)) return sv;
    }
    const refWords = new Set(refText.replace(/"/g, "").split(/\s+/));
    let best: VideoResult | null = null;
    let bestScore = 0;
    for (const sv of similarVideos) {
      const titleWords = new Set(sv.title.split(/\s+/));
      const overlap = [...refWords].filter((w) => titleWords.has(w)).length;
      if (overlap > bestScore) { bestScore = overlap; best = sv; }
    }
    return bestScore >= 2 ? best : null;
  };

  const scoreColor = td.score >= 80 ? "from-green-500 to-emerald-500" : td.score >= 60 ? "from-yellow-500 to-orange-400" : "from-red-500 to-rose-500";
  const scoreBg = td.score >= 80 ? "bg-green-50" : td.score >= 60 ? "bg-yellow-50" : "bg-red-50";

  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Thumbnail Preview */}
        <div className="lg:w-80 flex-shrink-0">
          <div
            className="aspect-video rounded-xl overflow-hidden relative flex items-end justify-start p-4 shadow-lg"
            style={{
              background: bgImage ? `url(${bgImage}) center/cover` : "linear-gradient(135deg, #27272A, #18181B)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="relative flex flex-col gap-0.5">
              {lines.map((line, i) => {
                const fontSize = line.text.length > 8 ? Math.max(baseSize - 4, 14) : baseSize;
                return (
                  <span
                    key={i}
                    style={{
                      color: line.color,
                      fontSize: `${fontSize}px`,
                      fontWeight: 900,
                      WebkitTextStroke: "1.5px #000",
                      paintOrder: "stroke fill",
                      lineHeight: 1.35,
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {line.text}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2.5 mt-3">
            {channelThumb ? (
              <img src={channelThumb} alt="" className="w-9 h-9 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-toss-blue flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {channelName[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-toss-gray-900 line-clamp-2 leading-snug">{td.title}</p>
              <p className="text-xs text-toss-gray-400 mt-0.5">{channelName}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-4">
          {/* Score */}
          <div className="flex items-center gap-3">
            <div className={`${scoreBg} rounded-xl px-4 py-2 flex items-baseline gap-1`}>
              <span className={`text-2xl font-black bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>{td.score}</span>
              <span className="text-xs text-toss-gray-400 font-medium">/ 100</span>
            </div>
            <div className="flex-1 h-2 bg-toss-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${td.score}%`,
                  background: td.score >= 80
                    ? "linear-gradient(90deg, #22c55e, #10b981)"
                    : td.score >= 60
                    ? "linear-gradient(90deg, #eab308, #f97316)"
                    : "linear-gradient(90deg, #ef4444, #f43f5e)",
                }}
              />
            </div>
          </div>

          {/* Patterns */}
          {td.patterns_used?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {td.patterns_used.map((p, i) => (
                <span key={i} className="text-[10px] font-semibold bg-blue-50 text-toss-blue px-2.5 py-1 rounded-md">
                  {p}
                </span>
              ))}
              {td.style_reference && (
                <span className="text-[10px] font-medium bg-toss-gray-50 text-toss-gray-500 px-2.5 py-1 rounded-md">
                  {td.style_reference}
                </span>
              )}
            </div>
          )}

          {/* Reasoning */}
          <p className="text-xs text-toss-gray-500 leading-relaxed">{td.reasoning}</p>

          {/* References */}
          {td.references?.length > 0 && (
            <div className="bg-toss-gray-50 rounded-xl p-4" style={{ borderLeft: "3px solid #3182f6" }}>
              <p className="text-[10px] text-toss-gray-400 font-bold uppercase tracking-wider mb-2">레퍼런스</p>
              <div className="space-y-2">
                {td.references.map((ref, i) => {
                  const refVid = findRefVideo(ref);
                  if (refVid) {
                    return (
                      <div key={i} className="flex gap-2.5 items-center">
                        <img src={refVid.thumbnail} alt="" className="w-20 h-11 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-toss-gray-700 line-clamp-2 leading-snug">{refVid.title}</p>
                          <p className="text-[10px] text-toss-gray-400 mt-0.5">{refVid.channel_name} · {refVid.view_display}회</p>
                        </div>
                      </div>
                    );
                  }
                  return <p key={i} className="text-[11px] text-toss-gray-500">· {ref}</p>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
