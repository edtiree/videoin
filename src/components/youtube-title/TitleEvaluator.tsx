"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/titleProjectStore";

export default function TitleEvaluator() {
  const { transcript, similarVideos, selectedRefVideoIds, evalResult, setEvalResult } = useProjectStore();
  const [userTitle, setUserTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    if (!userTitle.trim() || !transcript) return;
    setLoading(true);
    try {
      const refVideos = similarVideos
        .filter((v) => selectedRefVideoIds.has(v.video_id))
        .map((v) => ({ title: v.title, channel_name: v.channel_name, view_count: v.view_count }));
      const res = await fetch("/api/youtube-title/titles/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: userTitle,
          transcript,
          ref_videos: refVideos.length > 0 ? refVideos : undefined,
        }),
      });
      const data = await res.json();
      setEvalResult(data.evaluation);
    } catch {
      alert("평가에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg width="16" height="16" fill="none" stroke="#3182f6" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        </div>
        <h2 className="text-sm font-bold text-toss-gray-900">내 제목 평가받기</h2>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={userTitle}
          onChange={(e) => setUserTitle(e.target.value)}
          placeholder="평가받고 싶은 제목을 입력하세요"
          className="flex-1 px-4 py-3 rounded-xl border border-toss-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue/50 transition-all"
          onKeyDown={(e) => e.key === "Enter" && handleEvaluate()}
        />
        <button
          onClick={handleEvaluate}
          disabled={loading || !userTitle.trim()}
          className="bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-50 text-white px-5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            "평가"
          )}
        </button>
      </div>

      {evalResult && (
        <div className="bg-toss-gray-50 rounded-xl p-5 border border-toss-gray-100">
          <div
            className="text-sm text-toss-gray-700 leading-relaxed [&_strong]:font-bold [&_strong]:text-toss-gray-900"
            dangerouslySetInnerHTML={{
              __html: evalResult
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n/g, "<br/>"),
            }}
          />
        </div>
      )}
    </div>
  );
}
