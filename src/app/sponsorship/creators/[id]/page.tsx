"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "▶",
  instagram: "📷",
  tiktok: "♪",
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
};

interface CreatorDetail {
  id: string;
  user_id: string;
  platforms: { platform: string; name: string; url?: string; subscribers?: number; avg_views?: number }[];
  content_category: string;
  ad_types: string[];
  pricing_type: string;
  price_per_content: number | null;
  price_min: number | null;
  price_max: number | null;
  bio: string | null;
  past_brands: string[];
  portfolio_urls: string[];
  available: boolean;
  view_count: number;
  created_at: string;
  users?: { nickname: string; profile_image: string | null };
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "방금 전";
  if (d < 60) return `${d}분 전`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  return `${days}일 전`;
}

function formatSubscribers(count?: number): string {
  if (!count) return "0";
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
  return String(count);
}

function formatPrice(profile: CreatorDetail): string {
  if (profile.pricing_type === "negotiable") return "협의";
  if (profile.pricing_type === "fixed" && profile.price_per_content) {
    return `${(profile.price_per_content / 10000).toFixed(0)}만원~`;
  }
  if (profile.pricing_type === "range" && profile.price_min != null && profile.price_max != null) {
    return `${(profile.price_min / 10000).toFixed(0)}~${(profile.price_max / 10000).toFixed(0)}만원`;
  }
  return "협의";
}

