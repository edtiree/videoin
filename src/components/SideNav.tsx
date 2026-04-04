"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import PlanGateModal from "@/components/PlanGateModal";

const AI_TOOL_ITEMS = [
  { label: "영상 피드백", href: "/review/new" },
  { label: "인스타 카드뉴스", href: "/instagram-card" },
  { label: "유튜브 제목", href: "/youtube-title/new" },
  { label: "유튜브/인스타 숏폼", href: "/youtube-shorts/new" },
  { label: "화면자료", href: "/screen-material/new" },
];

const MANAGE_ITEMS = [
  { label: "대시보드", href: "/dashboard" },
  { label: "정산 관리", href: "/settlement" },
  { label: "촬영 달력", href: "/calendar" },
  { label: "광고 관리", href: "/ads" },
  { label: "관리자", href: "/admin" },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const { isLoggedIn, profile, openLoginModal, signOut } = useAuth();
  const [workerName, setWorkerName] = useState("");
  const [showPlanGate, setShowPlanGate] = useState(false);
  const [gatePlan, setGatePlan] = useState("team");

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (saved) {
      try { setWorkerName(JSON.parse(saved).name || ""); } catch {}
    }
  }, []);

  useEffect(() => {
    const onLogin = () => {
      try { setWorkerName(JSON.parse(localStorage.getItem("worker") || "{}").name || ""); } catch {}
    };
    window.addEventListener("worker-login", onLogin);
    return () => window.removeEventListener("worker-login", onLogin);
  }, []);

  if (!isLoggedIn) return null;

  const userPlan = profile?.plan || "free";
  const canAccessTools = userPlan === "creator" || userPlan === "team" || userPlan === "enterprise";
  const canAccessManage = userPlan === "team" || userPlan === "enterprise";

  const activeSection =
    pathname === "/" || pathname.startsWith("/jobs") || pathname.startsWith("/editors") ? "home"
    : (pathname.startsWith("/tools") || pathname.startsWith("/review") || pathname.startsWith("/instagram-card") || pathname.startsWith("/youtube-title") || pathname.startsWith("/youtube-shorts") || pathname.startsWith("/screen-material")) ? "ai"
    : (pathname.startsWith("/dashboard") || pathname.startsWith("/settlement") || pathname.startsWith("/calendar") || pathname.startsWith("/admin") || pathname.startsWith("/ads")) ? "manage"
    : pathname.startsWith("/profile") || pathname.startsWith("/messages") ? "me"
    : null;

  return (
    <>
      <aside className="hidden md:flex flex-col w-[220px] h-screen bg-white border-r border-toss-gray-100 fixed left-0 top-0 z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <h2 className="text-[18px] font-extrabold text-toss-gray-900 cursor-pointer flex items-center gap-2" onClick={() => router.push("/")}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-toss-blue"><rect width="32" height="32" rx="8" fill="currentColor" opacity="0.1"/><path d="M8 7L16 25L20 16L24 25L24 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 7L16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            영상인
          </h2>
          <p className="text-[12px] text-toss-gray-400 mt-0.5">{workerName}</p>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          {/* 홈 (구인구직) */}
          <button
            onClick={() => router.push("/")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
              activeSection === "home" ? "bg-toss-gray-50 text-toss-gray-900" : "text-toss-gray-500 hover:bg-toss-gray-50"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={activeSection === "home" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>{activeSection !== "home" && <polyline points="9 22 9 12 15 12 15 22"/>}</svg>
            <span className={`text-[14px] ${activeSection === "home" ? "font-bold" : "font-medium"}`}>홈</span>
          </button>

          {/* AI 툴 */}
          <button
            onClick={() => {
              if (!canAccessTools) { setGatePlan("creator"); setShowPlanGate(true); return; }
              router.push("/tools");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
              activeSection === "ai" ? "bg-toss-gray-50 text-toss-gray-900" : "text-toss-gray-500 hover:bg-toss-gray-50"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={activeSection === "ai" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            <span className={`text-[14px] ${activeSection === "ai" ? "font-bold" : "font-medium"}`}>AI 툴</span>
          </button>

          {/* AI 툴 서브메뉴 */}
          {activeSection === "ai" && canAccessTools && (
            <div className="ml-3 mb-2">
              {AI_TOOL_ITEMS.map((item) => {
                const basePath = "/" + item.href.split("/")[1];
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-0.5 text-left transition-all ${
                      pathname.startsWith(basePath) ? "bg-blue-50 text-toss-blue font-semibold" : "text-toss-gray-500 hover:bg-toss-gray-50"
                    }`}
                  >
                    <span className="text-[13px]">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 관리 */}
          <button
            onClick={() => {
              if (!canAccessManage) { setGatePlan("team"); setShowPlanGate(true); return; }
              router.push("/dashboard");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
              activeSection === "manage" ? "bg-toss-gray-50 text-toss-gray-900" : "text-toss-gray-500 hover:bg-toss-gray-50"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={activeSection === "manage" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span className={`text-[14px] ${activeSection === "manage" ? "font-bold" : "font-medium"}`}>관리</span>
          </button>

          {/* 관리 서브메뉴 */}
          {activeSection === "manage" && canAccessManage && (
            <div className="ml-3 mb-2">
              {MANAGE_ITEMS.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-0.5 text-left transition-all ${
                    pathname.startsWith(item.href) ? "bg-blue-50 text-toss-blue font-semibold" : "text-toss-gray-500 hover:bg-toss-gray-50"
                  }`}
                >
                  <span className="text-[13px]">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* 내 정보 */}
          <button
            onClick={() => router.push("/profile")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
              activeSection === "me" ? "bg-toss-gray-50 text-toss-gray-900" : "text-toss-gray-500 hover:bg-toss-gray-50"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={activeSection === "me" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className={`text-[14px] ${activeSection === "me" ? "font-bold" : "font-medium"}`}>내 정보</span>
          </button>
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-toss-gray-50 transition"
          >
            <span className="text-[13px] text-toss-gray-500">
              {theme === "dark" ? "라이트 모드" : "다크 모드"}
            </span>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${theme === "dark" ? "bg-toss-blue" : "bg-toss-gray-300"}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </div>
          </button>
          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="w-full px-3 py-2 text-[13px] text-toss-gray-400 hover:text-toss-red rounded-xl hover:bg-red-50 transition text-left"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <PlanGateModal open={showPlanGate} onClose={() => setShowPlanGate(false)} requiredPlan={gatePlan} />
    </>
  );
}
