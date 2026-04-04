"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

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

  // 홈은 비로그인에서도 표시, 나머지는 로그인 필요
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
            {isLoggedIn && <NotificationBell />}
          </div>
        </div>
      </div>
    </div>
  );
}
