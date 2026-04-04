"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "프리", color: "bg-toss-gray-200 text-toss-gray-600" },
  creator: { label: "크리에이터", color: "bg-blue-100 text-toss-blue" },
  team: { label: "팀", color: "bg-purple-100 text-purple-600" },
  enterprise: { label: "엔터프라이즈", color: "bg-amber-100 text-amber-700" },
};

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const { isLoggedIn, profile, signOut, openLoginModal } = useAuth();
  const [worker, setWorker] = useState<Record<string, unknown> | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!isLoggedIn) { openLoginModal(); return; }
    const saved = localStorage.getItem("worker");
    if (saved) try { setWorker(JSON.parse(saved)); } catch {}
  }, [isLoggedIn, openLoginModal]);

  if (!isLoggedIn || !profile) return <div className="min-h-full bg-gray-50" />;

  const name = profile.nickname || (worker?.name as string) || "사용자";
  const planInfo = PLAN_LABELS[profile.plan] || PLAN_LABELS.free;
  const canManage = profile.plan === "team" || profile.plan === "enterprise";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    await signOut();
    router.push("/");
  };

  return (
    <div className="min-h-full bg-gray-50 pb-20">
      <div className="max-w-[640px] mx-auto px-4 mt-4 space-y-4">

        {/* 프로필 헤더 */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {profile.profile_image ? (
                <img
                  src={profile.profile_image}
                  alt={name}
                  className="w-14 h-14 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 bg-toss-blue rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{name[0]}</span>
                </div>
              )}
              <div>
                <p className="text-[18px] font-bold text-toss-gray-900">{name}</p>
                {profile.role.length > 0 && (
                  <p className="text-[12px] text-toss-gray-400 mt-0.5">
                    {profile.role.join(", ")}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => router.push("/profile/edit")}
              className="px-3 py-1.5 rounded-lg border border-toss-gray-200 text-[13px] font-medium text-toss-gray-500 hover:bg-toss-gray-50 transition"
            >
              편집
            </button>
          </div>

          {/* 플랜 카드 */}
          <button
            onClick={() => router.push("/plans")}
            className="w-full mt-4 bg-toss-gray-900 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${planInfo.color}`}>
                {planInfo.label}
              </span>
              <span className="text-[14px] text-white font-medium">현재 플랜</span>
            </div>
            <span className="text-[13px] text-toss-gray-400">변경하기 &gt;</span>
          </button>
        </div>

        {/* 활동 관리 */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden">
          <p className="px-5 pt-4 pb-2 text-[14px] font-bold text-toss-gray-900">활동 관리</p>

          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>}
            label="내 공고 관리"
            badge={planInfo.label}
            badgeColor={planInfo.color}
            onClick={() => router.push(`/jobs?user_id=${profile.id}`)}
          />
          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
            label="내 포트폴리오"
            onClick={() => router.push("/portfolio/edit")}
          />
          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
            label="쪽지함"
            onClick={() => router.push("/messages")}
          />
          <MenuItem
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
            label="받은 리뷰"
            onClick={() => showToast("리뷰 페이지 준비 중")}
            isLast
          />
        </div>

        {/* 팀 관리 (팀+ 플랜만) */}
        {canManage && (
          <div className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden">
            <p className="px-5 pt-4 pb-2 text-[14px] font-bold text-toss-gray-900">팀 관리</p>

            <MenuItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
              label="대시보드"
              onClick={() => router.push("/dashboard")}
            />
            <MenuItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>}
              label="정산 관리"
              onClick={() => router.push("/settlement")}
            />
            <MenuItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>}
              label="촬영 달력"
              onClick={() => router.push("/calendar")}
            />
            <MenuItem
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              label="직원 관리"
              onClick={() => router.push("/admin")}
              isLast
            />
          </div>
        )}

        {/* CTA 배너 */}
        {!canManage && (
          <button
            onClick={() => router.push("/plans")}
            className="w-full bg-gradient-to-r from-toss-blue to-indigo-500 rounded-2xl p-5 text-left"
          >
            <p className="text-[13px] text-white/70">팀 플랜으로 업그레이드하고</p>
            <p className="text-[16px] font-bold text-white mt-0.5">정산·달력·직원관리를 시작하세요</p>
          </button>
        )}

        {/* 설정 */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden">
          <p className="px-5 pt-4 pb-2 text-[14px] font-bold text-toss-gray-900">설정</p>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-5 py-3.5 border-b border-toss-gray-50 hover:bg-toss-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-toss-gray-500">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <span className="text-[14px] text-toss-gray-900">다크 모드</span>
            </div>
            <div className={`w-11 h-6 rounded-full relative transition-colors ${theme === "dark" ? "bg-toss-blue" : "bg-toss-gray-300"}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </div>
          </button>

          <button
            onClick={() => showToast("알림 설정 준비 중")}
            className="w-full flex items-center justify-between px-5 py-3.5 border-b border-toss-gray-50 hover:bg-toss-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-toss-gray-500">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="text-[14px] text-toss-gray-900">알림 설정</span>
            </div>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-toss-gray-300"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-toss-red">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="text-[14px] text-toss-red">로그아웃</span>
          </button>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-toss-gray-900 text-white text-[14px] px-6 py-3 rounded-xl shadow-lg animate-slide-up z-[9999]">
          {toast}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, badge, badgeColor, onClick, isLast }: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-toss-gray-50 transition ${
        !isLast ? "border-b border-toss-gray-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-toss-gray-500">{icon}</span>
        <span className="text-[14px] text-toss-gray-900">{label}</span>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-toss-gray-300"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  );
}
