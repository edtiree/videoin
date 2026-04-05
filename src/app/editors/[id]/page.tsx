"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import StarRating from "@/components/common/StarRating";
import TopNav from "@/components/TopNav";

interface PortfolioVideo {
  id: string;
  type: string;
  youtube_url: string | null;
  external_url: string | null;
  title: string | null;
  thumbnail_url: string | null;
  description: string | null;
}

interface Review {
  id: string;
  rating: number;
  content: string | null;
  created_at: string;
  users?: { nickname: string; profile_image: string | null };
}

interface EditorDetail {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  categories: string[];
  tools: string[];
  youtube_channel_url: string | null;
  youtube_channel_name: string | null;
  experience_years: number | null;
  hourly_rate: number | null;
  available: boolean;
  rating_avg: number;
  review_count: number;
  portfolio_videos: PortfolioVideo[];
  reviews: Review[];
  users?: { nickname: string; profile_image: string | null };
}

type Tab = "portfolio" | "description" | "info" | "reviews";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear().toString().slice(2)}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function EditorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [editor, setEditor] = useState<EditorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("portfolio");

  useEffect(() => {
    fetch(`/api/editors/${id}`)
      .then((r) => r.json())
      .then((data) => { setEditor(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <TopNav title="" backHref="/editors" />
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" /></div>
      </>
    );
  }

  if (!editor) {
    return (
      <>
        <TopNav title="" backHref="/editors" />
        <div className="text-center py-20 text-toss-gray-400">프로필을 찾을 수 없습니다</div>
      </>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "portfolio", label: "포트폴리오" },
    { key: "description", label: "서비스 설명" },
    { key: "info", label: "전문가 정보" },
    { key: "reviews", label: `리뷰 (${editor.review_count})` },
  ];

  return (
    <div className="min-h-full bg-gray-50 pb-24 md:pb-8">
      <TopNav title="" backHref="/editors" />

      {/* 프로필 헤더 */}
      <div className="bg-white px-5 md:px-0 pt-4 pb-5 border-b border-toss-gray-100 max-w-[900px] mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {editor.users?.profile_image ? (
              <img src={editor.users.profile_image} alt="" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 bg-toss-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl md:text-3xl font-bold text-toss-gray-400">{editor.display_name[0]}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] md:text-[24px] font-bold text-toss-gray-900">{editor.display_name}</h1>
              {editor.available && (
                <span className="text-[10px] font-bold text-toss-green bg-green-50 px-1.5 py-0.5 rounded">작업가능</span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <StarRating rating={editor.rating_avg} size={14} />
              <span className="text-[13px] text-toss-gray-500 ml-0.5">{editor.rating_avg} ({editor.review_count})</span>
            </div>
            {/* PC 버튼 */}
            <div className="hidden md:flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (!isLoggedIn) { openLoginModal(); return; }
                  router.push(`/messages?to=${editor.user_id}`);
                }}
                className="px-6 py-2.5 rounded-xl border border-toss-gray-200 text-[14px] font-semibold text-toss-gray-900 hover:bg-toss-gray-50 transition"
              >
                문의하기
              </button>
              <button
                onClick={() => {
                  if (!isLoggedIn) { openLoginModal(); return; }
                  router.push(`/messages?to=${editor.user_id}`);
                }}
                className="px-6 py-2.5 rounded-xl bg-toss-blue text-white text-[14px] font-semibold hover:bg-[var(--blue-hover)] transition"
              >
                쪽지 보내기
              </button>
            </div>
          </div>
        </div>

        {/* 스탯 카드 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-toss-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-toss-gray-400">경력</p>
            <p className="text-[16px] font-bold text-toss-gray-900">{editor.experience_years || 0}년</p>
          </div>
          <div className="bg-toss-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-toss-gray-400">만족도</p>
            <p className="text-[16px] font-bold text-toss-gray-900">{editor.review_count > 0 ? `${Math.round(editor.rating_avg * 20)}%` : "0%"}</p>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white sticky top-[52px] md:top-[104px] z-20 border-b border-toss-gray-100">
        <div className="flex max-w-[900px] mx-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-[13px] font-semibold text-center relative transition ${
                tab === t.key ? "text-toss-gray-900" : "text-toss-gray-400"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-toss-gray-900 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-[900px] mx-auto px-4 md:px-0 py-5 md:py-8">
        {/* 포트폴리오 */}
        {tab === "portfolio" && (
          <div>
            <h2 className="text-[18px] font-bold text-toss-gray-900 mb-4">포트폴리오</h2>
            {editor.portfolio_videos.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[15px] font-semibold text-toss-gray-900 mb-1">아직 포트폴리오가 없어요</p>
                <p className="text-[13px] text-toss-gray-400">편집자가 작업물을 등록하면 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {editor.portfolio_videos.map((v) => (
                  <div key={v.id} className="bg-white rounded-xl border border-toss-gray-100 overflow-hidden">
                    {v.thumbnail_url ? (
                      <div className="aspect-video bg-toss-gray-100 relative">
                        <img src={v.thumbnail_url} alt={v.title || ""} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-toss-gray-100 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-toss-gray-300"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-[13px] font-medium text-toss-gray-900 line-clamp-2">{v.title || "제목 없음"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 서비스 설명 */}
        {tab === "description" && (
          <div>
            <h2 className="text-[18px] font-bold text-toss-gray-900 mb-4">서비스 설명</h2>
            {editor.bio ? (
              <p className="text-[14px] text-toss-gray-600 whitespace-pre-wrap leading-relaxed">{editor.bio}</p>
            ) : (
              <div className="text-center py-16">
                <p className="text-[15px] font-semibold text-toss-gray-900 mb-1">아직 서비스 설명이 없어요</p>
                <p className="text-[13px] text-toss-gray-400">편집자가 소개글을 작성하면 여기에 표시됩니다</p>
              </div>
            )}

            {/* 카테고리 & 도구 */}
            {(editor.categories?.length > 0 || editor.tools?.length > 0) && (
              <div className="mt-6 space-y-4">
                {editor.categories?.length > 0 && (
                  <div>
                    <p className="text-[13px] font-semibold text-toss-gray-500 mb-2">전문 분야</p>
                    <div className="flex flex-wrap gap-2">
                      {editor.categories.map((c) => (
                        <span key={c} className="text-[12px] font-medium text-toss-blue bg-blue-50 px-3 py-1 rounded-lg">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {editor.tools?.length > 0 && (
                  <div>
                    <p className="text-[13px] font-semibold text-toss-gray-500 mb-2">사용 도구</p>
                    <div className="flex flex-wrap gap-2">
                      {editor.tools.map((t) => (
                        <span key={t} className="text-[12px] font-medium text-toss-gray-600 bg-toss-gray-50 px-3 py-1 rounded-lg">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 전문가 정보 */}
        {tab === "info" && (
          <div>
            {/* 정보 카드 */}
            <div className="bg-toss-gray-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 divide-x divide-toss-gray-200 text-center">
                <div>
                  <p className="text-[11px] text-toss-gray-400 mb-1">경력</p>
                  <p className="text-[15px] font-bold text-toss-gray-900">{editor.experience_years || 0}년</p>
                </div>
                <div>
                  <p className="text-[11px] text-toss-gray-400 mb-1">만족도</p>
                  <p className="text-[15px] font-bold text-toss-gray-900">{editor.review_count > 0 ? `${Math.round(editor.rating_avg * 20)}%` : "-"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-toss-gray-400 mb-1">리뷰</p>
                  <p className="text-[15px] font-bold text-toss-gray-900">{editor.review_count}건</p>
                </div>
              </div>
            </div>

            {/* 상세 정보 */}
            <h2 className="text-[18px] font-bold text-toss-gray-900 mb-4">전문가 정보</h2>
            <div className="flex items-center gap-4 mb-4">
              {editor.users?.profile_image ? (
                <img src={editor.users.profile_image} alt="" className="w-14 h-14 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-14 h-14 bg-toss-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-toss-gray-400">{editor.display_name[0]}</span>
                </div>
              )}
              <div>
                <p className="text-[16px] font-bold text-toss-gray-900">{editor.display_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <StarRating rating={editor.rating_avg} size={12} />
                  <span className="text-[12px] text-toss-gray-500">{editor.rating_avg} ({editor.review_count})</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {editor.hourly_rate && (
                <div className="flex justify-between py-2 border-b border-toss-gray-50">
                  <span className="text-[13px] text-toss-gray-400">단가</span>
                  <span className="text-[13px] font-semibold text-toss-gray-900">{(editor.hourly_rate / 10000).toFixed(0)}만원~</span>
                </div>
              )}
              {editor.youtube_channel_name && (
                <div className="flex justify-between py-2 border-b border-toss-gray-50">
                  <span className="text-[13px] text-toss-gray-400">유튜브 채널</span>
                  <span className="text-[13px] font-semibold text-toss-blue">{editor.youtube_channel_name}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-toss-gray-50">
                <span className="text-[13px] text-toss-gray-400">작업 가능</span>
                <span className={`text-[13px] font-semibold ${editor.available ? "text-toss-green" : "text-toss-gray-400"}`}>
                  {editor.available ? "가능" : "불가"}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (!isLoggedIn) { openLoginModal(); return; }
                router.push(`/messages?to=${editor.user_id}`);
              }}
              className="w-full h-[48px] mt-6 rounded-xl border border-toss-gray-200 text-[14px] font-semibold text-toss-gray-900 hover:bg-toss-gray-50 transition"
            >
              문의하기
            </button>
          </div>
        )}

        {/* 리뷰 */}
        {tab === "reviews" && (
          <div>
            <h2 className="text-[18px] font-bold text-toss-gray-900 mb-1">리뷰</h2>
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={editor.rating_avg} size={20} />
              <span className="text-[24px] font-bold text-toss-gray-900">{editor.rating_avg}</span>
              <span className="text-[14px] text-toss-gray-400">({editor.review_count})</span>
            </div>

            {/* 리뷰 바 */}
            <div className="bg-toss-gray-50 rounded-xl p-4 mb-6 space-y-2">
              {["결과물 만족도", "친절한 상담", "신속한 대응"].map((label) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[12px] text-toss-gray-500 w-20 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-toss-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-toss-green rounded-full" style={{ width: `${editor.rating_avg * 20}%` }} />
                  </div>
                  <span className="text-[12px] font-semibold text-toss-gray-700 w-6 text-right">{editor.rating_avg}</span>
                </div>
              ))}
            </div>

            {/* 리뷰 목록 */}
            {editor.reviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[15px] font-semibold text-toss-gray-900 mb-1">아직 리뷰가 없어요</p>
                <p className="text-[13px] text-toss-gray-400">첫 번째 리뷰를 남겨보세요</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-toss-gray-100">
                {editor.reviews.map((r) => (
                  <div key={r.id} className="py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-toss-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-[12px] font-bold text-toss-gray-400">{r.users?.nickname?.[0] || "?"}</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-toss-gray-900">{r.users?.nickname || "익명"}</p>
                        <div className="flex items-center gap-1">
                          <StarRating rating={r.rating} size={10} />
                          <span className="text-[11px] text-toss-gray-400">{r.rating}.0 | {formatDate(r.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {r.content && <p className="text-[14px] text-toss-gray-700 leading-relaxed">{r.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 고정 버튼 (모바일만) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-toss-gray-100 px-4 py-3 pb-[env(safe-area-inset-bottom,12px)] flex gap-2 z-30 md:hidden">
        <button className="w-12 h-12 rounded-xl border border-toss-gray-200 flex items-center justify-center flex-shrink-0 hover:bg-toss-gray-50 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-toss-gray-500">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
        <button
          onClick={() => {
            if (!isLoggedIn) { openLoginModal(); return; }
            router.push(`/messages?to=${editor.user_id}`);
          }}
          className="flex-1 h-12 rounded-xl border border-toss-gray-200 text-[14px] font-semibold text-toss-gray-900 hover:bg-toss-gray-50 transition"
        >
          문의하기
        </button>
        <button
          onClick={() => {
            if (!isLoggedIn) { openLoginModal(); return; }
            router.push(`/messages?to=${editor.user_id}`);
          }}
          className="flex-1 h-12 rounded-xl bg-toss-blue text-white text-[14px] font-semibold hover:bg-[var(--blue-hover)] transition"
        >
          쪽지 보내기
        </button>
      </div>
    </div>
  );
}
