"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

const platformIcon: Record<string, string> = { youtube: "▶", instagram: "📷", tiktok: "♪" };

interface CampaignDetail {
  id: string;
  user_id: string;
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
  content_deadline: string | null;
  status: string;
  view_count: number;
  created_at: string;
  users?: { nickname: string; profile_image: string | null };
}

function formatBudget(c: CampaignDetail): string {
  if (c.budget_type === "fixed" && c.budget_amount)
    return `${(c.budget_amount / 10000).toFixed(0)}만원`;
  if (c.budget_type === "range" && c.budget_min && c.budget_max)
    return `${(c.budget_min / 10000).toFixed(0)}~${(c.budget_max / 10000).toFixed(0)}만원`;
  return "협의";
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn, openLoginModal, profile } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [closing, setClosing] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/sponsorship/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCampaign(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    if (showMore) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMore]);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: campaign?.title || "광고 캠페인",
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      alert("링크가 복사되었습니다");
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/sponsorship/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/sponsorship/campaigns");
      }
    } catch {
      alert("삭제에 실패했습니다");
    }
  };

  const handleClose = async () => {
    if (!confirm("캠페인을 마감하시겠습니까?")) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/sponsorship/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (res.ok) {
        setCampaign((prev) => (prev ? { ...prev, status: "closed" } : prev));
      }
    } catch {
      alert("마감 처리에 실패했습니다");
    }
    setClosing(false);
  };

  if (loading) {
    return (
      <>
        <TopNav title="캠페인 상세" backHref="/sponsorship/campaigns" />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <TopNav title="캠페인 상세" backHref="/sponsorship/campaigns" />
        <div className="text-center py-20 text-toss-gray-400">캠페인을 찾을 수 없습니다</div>
      </>
    );
  }

  const isOwner = profile?.id === campaign.user_id;

  return (
    <>
      <TopNav
        title="캠페인 상세"
        backHref="/sponsorship/campaigns"
        rightContent={
          <div className="flex items-center gap-1">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-50 transition"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>

            {/* More menu (owner only) */}
            {isOwner && (
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-50 transition"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
                {showMore && (
                  <div className="absolute right-0 top-10 bg-white border border-toss-gray-100 rounded-xl shadow-lg py-1 min-w-[120px] z-50">
                    <button
                      onClick={() => {
                        setShowMore(false);
                        handleDelete();
                      }}
                      className="w-full px-4 py-2.5 text-left text-[14px] text-toss-red hover:bg-toss-gray-50 transition"
                    >
                      삭제하기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-5 md:py-8">
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 md:p-8 mb-4">
          {/* Status badge */}
          {campaign.status === "closed" && (
            <span className="inline-block text-[12px] font-bold text-toss-red bg-red-50 px-2.5 py-1 rounded-lg mb-3">
              마감됨
            </span>
          )}

          {/* Brand / Title */}
          {campaign.brand_name && (
            <span className="inline-block text-[12px] font-medium text-toss-orange bg-orange-50 px-2.5 py-1 rounded-lg mb-2">
              {campaign.brand_name}
            </span>
          )}
          <h1 className="text-[22px] md:text-[28px] font-bold text-toss-gray-900 mt-1 mb-2">
            {campaign.title}
          </h1>
          <p className="text-[14px] text-toss-gray-500 mb-5">
            {campaign.users?.nickname || "익명"}
            {campaign.product_name && ` · ${campaign.product_name}`}
          </p>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">예산</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">
                {formatBudget(campaign)}
              </p>
            </div>
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">타겟 카테고리</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">
                {campaign.target_category || "전체"}
              </p>
            </div>
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">타겟 플랫폼</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">
                {campaign.target_platform
                  ? `${platformIcon[campaign.target_platform] || ""} ${campaign.target_platform}`
                  : "전체"}
              </p>
            </div>
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">최소 구독자</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">
                {campaign.target_min_subscribers
                  ? `${(campaign.target_min_subscribers / 10000).toFixed(0)}만 이상`
                  : "제한 없음"}
              </p>
            </div>
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">광고 유형</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">
                {campaign.target_ad_type || "전체"}
              </p>
            </div>
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">모집 마감</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">
                {campaign.deadline || "미정"}
              </p>
            </div>
          </div>

          {/* Description */}
          {campaign.description && (
            <div className="border-t border-toss-gray-100 pt-4 mb-4">
              <h3 className="text-[14px] font-semibold text-toss-gray-900 mb-2">캠페인 상세</h3>
              <p className="text-[14px] text-toss-gray-600 whitespace-pre-wrap leading-relaxed">
                {campaign.description}
              </p>
            </div>
          )}

          {/* Content deadline */}
          {campaign.content_deadline && (
            <div className="border-t border-toss-gray-100 pt-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-toss-gray-400">콘텐츠 마감일:</span>
                <span className="text-[13px] font-medium text-toss-gray-700">
                  {campaign.content_deadline}
                </span>
              </div>
            </div>
          )}

          {/* View count */}
          <div className="text-[12px] text-toss-gray-400">조회 {campaign.view_count}회</div>
        </div>

        {/* Bottom CTA */}
        {isOwner ? (
          campaign.status !== "closed" && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="w-full h-[52px] rounded-xl bg-toss-gray-900 text-white font-semibold text-[15px] disabled:opacity-50 transition hover:bg-toss-gray-800"
            >
              {closing ? "처리 중..." : "마감하기"}
            </button>
          )
        ) : (
          <button
            onClick={() => {
              if (!isLoggedIn) {
                openLoginModal();
                return;
              }
              router.push(`/messages?to=${campaign.user_id}`);
            }}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] transition hover:bg-[var(--blue-hover)]"
          >
            쪽지 보내기
          </button>
        )}
      </div>
    </>
  );
}
