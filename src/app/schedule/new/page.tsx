"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

export default function NewSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [type, setType] = useState(searchParams.get("type") || "personal");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) openLoginModal();
  }, [isLoggedIn, openLoginModal]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요"); return; }
    if (!date) { setError("날짜를 선택해주세요"); return; }

    setSaving(true);
    setError("");

    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: profile?.id,
        type,
        title: title.trim(),
        date,
        time: time || null,
        memo: memo.trim() || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error || "등록 실패"); setSaving(false); return; }

    router.replace("/schedule");
  };

  if (!isLoggedIn) return null;

  return (
    <>
      <TopNav title="일정 등록" backHref="/schedule" rightContent={
        <button onClick={handleSubmit} disabled={saving} className="text-[14px] font-semibold text-toss-blue disabled:opacity-50">
          {saving ? "등록 중" : "등록"}
        </button>
      } />

      <div className="max-w-[600px] mx-auto px-4 py-5 space-y-5">
        {/* 일정 유형 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">일정 유형</label>
          <div className="flex gap-3">
            <button onClick={() => setType("work")}
              className={`flex-1 p-4 rounded-xl border-2 text-left transition ${type === "work" ? "border-toss-blue bg-blue-50" : "border-toss-gray-100"}`}>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-blue"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <p className={`text-[14px] font-semibold ${type === "work" ? "text-toss-blue" : "text-toss-gray-900"}`}>거래 일정</p>
              <p className="text-[11px] text-toss-gray-400">의뢰인과 약속한 일정</p>
            </button>
            <button onClick={() => setType("personal")}
              className={`flex-1 p-4 rounded-xl border-2 text-left transition ${type === "personal" ? "border-toss-orange bg-orange-50" : "border-toss-gray-100"}`}>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-orange"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              </div>
              <p className={`text-[14px] font-semibold ${type === "personal" ? "text-toss-orange" : "text-toss-gray-900"}`}>개인 일정</p>
              <p className="text-[11px] text-toss-gray-400">개인 스케줄 관리</p>
            </button>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">일정 제목</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해 주세요" maxLength={20}
            className="w-full h-[48px] rounded-xl border border-toss-gray-200 px-4 text-[15px] focus:outline-none focus:border-toss-blue" />
          <p className="text-[11px] text-toss-gray-300 mt-1 text-right">{title.length}/20</p>
        </div>

        {/* 날짜 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">날짜</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full h-[48px] rounded-xl border border-toss-gray-200 px-4 text-[15px] focus:outline-none focus:border-toss-blue" />
        </div>

        {/* 시간 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">시간</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full h-[48px] rounded-xl border border-toss-gray-200 px-4 text-[15px] focus:outline-none focus:border-toss-blue" />
        </div>

        {/* 메모 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">메모 (선택)</label>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
            placeholder="메모를 입력해 주세요" rows={4}
            className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] focus:outline-none focus:border-toss-blue resize-none" />
        </div>

        {error && <p className="text-toss-red text-[13px]">{error}</p>}

        {/* 모바일 하단 버튼 */}
        <button onClick={handleSubmit} disabled={saving}
          className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] disabled:opacity-50 transition md:hidden">
          {saving ? "등록 중..." : "등록하기"}
        </button>
      </div>
    </>
  );
}
