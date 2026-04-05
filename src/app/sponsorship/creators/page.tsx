"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";
import { AD_CONTENT_CATEGORIES } from "@/lib/ad-categories";

const CATEGORY_OPTIONS = ["전체", ...AD_CONTENT_CATEGORIES];
const PLATFORM_OPTIONS = ["전체", "YouTube", "Instagram", "TikTok"];
const SORT_OPTIONS = [
  { key: "recent", label: "최신순" },
  { key: "price_low", label: "가격 낮은순" },
];

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "▶",
  instagram: "📷",
  tiktok: "♪",
};

interface CreatorProfile {
  id: string;
  platforms: { platform: string; name: string; url?: string; subscribers?: number; avg_views?: number }[];
  content_category: string;
  ad_types: string[];
  pricing_type: string;
  price_per_content: number | null;
  price_min: number | null;
  price_max: number | null;
  bio: string | null;
  available: boolean;
  view_count: number;
  users?: { nickname: string; profile_image: string | null };
}

function formatPrice(profile: CreatorProfile): string {
  if (profile.pricing_type === "negotiable") return "협의";
  if (profile.pricing_type === "fixed" && profile.price_per_content) {
    return `${(profile.price_per_content / 10000).toFixed(0)}만원~`;
  }
  if (profile.pricing_type === "range" && profile.price_min != null && profile.price_max != null) {
    return `${(profile.price_min / 10000).toFixed(0)}~${(profile.price_max / 10000).toFixed(0)}만원`;
  }
  return "협의";
}

function formatSubscribers(count?: number): string {
  if (!count) return "0";
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
  return String(count);
}

export default function CreatorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "전체");
  const [platform, setPlatform] = useState(searchParams.get("platform") || "전체");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "전체") params.set("category", category);
    if (platform !== "전체") params.set("platform", platform.toLowerCase());
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);

    try {
      const res = await fetch(`/api/sponsorship/creators?${params}`);
      const json = await res.json();
      setCreators(json.data || []);
    } catch { /* empty */ }
    setLoading(false);
  }, [category, platform, search, sort]);

  useEffect(() => { fetchCreators(); }, [fetchCreators]);

  const sortedCreators = [...creators].sort((a, b) => {
    if (sort === "price_low") {
      const aPrice = a.price_per_content || a.price_min || 999999999;
      const bPrice = b.price_per_content || b.price_min || 999999999;
      return aPrice - bPrice;
    }
    return 0; // API already sorts by recent
  });

  return (
    <>
      <TopNav title="크리에이터 찾기" backHref="/sponsorship" />

      <div className="max-w-[1200px] mx-auto px-4 py-4">
        {/* 검색 */}
        <div className="relative mb-4 md:max-w-[400px]">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="크리에이터 검색"
            className="w-full h-[44px] pl-11 pr-4 rounded-xl bg-white border border-toss-gray-100 text-[14px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue"
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-shrink-0 px-4 h-[34px] rounded-full text-[13px] font-medium transition ${
                category === c ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 플랫폼 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex-shrink-0 px-3 h-[30px] rounded-lg text-[12px] font-medium transition ${
                platform === p ? "bg-toss-blue text-white" : "bg-toss-gray-50 text-toss-gray-500"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 정렬 + 카운트 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] text-toss-gray-500">{sortedCreators.length}명</span>
          <div className="flex gap-1">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`text-[12px] px-2 py-1 rounded transition ${
                  sort === s.key ? "text-toss-gray-900 font-semibold" : "text-toss-gray-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : sortedCreators.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-toss-gray-400 text-[15px]">등록된 크리에이터가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
            {sortedCreators.map((creator) => (
              <div
                key={creator.id}
                onClick={() => isLoggedIn ? router.push(`/sponsorship/creators/${creator.id}`) : openLoginModal()}
                className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden cursor-pointer hover:border-toss-gray-200 transition"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 아바타 */}
                    {creator.users?.profile_image ? (
                      <img src={creator.users.profile_image} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[18px] font-bold text-toss-gray-400">
                          {creator.platforms[0]?.name?.[0] || creator.users?.nickname?.[0] || "?"}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* 채널명 + 상태 */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-bold text-toss-gray-900 truncate">
                          {creator.platforms[0]?.name || creator.users?.nickname || "크리에이터"}
                        </h3>
                        {creator.available && (
                          <span className="text-[10px] font-bold text-toss-green bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">가능</span>
                        )}
                      </div>

                      {/* 플랫폼 + 구독자 */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {creator.platforms.map((p, idx) => (
                          <span key={idx} className="flex items-center gap-1 text-[12px] text-toss-gray-500">
                            <span>{PLATFORM_ICONS[p.platform] || ""}</span>
                            <span>{formatSubscribers(p.subscribers)}</span>
                          </span>
                        ))}
                      </div>

                      {/* 단가 */}
                      <p className="text-[15px] font-bold text-toss-gray-900 mb-2">
                        {formatPrice(creator)}
                      </p>

                      {/* 콘텐츠 카테고리 */}
                      <div className="flex flex-wrap gap-1 mb-1">
                        {creator.content_category && (
                          <span className="text-[11px] font-medium text-toss-blue bg-blue-50 px-2 py-0.5 rounded">
                            {creator.content_category}
                          </span>
                        )}
                      </div>

                      {/* 광고 유형 태그 */}
                      {creator.ad_types?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {creator.ad_types.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] text-toss-gray-400 bg-toss-gray-50 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                          {creator.ad_types.length > 3 && (
                            <span className="text-[10px] text-toss-gray-300">+{creator.ad_types.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 하트 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="flex-shrink-0 p-1"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-toss-gray-300">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
