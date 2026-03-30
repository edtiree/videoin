"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/titleProjectStore";

const STYLES = [
  "자동 (AI가 최적 스타일 선택)",
  "호기심 유발형",
  "숫자/금액 강조형",
  "질문형",
  "스토리형",
  "권위/신뢰형",
  "자극형",
  "정보/리스트형",
];

export default function TitleSettings() {
  const { titleStyle, setTitleStyle, extraRequest, setExtraRequest, refChannels, addRefChannel, removeRefChannel } =
    useProjectStore();

  const [channelQuery, setChannelQuery] = useState("");
  const [channelResults, setChannelResults] = useState<
    { channel_id: string; name: string; thumbnail: string; subscriber_display: string }[]
  >([]);
  const [searching, setSearching] = useState(false);

  const searchChannels = async () => {
    if (!channelQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/youtube-title/youtube/channels/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: channelQuery }),
      });
      const data = await res.json();
      setChannelResults(data.channels);
    } catch {
      alert("채널 검색 실패");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg width="16" height="16" fill="none" stroke="#3182f6" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
        </div>
        <h2 className="text-sm font-bold text-toss-gray-900">제목 생성 설정</h2>
      </div>

      {/* Title Style */}
      <div>
        <label className="text-[10px] text-toss-gray-400 font-semibold uppercase tracking-wider block mb-2">제목 스타일</label>
        <select
          value={titleStyle}
          onChange={(e) => setTitleStyle(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-toss-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue/50 transition-all appearance-none bg-white"
        >
          {STYLES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Reference Channels */}
      <div>
        <label className="text-[10px] text-toss-gray-400 font-semibold uppercase tracking-wider block mb-2">참고 채널</label>

        {refChannels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {refChannels.map((rc) => (
              <span
                key={rc.channel_id}
                className="inline-flex items-center gap-2 bg-blue-50 text-toss-blue text-xs font-medium px-3 py-1.5 rounded-lg"
              >
                {rc.thumbnail && <img src={rc.thumbnail} alt="" className="w-4 h-4 rounded-full" />}
                {rc.name}
                <button onClick={() => removeRefChannel(rc.channel_id)} className="text-toss-blue/50 hover:text-toss-blue">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={channelQuery}
            onChange={(e) => setChannelQuery(e.target.value)}
            placeholder="채널명 검색"
            className="flex-1 px-4 py-2.5 rounded-xl border border-toss-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue/50 transition-all"
            onKeyDown={(e) => e.key === "Enter" && searchChannels()}
          />
          <button
            onClick={searchChannels}
            disabled={searching}
            className="bg-toss-gray-100 text-toss-gray-600 text-sm font-medium px-4 rounded-xl hover:bg-toss-gray-200 transition-colors disabled:opacity-50"
          >
            {searching ? "..." : "검색"}
          </button>
        </div>

        {channelResults.length > 0 && (
          <div className="mt-2 bg-toss-gray-50 rounded-xl divide-y divide-toss-gray-100 overflow-hidden max-h-44 overflow-y-auto">
            {channelResults.map((ch) => (
              <div
                key={ch.channel_id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white cursor-pointer transition-colors"
                onClick={() => {
                  addRefChannel({ channel_id: ch.channel_id, name: ch.name, thumbnail: ch.thumbnail });
                  setChannelResults([]);
                  setChannelQuery("");
                }}
              >
                {ch.thumbnail && <img src={ch.thumbnail} alt="" className="w-8 h-8 rounded-full" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-toss-gray-700 truncate">{ch.name}</p>
                  <p className="text-[10px] text-toss-gray-400">구독자 {ch.subscriber_display}</p>
                </div>
                <span className="text-toss-blue text-xs font-medium">+ 추가</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extra Request */}
      <div>
        <label className="text-[10px] text-toss-gray-400 font-semibold uppercase tracking-wider block mb-2">추가 요청사항 (선택)</label>
        <input
          value={extraRequest}
          onChange={(e) => setExtraRequest(e.target.value)}
          placeholder="예: 20대 타겟으로, 반말 사용, 이모지 넣어줘"
          className="w-full px-4 py-2.5 rounded-xl border border-toss-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue/50 transition-all"
        />
      </div>
    </div>
  );
}
