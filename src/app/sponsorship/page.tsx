"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

interface CreatorProfile {
  id: string;
  platforms: { platform: string; name: string; subscribers?: number }[];
  content_category: string;
  ad_types: string[];
  pricing_type: string;
  price_per_content: number | null;
  price_min: number | null;
  price_max: number | null;
  bio: string | null;
  available: boolean;
  users?: { nickname: string; profile_image: string | null };
}

interface Campaign {
  id: string;
  title: string;
  brand_name: string | null;
  budget_type: string;
  budget_amount: number | null;
  budget_min: number | null;
  budget_max: number | null;
  target_category: string | null;
  target_platform: string | null;
  target_ad_type: string | null;
  view_count: number;
  created_at: string;
  users?: { nickname: string; profile_image: string | null };
}

const platformIcon: Record<string, string> = { youtube: "▶", instagram: "📷", tiktok: "♪" };

function formatBudget(c: Campaign) {
  if (c.budget_type === "fixed" && c.budget_amount) return `${(c.budget_amount / 10000).toFixed(0)}만원`;
  if (c.budget_type === "range" && c.budget_min && c.budget_max) return `${(c.budget_min / 10000).toFixed(0)}~${(c.budget_max / 10000).toFixed(0)}만원`;
  return "협의";
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "방금 전";
  if (d < 60) return `${d}분 전`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function SponsorshipPage() {
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [tab, setTab] = useState<"creators" | "campaigns">("creators");
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === "creators") {
      fetch("/api/sponsorship/creators?limit=6")
        .then(r => r.json())
        .then(j => setCreators(j.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      fetch("/api/sponsorship/campaigns?limit=6")
        .then(r => r.json())
        .then(j => setCampaigns(j.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <>
      <TopNav title="광고 매칭" backHref="/" />

      <div className="max-w-[680px] mx-auto px-4 py-4">
        {/* 소개 배너 */}
        <div className="bg-gradient-to-r from-toss-blue to-blue-400 rounded-2xl p-5 mb-5 text-white">
          <h2 className="text-[18px] font-bold mb-1">브랜드와 크리에이터를 연결합니다</h2>
          <p className="text-[13px] opacity-80">YouTube, Instagram, TikTok 크리에이터와 광고주를 매칭해드려요</p>
        </div>

        {/* CTA 버튼 2개 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => isLoggedIn ? router.push("/sponsorship/creators/register") : openLoginModal()}
            className="bg-white border border-toss-gray-100 rounded-xl p-4 text-left hover:border-toss-gray-200 transition"
          >
            <span className="text-[24px]">📣</span>
            <p className="text-[14px] font-bold text-toss-gray-900 mt-2">내 채널 등록</p>
            <p className="text-[12px] text-toss-gray-400 mt-0.5">광고 제안을 받아보세요</p>
          </button>
          <button
            onClick={() => isLoggedIn ? router.push("/sponsorship/campaigns/new") : openLoginModal()}
            className="bg-white border border-toss-gray-100 rounded-xl p-4 text-left hover:border-toss-gray-200 transition"
          >
            <span className="text-[24px]">💼</span>
            <p className="text-[14px] font-bold text-toss-gray-900 mt-2">캠페인 등록</p>
            <p className="text-[12px] text-toss-gray-400 mt-0.5">크리에이터를 찾아보세요</p>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-toss-gray-100 mb-4">
          <button
            onClick={() => setTab("creators")}
            className={`flex-1 py-3 text-[14px] font-semibold text-center transition border-b-2 ${
              tab === "creators" ? "text-toss-gray-900 border-toss-gray-900" : "text-toss-gray-400 border-transparent"
            }`}
          >
            크리에이터 찾기
          </button>
          <button
            onClick={() => setTab("campaigns")}
            className={`flex-1 py-3 text-[14px] font-semibold text-center transition border-b-2 ${
              tab === "campaigns" ? "text-toss-gray-900 border-toss-gray-900" : "text-toss-gray-400 border-transparent"
            }`}
          >
            광고 캠페인
          </button>
        </div>

        {/* 콘텐츠 */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : tab === "creators" ? (
          <>
            {creators.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-toss-gray-400 text-[15px]">등록된 크리에이터가 없습니다</p>
                <button onClick={() => isLoggedIn ? router.push("/sponsorship/creators/register") : openLoginModal()} className="mt-2 text-[14px] font-semibold text-toss-blue">첫 번째로 등록하기</button>
              </div>
            ) : (
              <div className="space-y-3">
                {creators.map(c => (
                  <div key={c.id} onClick={() => router.push(`/sponsorship/creators/${c.id}`)} className="bg-white rounded-2xl border border-toss-gray-100 p-4 cursor-pointer hover:border-toss-gray-200 transition">
                    <div className="flex items-start gap-3">
                      {c.users?.profile_image ? (
                        <img src={c.users.profile_image} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-[18px] font-bold text-toss-gray-400">{c.users?.nickname?.[0] || "?"}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-bold text-toss-gray-900">{c.platforms?.[0]?.name || c.users?.nickname || "크리에이터"}</h3>
                          {c.available && <span className="text-[10px] font-bold text-toss-green bg-green-50 px-1.5 py-0.5 rounded">광고 가능</span>}
                        </div>
                        {/* 플랫폼 */}
                        <div className="flex items-center gap-2 mb-2">
                          {c.platforms?.map((p: { platform: string; subscribers?: number }, i: number) => (
                            <span key={i} className="text-[11px] text-toss-gray-500 bg-toss-gray-50 px-2 py-0.5 rounded flex items-center gap-1">
                              {platformIcon[p.platform] || "🔗"} {p.subscribers ? `${(p.subscribers / 10000).toFixed(1)}만` : p.platform}
                            </span>
                          ))}
                        </div>
                        {/* 카테고리 + 광고유형 */}
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[11px] font-medium text-toss-blue bg-blue-50 px-2 py-0.5 rounded">{c.content_category}</span>
                          {c.ad_types?.slice(0, 2).map(t => (
                            <span key={t} className="text-[11px] text-toss-gray-500 bg-toss-gray-50 px-2 py-0.5 rounded">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => router.push("/sponsorship/creators")} className="w-full py-3 text-center text-[14px] font-semibold text-toss-blue hover:bg-toss-gray-50 rounded-xl transition">
                  더보기 →
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {campaigns.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-toss-gray-400 text-[15px]">등록된 캠페인이 없습니다</p>
                <button onClick={() => isLoggedIn ? router.push("/sponsorship/campaigns/new") : openLoginModal()} className="mt-2 text-[14px] font-semibold text-toss-blue">첫 캠페인 등록하기</button>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => (
                  <div key={c.id} onClick={() => router.push(`/sponsorship/campaigns/${c.id}`)} className="bg-white rounded-2xl border border-toss-gray-100 p-4 cursor-pointer hover:border-toss-gray-200 transition">
                    <div className="flex items-center gap-2 mb-2">
                      {c.brand_name && <span className="text-[11px] font-medium text-toss-orange bg-orange-50 px-2 py-0.5 rounded">{c.brand_name}</span>}
                      {c.target_platform && <span className="text-[11px] text-toss-gray-500 bg-toss-gray-50 px-2 py-0.5 rounded">{platformIcon[c.target_platform] || ""} {c.target_platform}</span>}
                    </div>
                    <h3 className="text-[15px] font-bold text-toss-gray-900 mb-1">{c.title}</h3>
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="font-semibold text-toss-gray-900">{formatBudget(c)}</span>
                      {c.target_category && <span className="text-toss-gray-400">· {c.target_category}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[12px] text-toss-gray-400">
                      <span>{c.users?.nickname || "익명"} · {timeAgo(c.created_at)}</span>
                      <span>조회 {c.view_count}</span>
                    </div>
                  </div>
                ))}
                <button onClick={() => router.push("/sponsorship/campaigns")} className="w-full py-3 text-center text-[14px] font-semibold text-toss-blue hover:bg-toss-gray-50 rounded-xl transition">
                  더보기 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