export default function CreatorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [creator, setCreator] = useState<CreatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    fetch(`/api/sponsorship/creators/${id}`)
      .then((r) => r.json())
      .then((data) => { setCreator(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  // 더보기 메뉴 바깥 클릭으로 닫기
  useEffect(() => {
    if (!showMoreMenu) return;
    const close = () => setShowMoreMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showMoreMenu]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-30 bg-white border-b border-toss-gray-100">
          <div className="flex items-center px-2 h-12 pt-[env(safe-area-inset-top,0px)]">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>
        </div>
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-30 bg-white border-b border-toss-gray-100">
          <div className="flex items-center px-2 h-12 pt-[env(safe-area-inset-top,0px)]">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>
        </div>
        <div className="text-center py-20 text-toss-gray-400">프로필을 찾을 수 없습니다</div>
      </div>
    );
  }

  const channelName = creator.platforms[0]?.name || creator.users?.nickname || "크리에이터";

  return (
    <div className="min-h-screen pb-24">
      {/* 커스텀 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-toss-gray-100">
        <div className="flex items-center justify-between px-2 h-12 pt-[env(safe-area-inset-top,0px)]">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-1">
            {/* 공유 */}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: channelName, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("링크가 복사되었습니다");
                }
              }}
              className="w-10 h-10 flex items-center justify-center text-toss-gray-700"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
            {/* 더보기 */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
                className="w-10 h-10 flex items-center justify-center text-toss-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-toss-gray-100 py-1 min-w-[120px] z-50">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("링크가 복사되었습니다");
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-[14px] text-toss-gray-700 hover:bg-toss-gray-50"
                  >
                    링크 복사
                  </button>
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      alert("신고가 접수되었습니다");
                    }}
                    className="w-full px-4 py-2.5 text-left text-[14px] text-toss-red hover:bg-toss-gray-50"
                  >
                    신고하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 프로필 섹션 */}
      <div className="bg-white px-5 md:px-0 pt-6 pb-5 border-b border-toss-gray-100 max-w-[900px] mx-auto">
        <div className="flex items-center gap-4 mb-4">
          {/* 큰 아바타 */}
          <div className="relative">
            {creator.users?.profile_image ? (
              <img src={creator.users.profile_image} alt="" className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 bg-toss-gray-200 rounded-full flex items-center justify-center">
                <span className="text-3xl md:text-4xl font-bold text-toss-gray-400">{channelName[0]}</span>
              </div>
            )}
            {creator.available && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-toss-green rounded-full border-2 border-white flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-[20px] md:text-[26px] font-bold text-toss-gray-900 mb-1">{channelName}</h1>

            {/* 플랫폼 뱃지 + 구독자/조회수 */}
            <div className="flex flex-wrap gap-2 mb-2">
              {creator.platforms.map((p, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-toss-gray-50 px-2.5 py-1 rounded-lg">
                  <span className="text-[13px]">{PLATFORM_ICONS[p.platform] || ""}</span>
                  <span className="text-[12px] font-medium text-toss-gray-700">{PLATFORM_LABELS[p.platform] || p.platform}</span>
                  <span className="text-[11px] text-toss-gray-400">
                    {formatSubscribers(p.subscribers)}
                    {p.avg_views ? ` / 평균 ${formatSubscribers(p.avg_views)}뷰` : ""}
                  </span>
                </div>
              ))}
            </div>

            {/* 콘텐츠 카테고리 뱃지 */}
            {creator.content_category && (
              <button
                onClick={() => router.push(`/sponsorship/creators?category=${encodeURIComponent(creator.content_category)}`)}
                className="text-[12px] font-medium text-toss-blue bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition"
              >
                {creator.content_category}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="max-w-[900px] mx-auto px-5 md:px-0 py-5 md:py-8 space-y-6">
        {/* 소개 */}
        {creator.bio && (
          <div>
            <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3">소개</h2>
            <p className="text-[14px] text-toss-gray-600 whitespace-pre-wrap leading-relaxed">{creator.bio}</p>
          </div>
        )}

        {/* 광고 유형 */}
        {creator.ad_types?.length > 0 && (
          <div>
            <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3">광고 유형</h2>
            <div className="flex flex-wrap gap-2">
              {creator.ad_types.map((type) => (
                <span
                  key={type}
                  className="text-[13px] font-medium text-toss-blue bg-blue-50 px-4 py-2 rounded-xl"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 단가 */}
        <div>
          <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3">단가</h2>
          <div className="bg-toss-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-toss-gray-500">콘텐츠 1건 기준</span>
              <span className="text-[18px] font-bold text-toss-gray-900">{formatPrice(creator)}</span>
            </div>
            {creator.pricing_type === "range" && creator.price_min != null && creator.price_max != null && (
              <p className="text-[12px] text-toss-gray-400 mt-1">
                광고 유형 및 조건에 따라 변동될 수 있습니다
              </p>
            )}
            {creator.pricing_type === "negotiable" && (
              <p className="text-[12px] text-toss-gray-400 mt-1">
                쪽지로 문의해 주세요
              </p>
            )}
          </div>
        </div>

        {/* 협찬 이력 */}
        {creator.past_brands?.length > 0 && (
          <div>
            <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3">협찬 이력</h2>
            <div className="flex flex-wrap gap-2">
              {creator.past_brands.map((brand, idx) => (
                <span
                  key={idx}
                  className="text-[13px] font-medium text-toss-gray-600 bg-toss-gray-50 px-3 py-1.5 rounded-lg"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 포트폴리오 */}
        {creator.portfolio_urls?.length > 0 && (
          <div>
            <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3">포트폴리오</h2>
            <div className="space-y-2">
              {creator.portfolio_urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white border border-toss-gray-100 rounded-xl p-3 hover:border-toss-gray-200 transition"
                >
                  <div className="w-10 h-10 bg-toss-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-toss-gray-400">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-toss-blue truncate">{url}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-toss-gray-300 flex-shrink-0">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 조회수 */}
        <div className="flex items-center gap-1 text-[13px] text-toss-gray-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-gray-300">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>{creator.view_count}명이 봤어요</span>
          <span className="mx-1">·</span>
          <span>{timeAgo(creator.created_at)}</span>
        </div>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-toss-gray-100 px-4 py-3 pb-[env(safe-area-inset-bottom,12px)] z-30">
        <div className="max-w-[900px] mx-auto">
          <button
            onClick={() => {
              if (!isLoggedIn) { openLoginModal(); return; }
              router.push(`/messages?to=${creator.user_id}&source=sponsorship`);
            }}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white text-[16px] font-semibold hover:bg-[var(--blue-hover)] transition"
          >
            쪽지 보내기
          </button>
        </div>
      </div>
    </div>
  );
}
