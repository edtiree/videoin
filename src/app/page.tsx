"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AIRecommendation from "@/components/home/AIRecommendation";

type FeedTab = "jobs" | "editors";

const MAIN_CATEGORIES = [
  { key: "영상 편집", label: "영상 편집", icon: "🎬", active: true },
  { key: "영상 촬영", label: "영상 촬영", icon: "📸", active: true },
  { key: "썸네일", label: "썸네일", icon: "🖼️", active: true },
  { key: "모션그래픽", label: "모션그래픽", icon: "✨", active: true },
  { key: "스크립트", label: "스크립트", icon: "✏️", active: true },
  { key: "성우", label: "성우", icon: "🎙️", active: true },
  { key: "출연자", label: "출연자", icon: "🎭", active: true },
  { key: "스튜디오", label: "스튜디오", icon: "🏠", active: true },
];

// 플레이스홀더 추천 편집자
const RECOMMENDED_EDITORS = [
  { id: "1", name: "편집왕민수", desc: "유튜브 롱폼 편집 전문", rate: "10만원~", rating: 4.8, reviews: 23 },
  { id: "2", name: "썸네일장인", desc: "클릭을 부르는 썸네일", rate: "5만원~", rating: 4.9, reviews: 45 },
  { id: "3", name: "모션마스터", desc: "인트로/모션그래픽 전문가", rate: "40만원~", rating: 4.7, reviews: 12 },
  { id: "4", name: "촬영감독A", desc: "서울 기반 인터뷰/브이로그", rate: "25만원~", rating: 4.6, reviews: 8 },
];

