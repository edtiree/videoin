"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

const NAV_ITEMS = [
  {
    key: "home", label: "홈", href: "/",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>{!a&&<polyline points="9 22 9 12 15 12 15 22"/>}</svg>,
  },
  {
    key: "project", label: "프로젝트", href: "/tools",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    key: "settlement", label: "정산", href: "/settlement",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  },
  {
    key: "calendar", label: "달력", href: "/calendar",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  },
  {
    key: "profile", label: "내 정보", href: "/profile",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

const PROJECT_ITEMS = [
  { label: "영상 피드백", href: "/review/new" },
  { label: "인스타 카드뉴스", href: "/instagram-card" },
  { label: "유튜브 제목", href: "/youtube-title/new" },
  { label: "유튜브/인스타 숏폼", href: "/youtube-shorts/new" },
  { label: "화면자료", href: "/screen-material/new" },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [workerName, setWorkerName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (saved) {
      try {
        const w = JSON.parse(saved);
        setIsLoggedIn(true);
        setWorkerName(w.name || "");
      } catch { setIsLoggedIn(false); }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    const onLogin = () => {
      setIsLoggedIn(true);
      try { setWorkerName(JSON.parse(localStorage.getItem("worker") || "{}").name || ""); } catch {}
    };
    const onLogout = () => setIsLoggedIn(false);
    window.addEventListener("worker-login", onLogin);
    window.addEventListener("worker-logout", onLogout);
    return () => {
      window.removeEventListener("worker-login", onLogin);
      window.removeEventListener("worker-logout", onLogout);
    };
  }, []);

  if (!isLoggedIn) return null;

  const activeTab = pathname === "/" ? "home"
    : (pathname.startsWith("/tools") || pathname.startsWith("/review") || pathname.startsWith("/instagram-card") || pathname.startsWith("/youtube-title") || pathname.startsWith("/youtube-shorts") || pathname.startsWith("/screen-material")) ? "project"
    : pathname.startsWith("/settlement") ? "settlement"
    : pathname.startsWith("/calendar") ? "calendar"
    : pathname.startsWith("/profile") ? "profile"
    : null;

  return (
    <aside className="hidden md:flex flex-col w-[220px] h-screen bg-white border-r border-toss-gray-100 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-[18px] font-extrabold text-toss-gray-900 cursor-pointer" onClick={() => router.push("/")}>
          에디트리
        </h2>
        <p className="text-[12px] text-toss-gray-400 mt-0.5">{workerName}</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
                isActive ? "bg-toss-gray-50 text-toss-gray-900" : "text-toss-gray-500 hover:bg-toss-gray-50"
              }`}
            >
              {item.icon(isActive)}
              <span className={`text-[14px] ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="border-t border-toss-gray-100 my-3" />

        {/* 새 작업 */}
        <p className="px-3 text-[11px] font-bold text-toss-gray-400 uppercase mb-2">새 작업</p>
        {PROJECT_ITEMS.map((item) => {
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
          onClick={() => {
            localStorage.removeItem("worker");
            window.dispatchEvent(new Event("worker-logout"));
            router.push("/");
          }}
          className="w-full px-3 py-2 text-[13px] text-toss-gray-400 hover:text-toss-red rounded-xl hover:bg-red-50 transition text-left"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
