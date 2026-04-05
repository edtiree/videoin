"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";
import { AD_CONTENT_CATEGORIES, PLATFORMS } from "@/lib/ad-categories";

const platformIcon: Record<string, string> = { youtube: "▶", instagram: "📷", tiktok: "♪" };

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  product_name: string | null;
  brand_name: string | null;
  budget_type: string;
  budget_amount: number | null;
  budget_min: number | null;
  budget_max: number | null;
  target_category: string | null;
  target_min_subscribers: number | null;
  target_platform: string | null;
  target_ad_type: string | null;
  deadline: string | null;
  status: string;
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
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

function formatBudget(c: Campaign): string {
  if (c.budget_type === "fixed" && c.budget_amount)
    return `${(c.budget_amount / 10000).toFixed(0)}만원`;
  if (c.budget_type === "range" && c.budget_min && c.budget_max)
    return `${(c.budget_min / 10000).toFixed(0)}~${(c.budget_max / 10000).toFixed(0)}만원`;
  return "협의";
}

const PLATFORM_FILTERS = [
  { key: "전체", label: "전체" },
  ...PLATFORMS,
];

export default function CampaignsPage() {
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [platform, setPlatform] = useState("전체");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "전체") params.set("category", category);
    if (platform !== "전체") params.set("platform", platform);

    try {
      const res = await fetch(`/api/sponsorship/campaigns?${params}`);
      const json = await res.json();
      setCampaigns(json.data || []);
    } catch {
      /* empty */
    }
    setLoading(false);
  }, [search, category, platform]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return (
    <>
      <TopNav
        title="광고 캠페인"
        backHref="/sponsorship"
        rightContent={
          <button
            onClick={() =>
              isLoggedIn ? router.push("/sponsorship/campaigns/new") : openLoginModal()
            }
            className="text-[14px] font-semibold text-toss-blue"
          >
            캠페인 등록
          </button>
        }
      />

      <div className="max-w-[1200px] mx-auto px-4 py-4">
        {/* 검색 */}
        <div className="relative mb-4 md:max-w-[400px]">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-300"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="캠페인 검색"
            className="w-full h-[44px] pl-11 pr-4 rounded-xl bg-white border border-toss-gray-100 text-[14px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue"
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
          {["전체", ...AD_CONTENT_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-shrink-0 px-4 h-[34px] rounded-full text-[13px] font-medium transition ${
                category === c
                  ? "bg-toss-gray-900 text-white"
                  : "bg-white border border-toss-gray-100 text-toss-gray-500"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 플랫폼 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
          {PLATFORM_FILTERS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              className={`flex-shrink-0 px-3 h-[30px] rounded-lg text-[12px] font-medium transition ${
                platform === p.key
                  ? "bg-toss-blue text-white"
                  : "bg-toss-gray-50 text-toss-gray-500"
              }`}
            >
              {"icon" in p ? `${p.icon} ` : ""}
              {p.label}
            </button>
          ))}
        </div>

        {/* 캠페인 목록 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-toss-gray-400 text-[15px]">등록된 캠페인이 없습니다</p>
            <button
              onClick={() =>
                isLoggedIn ? router.push("/sponsorship/campaigns/new") : openLoginModal()
              }
              className="mt-4 text-[14px] font-semibold text-toss-blue"
            >
              첫 캠페인 등록하기
            </button>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
            {campaigns.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/sponsorship/campaigns/${c.id}`)}
                className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 transition"
              >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2">
                  {c.brand_name && (
                    <span className="text-[11px] font-medium text-toss-orange bg-orange-50 px-2 py-0.5 rounded">
                      {c.brand_name}
                    </span>
                  )}
                  {c.target_platform && (
                    <span className="text-[11px] text-toss-gray-500 bg-toss-gray-50 px-2 py-0.5 rounded">
                      {platformIcon[c.target_platform] || ""} {c.target_platform}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-[16px] font-semibold text-toss-gray-900 mb-1">{c.title}</h3>

                {/* Budget + category */}
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="font-medium text-toss-gray-700">{formatBudget(c)}</span>
                  {c.target_category && (
                    <>
                      <span className="text-toss-gray-300">·</span>
                      <span className="text-toss-gray-500">{c.target_category}</span>
                    </>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between mt-3 text-[12px] text-toss-gray-400">
                  <span>
                    {c.users?.nickname || "익명"} · {timeAgo(c.created_at)}
                  </span>
                  <span>조회 {c.view_count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