// 플레이스홀더 최신 공고
const RECENT_JOBS = [
  { id: "1", title: "유튜브 롱폼 편집자 구합니다", category: "영상 편집", budget: "건당 15~25만원", author: "먹방크리에이터", createdAt: "방금 전" },
  { id: "2", title: "뷰티 유튜브 썸네일 디자이너", category: "썸네일", budget: "건당 3~5만원", author: "뷰티채널", createdAt: "1시간 전" },
  { id: "3", title: "브이로그 촬영 스태프 (서울)", category: "영상 촬영", budget: "일당 20만원", author: "여행채널", createdAt: "3시간 전" },
  { id: "4", title: "인트로/아웃트로 모션그래픽", category: "모션그래픽", budget: "건당 30~50만원", author: "테크리뷰어", createdAt: "5시간 전" },
  { id: "5", title: "주 3회 숏폼 편집자", category: "영상 편집", budget: "월 80~120만원", author: "교육채널", createdAt: "어제" },
  { id: "6", title: "제품 촬영 전문가 (경기)", category: "영상 촬영", budget: "건당 30만원", author: "쇼핑몰", createdAt: "어제" },
];

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, openLoginModal, profile } = useAuth();
  const [tab, setTab] = useState<FeedTab>("jobs");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (profile?.role?.includes("편집자/스태프")) setTab("jobs");
    else if (profile?.role?.includes("크리에이터/사장")) setTab("editors");
  }, [profile]);

  return (
    <div className="max-w-[960px] mx-auto px-4 py-5">
      {/* 검색바 */}
      <div className="relative mb-5 md:max-w-[480px]">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-300" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim()) {
              router.push(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
          placeholder="어떤 전문가가 필요하세요?"
          className="w-full h-[48px] pl-12 pr-4 rounded-xl bg-white border border-toss-gray-100 text-[15px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue transition"
        />
      </div>

      {/* 카테고리 아이콘 그리드 — 클릭 시 해당 카테고리 목록 페이지로 이동 */}
      <div className="bg-white rounded-2xl border border-toss-gray-100 p-4 mb-6">
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {MAIN_CATEGORIES.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                if (!item.active) return;
                router.push(`/editors?category=${encodeURIComponent(item.key)}`);
              }}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition relative ${
                item.active ? "hover:bg-toss-gray-50 active:bg-blue-50" : "opacity-50 cursor-default"
              }`}
            >
              <span className="text-[28px]">{item.icon}</span>
              <span className="text-[11px] font-medium text-toss-gray-600">{item.label}</span>
              {!item.active && (
                <span className="absolute top-1 right-1 text-[8px] bg-toss-gray-200 text-toss-gray-400 px-1 rounded">준비중</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* AI 추천 섹션 */}
      <AIRecommendation />

      {/* 이런 전문가 어때요? — 크몽 스타일 편집자 추천 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[18px] font-bold text-toss-gray-900">이런 전문가 어때요?</h2>
          <button onClick={() => router.push("/editors")} className="text-[13px] text-toss-gray-400 hover:text-toss-gray-600">
            더보기 &gt;
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {RECOMMENDED_EDITORS.map((editor) => (
            <button
              key={editor.id}
              onClick={() => isLoggedIn ? router.push("/editors") : openLoginModal()}
              className="bg-white rounded-2xl border border-toss-gray-100 p-4 text-left hover:border-toss-gray-200 transition"
            >
              <div className="w-10 h-10 bg-toss-gray-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-[16px] font-bold text-toss-gray-400">{editor.name[0]}</span>
              </div>
              <p className="text-[14px] font-semibold text-toss-gray-900 mb-0.5">{editor.name}</p>
              <p className="text-[12px] text-toss-gray-400 mb-2 line-clamp-1">{editor.desc}</p>
              <p className="text-[14px] font-bold text-toss-gray-900 mb-1">{editor.rate}</p>
              <div className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span className="text-[12px] text-toss-gray-500">{editor.rating} ({editor.reviews})</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 탭: 최신 공고 / 편집자 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("jobs")}
          className={`flex-1 h-[42px] rounded-xl text-[14px] font-semibold transition ${
            tab === "jobs" ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
          }`}
        >
          최신 공고
        </button>
        <button
          onClick={() => setTab("editors")}
          className={`flex-1 h-[42px] rounded-xl text-[14px] font-semibold transition ${
            tab === "editors" ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
          }`}
        >
          인기 편집자
        </button>
      </div>

      {/* 최신 공고 피드 */}
      {tab === "jobs" && (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 mb-4">
          {RECENT_JOBS.map((job) => (
            <div
              key={job.id}
              onClick={() => isLoggedIn ? router.push("/jobs") : openLoginModal()}
              className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 transition"
            >
              <span className="inline-block text-[12px] font-medium text-toss-blue bg-blue-50 px-2 py-0.5 rounded-md mb-2">{job.category}</span>
              <h3 className="text-[16px] font-semibold text-toss-gray-900 mb-1 truncate">{job.title}</h3>
              <p className="text-[13px] text-toss-gray-500 mb-2">{job.author}</p>
              <div className="flex items-center gap-3 text-[13px] text-toss-gray-400">
                <span className="font-medium text-toss-gray-700">{job.budget}</span>
                <span>·</span>
                <span>{job.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 인기 편집자 피드 */}
      {tab === "editors" && (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 mb-4">
          {RECOMMENDED_EDITORS.map((editor) => (
            <div
              key={editor.id}
              onClick={() => isLoggedIn ? router.push("/editors") : openLoginModal()}
              className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[18px] font-bold text-toss-gray-400">{editor.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] font-semibold text-toss-gray-900 mb-0.5">{editor.name}</h3>
                  <p className="text-[13px] text-toss-gray-400 mb-1">{editor.desc}</p>
                  <p className="text-[14px] font-bold text-toss-gray-900 mb-1">{editor.rate}</p>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span className="text-[12px] text-toss-gray-500">{editor.rating} ({editor.reviews})</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 공고/편집자 더보기 */}
      <button
        onClick={() => router.push(tab === "jobs" ? "/jobs" : "/editors")}
        className="w-full h-[48px] rounded-xl border border-toss-gray-200 text-[14px] font-medium text-toss-gray-500 hover:bg-toss-gray-50 transition mb-6"
      >
        {tab === "jobs" ? "공고 더보기" : "편집자 더보기"}
      </button>

      {/* CTA 배너 */}
      <div className="bg-gradient-to-r from-toss-blue to-indigo-500 rounded-2xl p-6 text-white mb-6">
        <h3 className="text-[18px] font-bold mb-1">
          {tab === "jobs" ? "나에게 맞는 공고가 없나요?" : "편집자를 찾고 계신가요?"}
        </h3>
        <p className="text-[14px] opacity-80 mb-4">
          {tab === "jobs" ? "포트폴리오를 등록하고 AI 매칭을 받아보세요" : "공고를 올리면 AI가 딱 맞는 편집자를 추천해요"}
        </p>
        <button
          onClick={() => isLoggedIn ? router.push(tab === "jobs" ? "/portfolio/edit" : "/jobs/new") : openLoginModal()}
          className="bg-white text-toss-blue font-semibold text-[14px] px-5 py-2.5 rounded-xl hover:bg-blue-50 transition"
        >
          {tab === "jobs" ? "포트폴리오 등록하기" : "공고 올리기"}
        </button>
      </div>

      {/* 도구 유도 */}
      <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 mb-8 md:flex md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-3 mb-3 md:mb-0">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-toss-gray-900">AI 영상 제작 도구</h4>
            <p className="text-[12px] text-toss-gray-400">제목 생성기, 쇼츠 제작기 외 다양한 도구</p>
          </div>
        </div>
        <button
          onClick={() => isLoggedIn ? router.push("/tools") : openLoginModal()}
          className="w-full md:w-auto h-[40px] px-5 rounded-xl border border-toss-gray-100 text-[13px] font-medium text-toss-gray-500 hover:bg-toss-gray-50 transition"
        >
          AI 도구 둘러보기
        </button>
      </div>
    </div>
  );
}
