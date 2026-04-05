"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";
import { AD_CONTENT_CATEGORIES, AD_TYPES, PLATFORMS } from "@/lib/ad-categories";

const inputClass =
  "w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all";

export default function NewCampaignPage() {
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();

  const [title, setTitle] = useState("");
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [targetCategory, setTargetCategory] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("");
  const [targetAdType, setTargetAdType] = useState("");
  const [targetMinSubscribers, setTargetMinSubscribers] = useState("");
  const [budgetType, setBudgetType] = useState<"fixed" | "range" | "negotiable">("negotiable");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contentDeadline, setContentDeadline] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) openLoginModal();
  }, [isLoggedIn, openLoginModal]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("캠페인 제목을 입력해주세요");
      return;
    }

    setSaving(true);
    setError("");

    const body = {
      user_id: profile?.id,
      title: title.trim(),
      brand_name: brandName.trim() || null,
      product_name: productName.trim() || null,
      description: description.trim() || null,
      target_category: targetCategory || null,
      target_platform: targetPlatform || null,
      target_ad_type: targetAdType || null,
      target_min_subscribers: targetMinSubscribers
        ? parseFloat(targetMinSubscribers) * 10000
        : null,
      budget_type: budgetType,
      budget_amount:
        budgetType === "fixed" && budgetAmount ? parseFloat(budgetAmount) * 10000 : null,
      budget_min: budgetType === "range" && budgetMin ? parseFloat(budgetMin) * 10000 : null,
      budget_max: budgetType === "range" && budgetMax ? parseFloat(budgetMax) * 10000 : null,
      deadline: deadline || null,
      content_deadline: contentDeadline || null,
    };

    try {
      const res = await fetch("/api/sponsorship/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "캠페인 등록에 실패했습니다");
        setSaving(false);
        return;
      }

      router.push(`/sponsorship/campaigns/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다");
      setSaving(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <>
      <TopNav title="캠페인 등록" backHref="/sponsorship/campaigns" />

      <div className="max-w-[800px] mx-auto px-4 py-5">
        <div className="space-y-6">
          {/* 제목 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              캠페인 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 신제품 리뷰 유튜버 모집"
              className={inputClass}
            />
          </div>

          {/* 브랜드명 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              브랜드명
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="브랜드 또는 회사명"
              className={inputClass}
            />
          </div>

          {/* 제품명 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              제품/서비스명
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="광고할 제품 또는 서비스명"
              className={inputClass}
            />
          </div>

          {/* 상세 설명 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              캠페인 설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="캠페인 목적, 원하는 콘텐츠 방향 등을 상세히 적어주세요"
              rows={5}
              className={inputClass + " resize-none"}
            />
          </div>

          {/* 타겟 카테고리 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">
              타겟 카테고리
            </label>
            <div className="flex flex-wrap gap-2">
              {AD_CONTENT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setTargetCategory(targetCategory === c ? "" : c)}
                  className={`px-4 py-2 rounded-xl text-[14px] font-medium transition ${
                    targetCategory === c
                      ? "bg-toss-blue text-white"
                      : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 타겟 플랫폼 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">
              타겟 플랫폼
            </label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setTargetPlatform(targetPlatform === p.key ? "" : p.key)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition ${
                    targetPlatform === p.key
                      ? "bg-toss-blue text-white"
                      : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 타겟 광고 유형 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">
              광고 유형
            </label>
            <div className="flex flex-wrap gap-2">
              {AD_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTargetAdType(targetAdType === t.key ? "" : t.key)}
                  className={`px-4 py-2 rounded-xl text-[14px] font-medium transition ${
                    targetAdType === t.key
                      ? "bg-toss-blue text-white"
                      : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 최소 구독자 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              최소 구독자 수
            </label>
            <div className="relative">
              <input
                type="number"
                value={targetMinSubscribers}
                onChange={(e) => setTargetMinSubscribers(e.target.value)}
                placeholder="최소 구독자 수"
                className={inputClass + " pr-10"}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-toss-gray-400">
                만
              </span>
            </div>
          </div>

          {/* 예산 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">예산</label>
            <div className="flex gap-2 mb-3">
              {(
                [
                  { key: "fixed", label: "고정 금액" },
                  { key: "range", label: "범위" },
                  { key: "negotiable", label: "협의" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setBudgetType(opt.key)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition ${
                    budgetType === opt.key
                      ? "bg-toss-blue text-white"
                      : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {budgetType === "fixed" && (
              <div className="relative">
                <input
                  type="number"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="예산 금액"
                  className={inputClass + " pr-10"}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-toss-gray-400">
                  만원
                </span>
              </div>
            )}

            {budgetType === "range" && (
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="최소"
                    className={inputClass + " pr-10"}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-toss-gray-400">
                    만원
                  </span>
                </div>
                <span className="text-toss-gray-300">~</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="최대"
                    className={inputClass + " pr-10"}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-toss-gray-400">
                    만원
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 캠페인 마감일 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              모집 마감일
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* 콘텐츠 마감일 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              콘텐츠 마감일
            </label>
            <input
              type="date"
              value={contentDeadline}
              onChange={(e) => setContentDeadline(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-toss-red text-[13px]">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] disabled:opacity-50 transition hover:bg-[var(--blue-hover)]"
          >
            {saving ? "등록 중..." : "캠페인 등록하기"}
          </button>
        </div>
      </div>
    </>
  );
}
