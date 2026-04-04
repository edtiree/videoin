"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AIRecommendation from "@/components/home/AIRecommendation";

type FeedTab = "jobs" | "editors";

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "editing", label: "영상 편집", active: true },
  { key: "filming", label: "영상 촬영", active: true },
  { key: "thumbnail", label: "썸네일", active: true },
  { key: "motion", label: "모션그래픽", active: true },
  { key: "script", label: "스크립트 작가", active: false },
  { key: "voice", label: "성우", active: false },
  { key: "actor", label: "출연자/배우", active: false },
  { key: "studio", label: "스튜디오 대여", active: false },
];

// 플레이스홀더 공고 데이터
const PLACEHOLDER_JOBS = [
  { id: "1", title: "유튜브 롱폼 편집자 구합니다", category: "영상 편집", budget: "건당 15~25만원", region: "재택", isRemote: true, deadline: "상시채용", author: "먹방크리에이터", createdAt: "방금 전" },
  { id: "2", title: "뷰티 유튜브 썸네일 디자이너", category: "썸네일", budget: "건당 3~5만원", region: "재택", isRemote: true, deadline: "2026-04-30", author: "뷰티채널", createdAt: "1시간 전" },
  { id: "3", title: "브이로그 촬영 스태프 (서울)", category: "영상 촬영", budget: "일당 20만원", region: "서울", isRemote: false, deadline: "2026-04-15", author: "여행채널", createdAt: "3시간 전" },
  { id: "4", title: "인트로/아웃트로 모션그래픽", category: "모션그래픽", budget: "건당 30~50만원", region: "재택", isRemote: true, deadline: "상시채용", author: "테크리뷰어", createdAt: "5시간 전" },
  { id: "5", title: "주 3회 숏폼 편집자", category: "영상 편집", budget: "월 80~120만원", region: "재택", isRemote: true, deadline: "2026-04-20", author: "교육채널", createdAt: "어제" },
];

