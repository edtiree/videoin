"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseAuthBrowser } from "@/lib/supabase-auth-browser";

const ROLES = [
  {
    id: "크리에이터/사장",
    label: "크리에이터 / 사장",
    desc: "영상 제작을 의뢰하거나 팀을 운영해요",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" opacity="0.2" stroke="none"/>
        <polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
  },
  {
    id: "편집자/스태프",
    label: "편집자 / 스태프",
    desc: "영상 편집, 촬영, 썸네일 등 작업을 해요",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" fill="currentColor" opacity="0.1" stroke="none"/>
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    id: "배우/출연자",
    label: "배우 / 출연자",
    desc: "영상 출연이나 연기 일을 찾고 있어요",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4" fill="currentColor" opacity="0.1" stroke="none"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function RoleSelectionModal() {
  const { showRoleModal, closeRoleModal, profile, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nickname, setNickname] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const nicknameTimer = useRef<NodeJS.Timeout | null>(null);
  const [saving, setSaving] = useState(false);

  if (!showRoleModal || !profile) return null;

  const supabase = getSupabaseAuthBrowser();

  const toggleRole = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const checkNickname = (value: string) => {
    setNickname(value);
    if (nicknameTimer.current) clearTimeout(nicknameTimer.current);
    if (!value.trim()) { setNicknameStatus("idle"); return; }

    setNicknameStatus("checking");
    nicknameTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/users/check-nickname?nickname=${encodeURIComponent(value.trim())}&exclude_id=${profile.id}`);
      const data = await res.json();
      setNicknameStatus(data.available ? "available" : "taken");
    }, 500);
  };

  const handleSave = async () => {
    if (!nickname.trim() || nicknameStatus === "taken") return;
    setSaving(true);

    const updates: Record<string, unknown> = { role: Array.from(selected) };
    if (nickname.trim()) updates.nickname = nickname.trim();

    await supabase
      .from("users")
      .update(updates)
      .eq("id", profile.id);

    await refreshProfile();
    setSaving(false);
    closeRoleModal();
  };

  const handleSkip = () => {
    closeRoleModal();
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative bg-white dark:bg-[var(--surface)] w-full md:w-[420px] md:rounded-2xl rounded-t-2xl p-6 pb-[env(safe-area-inset-bottom,24px)] animate-slide-up">
        <div className="text-center mb-6 mt-2">
          <h2 className="text-[20px] font-bold text-toss-gray-900">프로필을 설정해주세요</h2>
          <p className="text-toss-gray-400 text-[14px] mt-1">닉네임과 역할을 선택해주세요</p>
        </div>

        {/* 닉네임 */}
        <div className="mb-5">
          <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">닉네임 *</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => checkNickname(e.target.value)}
            placeholder="사용할 닉네임을 입력하세요"
            maxLength={20}
            className={`w-full h-[48px] rounded-xl border px-4 text-[15px] focus:outline-none transition ${
              nicknameStatus === "taken" ? "border-toss-red" :
              nicknameStatus === "available" ? "border-toss-green" :
              "border-toss-gray-200 focus:border-toss-blue"
            }`}
          />
          {nicknameStatus !== "idle" && (
            <p className={`text-[11px] mt-1 ${
              nicknameStatus === "checking" ? "text-toss-gray-400" :
              nicknameStatus === "available" ? "text-toss-green" : "text-toss-red"
            }`}>
              {nicknameStatus === "checking" ? "확인 중..." :
               nicknameStatus === "available" ? "사용 가능한 닉네임입니다" : "이미 사용 중인 닉네임입니다"}
            </p>
          )}
        </div>

        <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">역할 (복수 선택 가능)</label>
        <div className="space-y-3 mb-6">
          {ROLES.map((role) => {
            const isSelected = selected.has(role.id);
            return (
              <button
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? "border-toss-blue bg-blue-50 dark:bg-blue-950/30"
                    : "border-toss-gray-100 hover:border-toss-gray-200"
                }`}
              >
                <div className={`flex-shrink-0 ${isSelected ? "text-toss-blue" : "text-toss-gray-400"}`}>
                  {role.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-semibold ${isSelected ? "text-toss-blue" : "text-toss-gray-900"}`}>
                    {role.label}
                  </p>
                  <p className="text-[13px] text-toss-gray-400 mt-0.5">{role.desc}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                  isSelected ? "border-toss-blue bg-toss-blue" : "border-toss-gray-200"
                }`}>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !nickname.trim() || nicknameStatus === "taken" || nicknameStatus === "checking"}
          className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] disabled:opacity-50 transition mb-3"
        >
          {saving ? "저장 중..." : "시작하기"}
        </button>

        <button
          onClick={handleSkip}
          className="w-full h-[44px] rounded-xl text-toss-gray-400 text-[14px] hover:bg-toss-gray-50 transition"
        >
          건너뛰기
        </button>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
