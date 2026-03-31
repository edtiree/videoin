"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  {
    key: "home", label: "홈", href: "/",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"#191f28":"none"} stroke={a?"#191f28":"#8b95a1"} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>{!a&&<polyline points="9 22 9 12 15 12 15 22"/>}</svg>,
  },
  {
    key: "tools", label: "프로젝트", href: "/tools",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"#191f28":"none"} stroke={a?"#191f28":"#8b95a1"} strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    key: "profile", label: "내 정보", href: "/profile",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill={a?"#191f28":"none"} stroke={a?"#191f28":"#8b95a1"} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

const NEW_WORK_ITEMS = [
  { label: "영상 리뷰", href: "/review?new=true" },
  { label: "카드뉴스 메이커", href: "/instagram-card" },
  { label: "제목 생성기", href: "/youtube-title/new" },
  { label: "쇼츠 제작기", href: "/youtube-shorts?new=true" },
  { label: "화면자료 제작기", href: "/screen-material?new=true" },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
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
  }, [pathname]);

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
    : pathname.startsWith("/tools") ? "tools"
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
        {NEW_WORK_ITEMS.map((item) => {
          const basePath = item.href.split("?")[0];
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

        {/* Divider */}
        <div className="border-t border-toss-gray-100 my-3" />

        {/* 바로가기 */}
        <p className="px-3 text-[11px] font-bold text-toss-gray-400 uppercase mb-2">바로가기</p>
        <button onClick={() => router.push("/settlement")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-0.5 text-left transition-all ${pathname.startsWith("/settlement") ? "bg-blue-50 text-toss-blue font-semibold" : "text-toss-gray-500 hover:bg-toss-gray-50"}`}>
          <span className="text-[13px]">💰 정산 관리</span>
        </button>
        <button onClick={() => router.push("/calendar")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-0.5 text-left transition-all ${pathname.startsWith("/calendar") ? "bg-blue-50 text-toss-blue font-semibold" : "text-toss-gray-500 hover:bg-toss-gray-50"}`}>
          <span className="text-[13px]">📅 촬영 일정</span>
        </button>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4">
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
