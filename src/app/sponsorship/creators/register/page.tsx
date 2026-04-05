"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";
import { AD_CONTENT_CATEGORIES, AD_TYPES, PLATFORMS } from "@/lib/ad-categories";

interface PlatformEntry {
  platform: string;
  name: string;
  url: string;
  subscribers: string;
  avg_views: string;
}

const emptyPlatform = (): PlatformEntry => ({
  platform: "youtube",
  name: "",
  url: "",
  subscribers: "",
  avg_views: "",
});

const inputClass =
  "w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all";

export default function CreatorRegisterPage() {
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();

  const [platforms, setPlatforms] = useState<PlatformEntry[]>([emptyPlatform()]);
  const [contentCategory, setContentCategory] = useState("");
  const [adTypes, setAdTypes] = useState<string[]>([]);
  const [pricingType, setPricingType] = useState<"fixed" | "range" | "negotiable">("negotiable");
  const [priceFixed, setPriceFixed] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [bio, setBio] = useState("");
  const [pastBrands, setPastBrands] = useState("");
  const [portfolioUrls, setPortfolioUrls] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      openLoginModal();
      setLoading(false);
      return;
    }
    // Check existing profile
    fetch(`/api/sponsorship/creators?user_id=${profile?.id}`)
      .then((r) => r.json())
      .then((json) => {
        const existing = json.data?.[0];
        if (existing) {
          setEditId(existing.id);
          // Load platforms
          if (existing.platforms?.length) {
            setPlatforms(
              existing.platforms.map(
                (p: { platform: string; name: string; url?: string; subscribers?: number; avg_views?: number }) => ({
                  platform: p.platform || "youtube",
                  name: p.name || "",
                  url: p.url || "",
                  subscribers: p.subscribers ? String(p.subscribers / 10000) : "",
                  avg_views: p.avg_views ? String(p.avg_views / 10000) : "",
                })
              )
            );
          }
          if (existing.content_category) setContentCategory(existing.content_category);
          if (existing.ad_types) setAdTypes(existing.ad_types);
          if (existing.pricing_type) setPricingType(existing.pricing_type);
          if (existing.price_per_content) setPriceFixed(String(existing.price_per_content / 10000));
          if (existing.price_min) setPriceMin(String(existing.price_min / 10000));
          if (existing.price_max) setPriceMax(String(existing.price_max / 10000));
          if (existing.bio) setBio(existing.bio);
          if (existing.past_brands) setPastBrands(existing.past_brands.join(", "));
          if (existing.portfolio_urls) setPortfolioUrls(existing.portfolio_urls.join("\n"));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, profile, openLoginModal]);

  const addPlatform = () => setPlatforms((prev) => [...prev, emptyPlatform()]);
  const removePlatform = (idx: number) => setPlatforms((prev) => prev.filter((_, i) => i !== idx));
  const updatePlatform = (idx: number, field: keyof PlatformEntry, value: string) =>
    setPlatforms((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  const toggleAdType = (key: string) =>
    setAdTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));

  const handleSubmit = async () => {
    if (!contentCategory) {
      setError("콘텐츠 카테고리를 선택해주세요");
      return;
    }
    if (adTypes.length === 0) {
      setError("가능한 광고 유형을 선택해주세요");
      return;
    }
    if (platforms.some((p) => !p.name.trim())) {
      setError("플랫폼 채널명을 입력해주세요");
      return;
    }

    setSaving(true);
    setError("");

    const body = {
      user_id: profile?.id,
      platforms: platforms.map((p) => ({
        platform: p.platform,
        name: p.name.trim(),
        url: p.url.trim() || null,
        subscribers: p.subscribers ? parseFloat(p.subscribers) * 10000 : null,
        avg_views: p.avg_views ? parseFloat(p.avg_views) * 10000 : null,
      })),
      content_category: contentCategory,
      ad_types: adTypes,
      pricing_type: pricingType,
      price_per_content: pricingType === "fixed" && priceFixed ? parseFloat(priceFixed) * 10000 : null,
      price_min: pricingType === "range" && priceMin ? parseFloat(priceMin) * 10000 : null,
      price_max: pricingType === "range" && priceMax ? parseFloat(priceMax) * 10000 : null,
      bio: bio.trim() || null,
      past_brands: pastBrands
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
      portfolio_urls: portfolioUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean),
    };

    try {
      const url = editId ? `/api/sponsorship/creators/${editId}` : "/api/sponsorship/creators";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "등록에 실패했습니다");
        setSaving(false);
        return;
      }

      router.push("/sponsorship");
    } catch {
      setError("네트워크 오류가 발생했습니다");
      setSaving(false);
    }
  };

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <>
        <TopNav title="광고 프로필 등록" backHref="/sponsorship" />
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav title="광고 프로필 등록" backHref="/sponsorship" />

      <div className="max-w-[800px] mx-auto px-4 py-5">
        <div className="space-y-6">
          {/* 플랫폼 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] font-medium text-toss-gray-500">플랫폼 *</label>
              <button
                onClick={addPlatform}
                className="text-[13px] font-semibold text-toss-blue"
              >
                + 플랫폼 추가
              </button>
            </div>

            <div className="space-y-4">
              {platforms.map((entry, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-toss-gray-100 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-toss-gray-700">
                      플랫폼 {idx + 1}
                    </span>
                    {platforms.length > 1 && (
                      <button
                        onClick={() => removePlatform(idx)}
                        className="text-[12px] text-toss-red font-medium"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  {/* Platform select buttons */}
                  <div className="flex gap-2">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => updatePlatform(idx, "platform", p.key)}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition ${
                          entry.platform === p.key
                            ? "bg-toss-blue text-white"
                            : "bg-white border border-toss-gray-100 text-toss-gray-500"
                        }`}
                      >
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={entry.name}
                    onChange={(e) => updatePlatform(idx, "name", e.target.value)}
                    placeholder="채널/계정 이름"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={entry.url}
                    onChange={(e) => updatePlatform(idx, "url", e.target.value)}
                    placeholder="채널 URL"
                    className={inputClass}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        value={entry.subscribers}
                        onChange={(e) => updatePlatform(idx, "subscribers", e.target.value)}
                        placeholder="구독자 수"
                        className={inputClass + " pr-10"}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-toss-gray-400">
                        만
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={entry.avg_views}
                        onChange={(e) => updatePlatform(idx, "avg_views", e.target.value)}
                        placeholder="평균 조회수"
                        className={inputClass + " pr-10"}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-toss-gray-400">
                        만
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 콘텐츠 카테고리 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">
              콘텐츠 카테고리 *
            </label>
            <div className="flex flex-wrap gap-2">
              {AD_CONTENT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setContentCategory(c)}
                  className={`px-4 py-2 rounded-xl text-[14px] font-medium transition ${
                    contentCategory === c
                      ? "bg-toss-blue text-white"
                      : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 광고 유형 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">
              가능한 광고 유형 * (복수 선택)
            </label>
            <div className="flex flex-wrap gap-2">
              {AD_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => toggleAdType(t.key)}
                  className={`px-4 py-2 rounded-xl text-[14px] font-medium transition ${
                    adTypes.includes(t.key)
                      ? "bg-toss-blue text-white"
                      : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 단가 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">광고 단가</label>
            <div className="flex gap-2 mb-3">
              {(
                [
                  { key: "fixed", label: "고정 가격" },
                  { key: "range", label: "범위" },
                  { key: "negotiable", label: "협의" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPricingType(opt.key)}
                  className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition ${
                    pricingType === opt.key
                      ? "bg-toss-blue text-white"
                      : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {pricingType === "fixed" && (
              <div className="relative">
                <input
                  type="number"
                  value={priceFixed}
                  onChange={(e) => setPriceFixed(e.target.value)}
                  placeholder="광고 단가"
                  className={inputClass + " pr-10"}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-toss-gray-400">
                  만원
                </span>
              </div>
            )}

            {pricingType === "range" && (
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
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
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
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

          {/* 자기소개 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              자기소개
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="채널 소개, 콘텐츠 스타일 등을 간단히 적어주세요"
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          {/* 과거 협업 브랜드 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              과거 협업 브랜드
            </label>
            <input
              type="text"
              value={pastBrands}
              onChange={(e) => setPastBrands(e.target.value)}
              placeholder="쉼표로 구분 (예: 삼성, LG, 쿠팡)"
              className={inputClass}
            />
          </div>

          {/* 포트폴리오 URL */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">
              포트폴리오 URL
            </label>
            <textarea
              value={portfolioUrls}
              onChange={(e) => setPortfolioUrls(e.target.value)}
              placeholder="한 줄에 하나씩 URL을 입력해주세요"
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          {error && <p className="text-toss-red text-[13px]">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] disabled:opacity-50 transition hover:bg-[var(--blue-hover)]"
          >
            {saving ? "저장 중..." : editId ? "프로필 수정하기" : "프로필 등록하기"}
          </button>
        </div>
      </div>
    </>
  );
}