// 플레이스홀더 편집자 데이터
const PLACEHOLDER_EDITORS = [
  { id: "1", name: "편집의신", category: "영상 편집", tools: ["프리미어프로", "에프터이펙트"], experience: 5, rate: "분당 1만원", rating: 4.8, reviews: 23, available: true },
  { id: "2", name: "썸네일장인", category: "썸네일", tools: ["포토샵", "일러스트"], experience: 3, rate: "건당 5만원", rating: 4.9, reviews: 45, available: true },
  { id: "3", name: "모션마스터", category: "모션그래픽", tools: ["에프터이펙트", "시네마4D"], experience: 7, rate: "건당 40만원", rating: 4.7, reviews: 12, available: false },
  { id: "4", name: "촬영감독A", category: "영상 촬영", tools: ["소니 FX3", "DJI RS3"], experience: 4, rate: "일당 25만원", rating: 4.6, reviews: 8, available: true },
  { id: "5", name: "올라운더", category: "영상 편집", tools: ["프리미어프로", "다빈치"], experience: 2, rate: "분당 8천원", rating: 4.5, reviews: 15, available: true },
];

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, openLoginModal, profile } = useAuth();
  const [tab, setTab] = useState<FeedTab>("jobs");
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 로그인된 유저의 역할에 따라 기본 탭 설정
  useEffect(() => {
    if (profile?.role?.includes("편집자/스태프")) {
      setTab("jobs");
    } else if (profile?.role?.includes("크리에이터/사장")) {
      setTab("editors");
    }
  }, [profile]);

  const filteredJobs = PLACEHOLDER_JOBS.filter((j) => {
    if (category !== "all" && j.category !== CATEGORIES.find((c) => c.key === category)?.label) return false;
    if (searchQuery && !j.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredEditors = PLACEHOLDER_EDITORS.filter((e) => {
    if (category !== "all" && e.category !== CATEGORIES.find((c) => c.key === category)?.label) return false;
    if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
          placeholder="편집자, 썸네일, 촬영 찾기"
          className="w-full h-[48px] pl-12 pr-4 rounded-xl bg-white border border-toss-gray-100 text-[15px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue transition"
        />
      </div>

      {/* AI 추천 섹션 */}
      <AIRecommendation />

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setTab("jobs"); setCategory("all"); }}
          className={`flex-1 h-[42px] rounded-xl text-[14px] font-semibold transition ${
            tab === "jobs"
              ? "bg-toss-gray-900 text-white"
              : "bg-white border border-toss-gray-100 text-toss-gray-500"
          }`}
        >
          공고 찾기
        </button>
        <button
          onClick={() => { setTab("editors"); setCategory("all"); }}
          className={`flex-1 h-[42px] rounded-xl text-[14px] font-semibold transition ${
            tab === "editors"
              ? "bg-toss-gray-900 text-white"
              : "bg-white border border-toss-gray-100 text-toss-gray-500"
          }`}
        >
          편집자 찾기
        </button>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => c.key === "all" || c.active ? setCategory(c.key) : null}
            className={`flex-shrink-0 px-4 h-[34px] rounded-full text-[13px] font-medium transition whitespace-nowrap ${
              category === c.key
                ? "bg-toss-gray-900 text-white"
                : c.active !== false
                  ? "bg-white border border-toss-gray-100 text-toss-gray-500 hover:border-toss-gray-200"
                  : "bg-toss-gray-50 border border-toss-gray-100 text-toss-gray-300 cursor-default"
            }`}
          >
            {c.label}
            {c.active === false && (
              <span className="ml-1 text-[10px] bg-toss-gray-200 text-toss-gray-400 px-1.5 py-0.5 rounded-full">
                준비중
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 피드 */}
      {tab === "jobs" ? (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => isLoggedIn ? router.push("/jobs") : openLoginModal()}
              className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[12px] font-medium text-toss-blue bg-blue-50 px-2 py-0.5 rounded-md mb-2">
                    {job.category}
                  </span>
                  <h3 className="text-[16px] font-semibold text-toss-gray-900 mb-1 truncate">{job.title}</h3>
                  <p className="text-[13px] text-toss-gray-500">{job.author}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-[13px] text-toss-gray-400">
                <span className="font-medium text-toss-gray-700">{job.budget}</span>
                <span>·</span>
                <span>{job.isRemote ? "재택" : job.region}</span>
                <span>·</span>
                <span>{job.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {filteredEditors.map((editor) => (
            <div
              key={editor.id}
              onClick={() => isLoggedIn ? router.push("/editors") : openLoginModal()}
              className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 transition"
            >
              <div className="flex items-start gap-4">
                {/* 아바타 */}
                <div className="w-12 h-12 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[18px] font-bold text-toss-gray-400">{editor.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[16px] font-semibold text-toss-gray-900">{editor.name}</h3>
                    {editor.available ? (
                      <span className="text-[11px] font-medium text-toss-green bg-green-50 px-1.5 py-0.5 rounded">가능</span>
                    ) : (
                      <span className="text-[11px] font-medium text-toss-gray-400 bg-toss-gray-50 px-1.5 py-0.5 rounded">마감</span>
                    )}
                  </div>
                  <span className="inline-block text-[12px] font-medium text-toss-blue bg-blue-50 px-2 py-0.5 rounded-md mb-2">
                    {editor.category}
                  </span>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {editor.tools.map((tool) => (
                      <span key={tool} className="text-[11px] text-toss-gray-400 bg-toss-gray-50 px-2 py-0.5 rounded">
                        {tool}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-[13px] text-toss-gray-400">
                    <span className="font-medium text-toss-gray-700">{editor.rate}</span>
                    <span>·</span>
                    <span>경력 {editor.experience}년</span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {editor.rating} ({editor.reviews})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA 배너 */}
      <div className="mt-8 mb-4 bg-gradient-to-r from-toss-blue to-indigo-500 rounded-2xl p-6 text-white">
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

      {/* AI 툴 유도 */}
      <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 mb-8 md:flex md:items-center md:justify-between md:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h4 className="text-[15px] font-semibold text-toss-gray-900">AI 영상 제작 도구</h4>
            <p className="text-[12px] text-toss-gray-400">제목 생성기, 쇼츠 제작기 외 다양한 AI 툴</p>
          </div>
        </div>
        <button
          onClick={() => isLoggedIn ? router.push("/tools") : openLoginModal()}
          className="w-full h-[40px] rounded-xl border border-toss-gray-100 text-[13px] font-medium text-toss-gray-500 hover:bg-toss-gray-50 transition"
        >
          AI 도구 둘러보기
        </button>
      </div>
    </div>
  );
}
