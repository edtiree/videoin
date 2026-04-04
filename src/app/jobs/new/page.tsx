"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

const CATEGORIES = ["영상 편집", "영상 촬영", "썸네일", "모션그래픽"];
const BUDGET_TYPES = [
  { key: "per_project", label: "건당" },
  { key: "per_minute", label: "분당" },
  { key: "hourly", label: "시간당" },
  { key: "monthly", label: "월급" },
  { key: "negotiable", label: "협의" },
];

export default function NewJobPage() {
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    budget_type: "negotiable",
    budget_min: "",
    budget_max: "",
    region: "",
    is_remote: true,
    deadline_type: "always",
    deadline: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) openLoginModal();
  }, [isLoggedIn, openLoginModal]);

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("제목을 입력해주세요"); return; }
    if (!form.category) { setError("카테고리를 선택해주세요"); return; }

    setSaving(true);
    setError("");

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: profile?.id,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        budget_type: form.budget_type,
        budget_min: form.budget_min ? parseInt(form.budget_min) * 10000 : null,
        budget_max: form.budget_max ? parseInt(form.budget_max) * 10000 : null,
        region: form.region || null,
        is_remote: form.is_remote,
        deadline_type: form.deadline_type,
        deadline: form.deadline_type === "date" ? form.deadline : null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "공고 등록에 실패했습니다");
      setSaving(false);
      return;
    }

    router.push(`/jobs/${data.id}`);
  };

  if (!isLoggedIn) return null;

  return (
    <>
      <TopNav title="공고 올리기" backHref="/jobs" />
      <div className="max-w-[640px] mx-auto px-4 py-5">
        <div className="space-y-5">
          {/* 카테고리 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">카테고리 *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, category: c }))}
                  className={`px-4 py-2 rounded-xl text-[14px] font-medium transition ${
                    form.category === c ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">공고 제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="예) 유튜브 롱폼 편집자 구합니다"
              className="w-full h-[48px] rounded-xl border border-toss-gray-200 px-4 text-[15px] focus:outline-none focus:border-toss-blue"
            />
          </div>

          {/* 상세내용 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">상세 내용</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="채널 소개, 작업 내용, 원하는 편집 스타일 등"
              rows={6}
              className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] focus:outline-none focus:border-toss-blue resize-none"
            />
          </div>

          {/* 예산 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">예산</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {BUDGET_TYPES.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setForm((f) => ({ ...f, budget_type: b.key }))}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition ${
                    form.budget_type === b.key ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {form.budget_type !== "negotiable" && (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={form.budget_min}
                  onChange={(e) => setForm((f) => ({ ...f, budget_min: e.target.value }))}
                  placeholder="최소"
                  className="flex-1 h-[44px] rounded-xl border border-toss-gray-200 px-4 text-[14px] focus:outline-none focus:border-toss-blue"
                />
                <span className="text-toss-gray-300">~</span>
                <input
                  type="number"
                  value={form.budget_max}
                  onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value }))}
                  placeholder="최대"
                  className="flex-1 h-[44px] rounded-xl border border-toss-gray-200 px-4 text-[14px] focus:outline-none focus:border-toss-blue"
                />
                <span className="text-[13px] text-toss-gray-400 flex-shrink-0">만원</span>
              </div>
            )}
          </div>

          {/* 재택여부 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">근무 방식</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm((f) => ({ ...f, is_remote: true }))}
                className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition ${
                  form.is_remote ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                }`}
              >
                재택
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, is_remote: false }))}
                className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition ${
                  !form.is_remote ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                }`}
              >
                오프라인
              </button>
            </div>
            {!form.is_remote && (
              <input
                type="text"
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                placeholder="지역 (예: 서울 강남)"
                className="w-full h-[44px] rounded-xl border border-toss-gray-200 px-4 text-[14px] mt-2 focus:outline-none focus:border-toss-blue"
              />
            )}
          </div>

          {/* 마감 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">채용 마감</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm((f) => ({ ...f, deadline_type: "always" }))}
                className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition ${
                  form.deadline_type === "always" ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                }`}
              >
                상시채용
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, deadline_type: "date" }))}
                className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition ${
                  form.deadline_type === "date" ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                }`}
              >
                날짜 지정
              </button>
            </div>
            {form.deadline_type === "date" && (
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full h-[44px] rounded-xl border border-toss-gray-200 px-4 text-[14px] mt-2 focus:outline-none focus:border-toss-blue"
              />
            )}
          </div>

          {error && <p className="text-toss-red text-[13px]">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] disabled:opacity-50 transition hover:bg-[var(--blue-hover)]"
          >
            {saving ? "등록 중..." : "공고 등록하기"}
          </button>
        </div>
      </div>
    </>
  );
}
