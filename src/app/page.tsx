"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AIRecommendation from "@/components/home/AIRecommendation";
import { CATEGORIES } from "@/lib/categories";

type FeedTab = "jobs" | "editors";

const RECOMMENDED_EDITORS = [
  { id: "1", name: "편집왕민수", desc: "유튜브 롱폼 편집 전문", rate: "10만원~", rating: 4.8, reviews: 23 },
  { id: "2", name: "썸네일장인", desc: "클릭을 부르는 썸네일", rate: "5만원~", rating: 4.9, reviews: 45 },
  { id: "3", name: "모션마스터", desc: "인트로/모션그래픽 전문가", rate: "40만원~", rating: 4.7, reviews: 12 },
  { id: "4", name: "촬영감독A", desc: "서울 기반 인터뷰/브이로그", rate: "25만원~", rating: 4.6, reviews: 8 },
];

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

  useEffect(() => {
    if (profile?.role?.includes("편집자/스태프")) setTab("jobs");
    else if (profile?.role?.includes("크리에이터/사장")) setTab("editors");
  }, [profile]);

  return (
    <div>
      {/* ====== PC 히어로 섹션 (md 이상에서만 표시) ====== */}
      <div className="hidden md:block bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-toss-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex items-start justify-between gap-12">
            {/* 왼쪽: 텍스트 */}
            <div className="flex-1 max-w-[600px]">
              <h1 className="text-[36px] font-extrabold text-toss-gray-900 leading-tight mb-3">
                영상 전문가가 필요한 순간,<br />
                딱 맞는 전문가를 찾아보세요
              </h1>
              <p className="text-[16px] text-toss-gray-500">
                영상 편집, 촬영, 썸네일, 모션그래픽 등 8개 분야 전문가를 만나보세요
              </p>
            </div>

            {/* 오른쪽: CTA 카드 */}
            <div className="w-[360px] flex-shrink-0">
              <div className="bg-gradient-to-br from-toss-blue to-indigo-500 rounded-2xl p-8 text-white shadow-lg">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <h3 className="text-[20px] font-bold mb-2">AI 영상 제작 도구</h3>
                <p className="text-[14px] opacity-80 mb-6">제목 생성, 쇼츠 제작, 카드뉴스 등<br />다양한 AI 도구를 무료로 체험하세요</p>
                <button
                  onClick={() => isLoggedIn ? router.push("/tools") : openLoginModal()}
                  className="bg-white text-toss-blue font-semibold text-[14px] px-6 py-3 rounded-xl hover:bg-blue-50 transition"
                >
                  도구 둘러보기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== 메인 콘텐츠 ====== */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-5">

        {/* 카테고리 아이콘 그리드 */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-4 md:p-6 mb-6">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-4">
            {CATEGORIES.map((item) => (
              <button
                key={item.key}
                onClick={() => router.push(`/editors?category=${encodeURIComponent(item.key)}`)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition hover:bg-toss-gray-50 active:bg-blue-50"
              >
                <span className="text-[28px] md:text-[36px]">{item.icon}</span>
                <span className="text-[11px] md:text-[13px] font-medium text-toss-gray-600">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 광고 매칭 배너 */}
        <button
          onClick={() => router.push("/sponsorship")}
          className="w-full bg-gradient-to-r from-toss-blue to-blue-400 rounded-2xl p-5 mb-6 text-left hover:opacity-95 transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-white/70 mb-1">광고 매칭</p>
              <h3 className="text-[17px] md:text-[20px] font-bold text-white mb-1">브랜드 × 크리에이터 연결</h3>
              <p className="text-[13px] text-white/80">YouTube · Instagram · TikTok 광고 매칭</p>
            </div>
            <span className="text-[36px]">🤝</span>
          </div>
        </button>

        {/* AI 추천 섹션 */}
        <AIRecommendation />

        {/* 이런 전문가 어때요? */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] md:text-[22px] font-bold text-toss-gray-900">이런 전문가 어때요?</h2>
            <button onClick={() => router.push("/editors")} className="text-[13px] text-toss-gray-400 hover:text-toss-gray-600">
              더보기 &gt;
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {RECOMMENDED_EDITORS.map((editor) => (
              <button
                key={editor.id}
                onClick={() => isLoggedIn ? router.push("/editors") : openLoginModal()}
                className="bg-white rounded-2xl border border-toss-gray-100 p-4 md:p-5 text-left hover:border-toss-gray-200 hover:shadow-sm transition"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 bg-toss-gray-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-[16px] md:text-[18px] font-bold text-toss-gray-400">{editor.name[0]}</span>
                </div>
                <p className="text-[14px] md:text-[15px] font-semibold text-toss-gray-900 mb-0.5">{editor.name}</p>
                <p className="text-[12px] text-toss-gray-400 mb-2 line-clamp-1">{editor.desc}</p>
                <p className="text-[14px] md:text-[16px] font-bold text-toss-gray-900 mb-1">{editor.rate}</p>
                <div className="flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span className="text-[12px] text-toss-gray-500">{editor.rating} ({editor.reviews})</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 탭: 최신 공고 / 인기 편집자 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("jobs")}
            className={`flex-1 md:flex-none md:px-6 h-[42px] rounded-xl text-[14px] font-semibold transition ${
              tab === "jobs" ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
            }`}
          >
            최신 공고
          </button>
          <button
            onClick={() => setTab("editors")}
            className={`flex-1 md:flex-none md:px-6 h-[42px] rounded-xl text-[14px] font-semibold transition ${
              tab === "editors" ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
            }`}
          >
            인기 편집자
          </button>
        </div>

        {/* 최신 공고 */}
        {tab === "jobs" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {RECENT_JOBS.map((job) => (
              <div
                key={job.id}
                onClick={() => isLoggedIn ? router.push("/jobs") : openLoginModal()}
                className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 hover:shadow-sm transition"
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

        {/* 인기 편집자 */}
        {tab === "editors" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {RECOMMENDED_EDITORS.map((editor) => (
              <div
                key={editor.id}
                onClick={() => isLoggedIn ? router.push("/editors") : openLoginModal()}
                className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 hover:shadow-sm transition"
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

        {/* 더보기 */}
        <button
          onClick={() => router.push(tab === "jobs" ? "/jobs" : "/editors")}
          className="w-full md:w-auto md:px-8 h-[48px] rounded-xl border border-toss-gray-200 text-[14px] font-medium text-toss-gray-500 hover:bg-toss-gray-50 transition mb-8"
        >
          {tab === "jobs" ? "공고 더보기" : "편집자 더보기"}
        </button>

        {/* 모바일 CTA 배너 (PC는 히어로에 포함) */}
        <div className="md:hidden bg-gradient-to-r from-toss-blue to-indigo-500 rounded-2xl p-6 text-white mb-6">
          <h3 className="text-[18px] font-bold mb-1">AI 영상 제작 도구</h3>
          <p className="text-[14px] opacity-80 mb-4">제목 생성기, 쇼츠 제작기 외 다양한 도구</p>
          <button
            onClick={() => isLoggedIn ? router.push("/tools") : openLoginModal()}
            className="bg-white text-toss-blue font-semibold text-[14px] px-5 py-2.5 rounded-xl hover:bg-blue-50 transition"
          >
            도구 둘러보기
          </button>
        </div>
      </div>
    </div>
  );
}
