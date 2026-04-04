"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

const TITLES: Record<string, string> = {
  "/": "에디트리",
  "/tools": "프로젝트",
  "/profile": "내 정보",
  "/settlement": "정산 관리",
  "/calendar": "달력",
};

export default function MobileTopNav() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  if (!isLoggedIn) return null;

  // 메인 탭 페이지에서만 표시 (하위 페이지는 자체 TopNav 사용)
  const mainPaths = ["/", "/tools", "/profile", "/settlement", "/calendar"];
  const isMainPage = mainPaths.some(p => p === "/" ? pathname === "/" : pathname === p);
  if (!isMainPage) return null;

  const title = TITLES[pathname] || "에디트리";

  return (
    <div className="sticky top-0 z-30 md:hidden">
      {/* safe area 배경 커버 */}
      <div className="bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center justify-between px-5 h-[52px] border-b border-toss-gray-100">
          <h2 className="text-[18px] font-extrabold text-toss-gray-900">{title}</h2>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>
      </div>
    </div>
  );
}
