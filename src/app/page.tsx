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

/* ── 카테고리별 추천 전문가 목업 데이터 ── */
const CATEGORY_EXPERTS: Record<string, Array<{
  id: string; name: string; title: string; spec: string;
  experience: string; rating: number; reviews: number; colors: string[];
}>> = {
  "영상 편집": [
    { id: "ce1", name: "편집왕민수", title: "유튜브 롱폼 편집", spec: "유튜브 영상", experience: "경력 5년", rating: 4.8, reviews: 23, colors: ["from-blue-400 to-blue-600", "from-indigo-400 to-indigo-600", "from-sky-400 to-sky-600"] },
    { id: "ce2", name: "숏폼장인", title: "숏폼·릴스 전문 편집", spec: "숏폼 영상", experience: "경력 3년", rating: 4.9, reviews: 31, colors: ["from-violet-400 to-violet-600", "from-purple-400 to-purple-600", "from-fuchsia-400 to-fuchsia-600"] },
    { id: "ce3", name: "광고편집러", title: "브랜드 광고 영상 편집", spec: "광고·홍보 영상", experience: "경력 7년", rating: 4.7, reviews: 18, colors: ["from-rose-400 to-rose-600", "from-pink-400 to-pink-600", "from-red-400 to-red-600"] },
  ],
  "영상 촬영": [
    { id: "ce4", name: "촬영감독A", title: "인터뷰·브이로그 촬영", spec: "유튜브 촬영", experience: "경력 8년", rating: 4.6, reviews: 15, colors: ["from-emerald-400 to-emerald-600", "from-green-400 to-green-600", "from-teal-400 to-teal-600"] },
    { id: "ce5", name: "드론파일럿", title: "항공 촬영 전문가", spec: "드론 촬영", experience: "경력 4년", rating: 4.8, reviews: 22, colors: ["from-cyan-400 to-cyan-600", "from-sky-400 to-sky-600", "from-blue-400 to-blue-600"] },
    { id: "ce6", name: "제품촬영Pro", title: "제품·음식 사진/영상", spec: "제품 촬영", experience: "경력 6년", rating: 4.9, reviews: 40, colors: ["from-amber-400 to-amber-600", "from-orange-400 to-orange-600", "from-yellow-400 to-yellow-600"] },
  ],
  "썸네일": [
    { id: "ce7", name: "썸네일장인", title: "클릭률 높이는 썸네일", spec: "유튜브 썸네일", experience: "경력 4년", rating: 4.9, reviews: 45, colors: ["from-orange-400 to-orange-600", "from-red-400 to-red-600", "from-amber-400 to-amber-600"] },
    { id: "ce8", name: "디자인마스터", title: "채널아트·배너 디자인", spec: "채널아트", experience: "경력 6년", rating: 4.7, reviews: 28, colors: ["from-pink-400 to-pink-600", "from-rose-400 to-rose-600", "from-fuchsia-400 to-fuchsia-600"] },
    { id: "ce9", name: "포토에디터", title: "제품 사진 보정 전문", spec: "사진 보정", experience: "경력 3년", rating: 4.5, reviews: 12, colors: ["from-teal-400 to-teal-600", "from-emerald-400 to-emerald-600", "from-green-400 to-green-600"] },
  ],
  "모션그래픽": [
    { id: "ce10", name: "모션마스터", title: "인트로·로고 애니메이션", spec: "인트로·로고", experience: "경력 7년", rating: 4.7, reviews: 12, colors: ["from-purple-400 to-purple-600", "from-violet-400 to-violet-600", "from-indigo-400 to-indigo-600"] },
    { id: "ce11", name: "3D아티스트", title: "3D 모델링·렌더링", spec: "3D 모델링", experience: "경력 5년", rating: 4.8, reviews: 19, colors: ["from-blue-400 to-blue-600", "from-cyan-400 to-cyan-600", "from-sky-400 to-sky-600"] },
    { id: "ce12", name: "타이포장인", title: "키네틱 타이포그래피", spec: "타이포그래피", experience: "경력 4년", rating: 4.6, reviews: 9, colors: ["from-fuchsia-400 to-fuchsia-600", "from-pink-400 to-pink-600", "from-rose-400 to-rose-600"] },
  ],
  "스크립트": [
    { id: "ce13", name: "대본작가K", title: "유튜브 대본·기획", spec: "유튜브 대본", experience: "경력 3년", rating: 4.6, reviews: 17, colors: ["from-lime-400 to-lime-600", "from-green-400 to-green-600", "from-emerald-400 to-emerald-600"] },
    { id: "ce14", name: "카피라이터", title: "광고 카피·슬로건", spec: "광고 카피", experience: "경력 8년", rating: 4.9, reviews: 35, colors: ["from-amber-400 to-amber-600", "from-yellow-400 to-yellow-600", "from-orange-400 to-orange-600"] },
  ],
  "성우": [
    { id: "ce15", name: "보이스액터", title: "내레이션·광고 성우", spec: "내레이션", experience: "경력 10년", rating: 4.9, reviews: 52, colors: ["from-red-400 to-red-600", "from-rose-400 to-rose-600", "from-pink-400 to-pink-600"] },
    { id: "ce16", name: "더빙전문가", title: "캐릭터 더빙·게임 성우", spec: "캐릭터 더빙", experience: "경력 6년", rating: 4.7, reviews: 21, colors: ["from-indigo-400 to-indigo-600", "from-blue-400 to-blue-600", "from-violet-400 to-violet-600"] },
  ],
  "출연자": [
    { id: "ce17", name: "모델예진", title: "패션·뷰티 모델", spec: "모델", experience: "경력 4년", rating: 4.8, reviews: 14, colors: ["from-pink-400 to-pink-600", "from-fuchsia-400 to-fuchsia-600", "from-rose-400 to-rose-600"] },
    { id: "ce18", name: "MC승현", title: "행사 MC·쇼호스트", spec: "MC·쇼호스트", experience: "경력 5년", rating: 4.6, reviews: 11, colors: ["from-sky-400 to-sky-600", "from-blue-400 to-blue-600", "from-cyan-400 to-cyan-600"] },
  ],
  "스튜디오": [
    { id: "ce19", name: "스튜디오H", title: "크로마키·촬영 스튜디오", spec: "촬영 스튜디오", experience: "운영 3년", rating: 4.7, reviews: 33, colors: ["from-gray-400 to-gray-600", "from-slate-400 to-slate-600", "from-zinc-400 to-zinc-600"] },
    { id: "ce20", name: "녹음실S", title: "전문 녹음·믹싱 스튜디오", spec: "녹음 스튜디오", experience: "운영 7년", rating: 4.9, reviews: 27, colors: ["from-stone-400 to-stone-600", "from-neutral-400 to-neutral-600", "from-gray-400 to-gray-600"] },
  ],
};

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
  const [expertCat, setExpertCat] = useState("영상 편집");

  useEffect(() => {
    if (profile?.role?.includes("편집자/스태프")) setTab("jobs");
    else if (profile?.role?.includes("크리에이터/사장")) setTab("editors");
  }, [profile]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div>
      {/* ====== PC 히어로 섹션 (md 이상에서만 표시) ====== */}
      <div className="hidden md:block bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-toss-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="flex items-start justify-between gap-12">
            {/* 왼쪽: 텍스트 + 검색 */}
            <div className="flex-1 max-w-[600px]">
              <h1 className="text-[36px] font-extrabold text-toss-gray-900 leading-tight mb-3">
                영상 전문가가 필요한 순간,<br />
                딱 맞는 전문가를 찾아보세요
              </h1>
              <p className="text-[16px] text-toss-gray-500 mb-8">
                영상 편집, 촬영, 썸네일, 모션그래픽 등 8개 분야 전문가를 만나보세요
              </p>

              {/* 검색바 */}
              <div className="relative mb-6">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="어떤 전문가가 필요하세요?"
                  className="w-full h-[56px] pl-6 pr-14 rounded-2xl bg-white border border-toss-gray-200 text-[16px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue shadow-sm transition"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-toss-blue flex items-center justify-center hover:bg-[var(--blue-hover)] transition"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </button>
              </div>

              {/* 인기 검색어 */}
              <div className="flex flex-wrap gap-2">
                {["유튜브 편집", "썸네일", "숏폼", "모션그래픽", "인터뷰 촬영"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => router.push(`/jobs?search=${encodeURIComponent(tag)}`)}
                    className="px-4 py-2 rounded-full bg-white border border-toss-gray-100 text-[13px] text-toss-gray-500 hover:border-toss-blue hover:text-toss-blue transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
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

      {/* ====== 모바일 검색바 (md 미만에서만 표시) ====== */}
      <div className="md:hidden px-4 pt-5 pb-2">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-300" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="어떤 전문가가 필요하세요?"
            className="w-full h-[48px] pl-12 pr-4 rounded-xl bg-white border border-toss-gray-100 text-[15px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue transition"
          />
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

        {/* ====== 오늘의 추천 전문가 ====== */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] md:text-[22px] font-bold text-toss-gray-900">오늘의 추천 전문가</h2>
            <button
              onClick={() => router.push(`/editors?category=${encodeURIComponent(expertCat)}`)}
              className="text-[13px] text-toss-gray-400 hover:text-toss-gray-600"
            >
              더보기 &gt;
            </button>
          </div>

          {/* 카테고리 탭 - 가로 스크롤 */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setExpertCat(cat.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition whitespace-nowrap ${
                  expertCat === cat.key
                    ? "bg-toss-gray-900 text-white"
                    : "bg-white border border-toss-gray-200 text-toss-gray-500 hover:border-toss-gray-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 전문가 카드 - 가로 스크롤 */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:-mx-6 md:px-6 snap-x snap-mandatory">
            {(CATEGORY_EXPERTS[expertCat] || []).map((expert) => (
              <button
                key={expert.id}
                onClick={() => isLoggedIn ? router.push(`/editors?category=${encodeURIComponent(expertCat)}`) : openLoginModal()}
                className="flex-shrink-0 w-[85vw] max-w-[480px] md:w-[400px] bg-white rounded-2xl border border-toss-gray-100 p-5 text-left hover:border-toss-gray-200 hover:shadow-md transition snap-start"
              >
                {/* 전문 분야 뱃지 */}
                <span className="inline-block text-[12px] font-medium text-toss-blue bg-blue-50 px-2.5 py-1 rounded-lg mb-3">
                  {expert.spec}
                </span>

                {/* 이름 + 경력 */}
                <h3 className="text-[18px] font-bold text-toss-gray-900 mb-1">{expert.name}</h3>
                <p className="text-[13px] text-toss-gray-400 mb-1">{expert.title}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[13px] text-toss-gray-500">{expert.experience}</span>
                  <span className="text-toss-gray-200">·</span>
                  <div className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span className="text-[12px] text-toss-gray-500">{expert.rating} ({expert.reviews})</span>
                  </div>
                </div>

                {/* 포트폴리오 썸네일 (플레이스홀더) */}
                <div className="grid grid-cols-3 gap-2">
                  {expert.colors.map((color, i) => (
                    <div key={i} className={`aspect-[4/3] rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    </div>
                  ))}
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
