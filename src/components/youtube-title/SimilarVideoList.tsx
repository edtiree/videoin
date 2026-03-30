"use client";

import { useState } from "react";
import { useProjectStore, type VideoResult } from "@/stores/titleProjectStore";
import { formatCount } from "@/lib/youtube-title/utils";

export default function SimilarVideoList() {
  const {
    similarVideos,
    setSimilarVideos,
    searchKeywords,
    setSearchKeywords,
    selectedRefVideoIds,
    toggleRefVideo,
    analysis,
  } = useProjectStore();

  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "views" | "date">("relevance");

  const handleSearch = async () => {
    const keywords = searchKeywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/youtube-title/youtube/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          summary: analysis?.summary || "",
          max_results: 20,
        }),
      });
      const data = await res.json();
      setSimilarVideos(data.videos);
    } catch {
      alert("검색에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...similarVideos].sort((a, b) => {
    if (sortBy === "views") return b.view_count - a.view_count;
    if (sortBy === "date") return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    return 0;
  });

  const selectedCount = selectedRefVideoIds.size;

  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg width="16" height="16" fill="none" stroke="#3182f6" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-toss-gray-900">유사 영상 검색</h2>
        </div>
        {selectedCount > 0 && (
          <span className="text-xs font-bold bg-toss-blue text-white px-3 py-1 rounded-full shadow-sm">
            {selectedCount}개 선택됨
          </span>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            value={searchKeywords}
            onChange={(e) => setSearchKeywords(e.target.value)}
            placeholder="키워드를 쉼표로 구분하여 입력"
            className="w-full px-4 py-3 rounded-xl border border-toss-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue/50 transition-all pr-10"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {searchKeywords && (
            <button
              onClick={() => setSearchKeywords("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-toss-gray-300 hover:text-toss-gray-500"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-70 text-white px-5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            "검색"
          )}
        </button>
      </div>

      {/* Sort */}
      {similarVideos.length > 0 && (
        <div className="flex gap-1 mb-4 bg-toss-gray-50 rounded-lg p-1 w-fit">
          {(["relevance", "views", "date"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                sortBy === s
                  ? "bg-white text-toss-gray-900 shadow-sm"
                  : "text-toss-gray-400 hover:text-toss-gray-600"
              }`}
            >
              {s === "relevance" ? "관련도" : s === "views" ? "조회수" : "최신순"}
            </button>
          ))}
        </div>
      )}

      {/* Video List */}
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {sorted.map((v: VideoResult) => {
          const isSelected = selectedRefVideoIds.has(v.video_id);
          return (
            <div
              key={v.video_id}
              onClick={() => toggleRefVideo(v.video_id)}
              className={`flex gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "bg-blue-50 ring-1 ring-toss-blue/30"
                  : "hover:bg-toss-gray-50"
              }`}
            >
              <div className="w-32 h-[72px] rounded-lg overflow-hidden flex-shrink-0 relative">
                <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 py-0.5 rounded">
                  {v.duration_display}
                </span>
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-xs font-semibold text-toss-gray-800 line-clamp-2 leading-snug mb-1">
                  {v.title}
                </p>
                <p className="text-[10px] text-toss-gray-400">
                  {v.channel_name} · {formatCount(v.view_count)}회
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-toss-blue border-toss-blue scale-110"
                      : "border-toss-gray-200"
                  }`}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {similarVideos.length === 0 && !loading && (
        <div className="text-center py-8 text-toss-gray-300">
          <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto mb-2">
            <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p className="text-xs">키워드를 입력하고 검색하세요</p>
        </div>
      )}
    </div>
  );
}
