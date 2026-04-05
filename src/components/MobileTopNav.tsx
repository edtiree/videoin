"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import MobileSearchBar from "@/components/MobileSearchBar";

const TITLES: Record<string, string> = {
  "/": "영상인",
  "/community": "커뮤니티",
  "/tools": "도구",
  "/profile": "내 정보",
  "/dashboard": "대시보드",
  "/settlement": "정산 관리",
  "/calendar": "달력",
  "/messages": "채팅",
};

export default function MobileTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("worker"));
  }, []);

  useEffect(() => {
    const onLogin = () => setIsLoggedIn(true);
    const onLogout = () => setIsLoggedIn(false);
    window.addEventListener("worker-login", onLogin);
    window.addEventListener("worker-logout", onLogout);
    return () => {
      window.removeEventListener("worker-login", onLogin);
      window.removeEventListener("worker-logout", onLogout);
    };
  }, []);

  // 페이지 이동 시 검색바 닫기
  useEffect(() => {
    setShowSearch(false);
  }, [pathname]);

  // 홈은 비로그인에서도 표시, 나머지는 로그인 필요
  // 커뮤니티 페이지는 자체 헤더 사용
  if (pathname === "/community") return null;

  const mainPaths = ["/", "/community", "/tools", "/profile", "/dashboard", "/settlement", "/calendar", "/messages"];
  const isMainPage = mainPaths.some(p => p === "/" ? pathname === "/" : pathname === p);
  if (!isMainPage) return null;
  if (pathname !== "/" && !isLoggedIn) return null;

  const title = TITLES[pathname] || "영상인";

  return (
    <div className="sticky top-0 z-30 md:hidden">
      <div className="bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-5 h-[52px] border-b border-toss-gray-100">
          <h2 className="text-[18px] font-extrabold text-toss-gray-900 cursor-pointer" onClick={() => router.push("/")}>{title}</h2>
          <div className="flex items-center gap-2">
            {/* 검색 */}
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="p-2 rounded-lg hover:bg-toss-gray-50 transition text-toss-gray-400"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            {isLoggedIn && <NotificationBell />}
          </div>
        </div>
        {/* 검색바 토글 */}
        {showSearch && (
          <MobileSearchBar onClose={() => setShowSearch(false)} />
        )}
      </div>
    </div>
  );
}
