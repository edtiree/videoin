"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";

export default function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const NAV_ITEMS = [
    { label: "홈", href: "/", match: (p: string) => p === "/" || p.startsWith("/jobs") || p.startsWith("/editors") },
    { label: "커뮤니티", href: "/community", match: (p: string) => p.startsWith("/community") },
    { label: "채팅", href: "/messages", match: (p: string) => p.startsWith("/messages"), auth: true },
    { label: "도구", href: "/tools", match: (p: string) => p.startsWith("/tools") || p.startsWith("/review") || p.startsWith("/instagram-card") || p.startsWith("/youtube-title") || p.startsWith("/youtube-shorts") || p.startsWith("/screen-material"), auth: true },
  ];

  const userPlan = profile?.plan || "free";
  const canAccessManage = userPlan === "team" || userPlan === "enterprise";

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-white border-b border-toss-gray-100">
      <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between">
        {/* 왼쪽: 로고 + 네비 */}
        <div className="flex items-center gap-8">
          {/* 로고 */}
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-toss-blue"><rect width="32" height="32" rx="8" fill="currentColor" opacity="0.1"/><path d="M8 7L16 25L20 16L24 25L24 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 7L16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-[18px] font-extrabold text-toss-gray-900">영상인</span>
          </button>

          {/* 메인 네비 */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.match(pathname);
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    if (item.auth && !isLoggedIn) { openLoginModal(); return; }
                    router.push(item.href);
                  }}
                  className={`px-4 py-2 rounded-lg text-[14px] font-medium transition ${
                    isActive ? "text-toss-gray-900 bg-toss-gray-50 font-semibold" : "text-toss-gray-500 hover:text-toss-gray-900 hover:bg-toss-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {/* 관리 (팀+ 플랜만) */}
            {isLoggedIn && canAccessManage && (
              <div className="relative group">
                <button
                  className={`px-4 py-2 rounded-lg text-[14px] font-medium transition ${
                    pathname.startsWith("/dashboard") || pathname.startsWith("/settlement") || pathname.startsWith("/calendar") || pathname.startsWith("/admin")
                      ? "text-toss-gray-900 bg-toss-gray-50 font-semibold"
                      : "text-toss-gray-500 hover:text-toss-gray-900 hover:bg-toss-gray-50"
                  }`}
                >
                  관리
                </button>
                {/* 드롭다운 */}
                <div className="absolute top-full left-0 mt-1 w-[180px] bg-white border border-toss-gray-100 rounded-xl shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {[
                    { label: "대시보드", href: "/dashboard" },
                    { label: "정산 관리", href: "/settlement" },
                    { label: "촬영 달력", href: "/calendar" },
                    { label: "광고 관리", href: "/ads" },
                    { label: "관리자", href: "/admin" },
                  ].map((sub) => (
                    <button
                      key={sub.href}
                      onClick={() => router.push(sub.href)}
                      className={`w-full text-left px-4 py-2.5 text-[13px] transition ${
                        pathname.startsWith(sub.href)
                          ? "text-toss-blue font-semibold bg-blue-50"
                          : "text-toss-gray-700 hover:bg-toss-gray-50"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>

        {/* 오른쪽: 검색 + 유저 */}
        <div className="flex items-center gap-3">
          {/* 다크모드 */}
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-toss-gray-50 transition text-toss-gray-400">
            {theme === "dark" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>

          {isLoggedIn && profile ? (
            <div className="flex items-center gap-3">
              {/* 프로필 */}
              <button
                onClick={() => router.push("/profile")}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-toss-gray-50 transition"
              >
                {profile.profile_image ? (
                  <img src={profile.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 bg-toss-blue rounded-full flex items-center justify-center">
                    <span className="text-white text-[12px] font-bold">{(profile.nickname || "?")[0]}</span>
                  </div>
                )}
                <span className="text-[13px] font-medium text-toss-gray-700">{profile.nickname || "사용자"}</span>
              </button>

              <button
                onClick={async () => { await signOut(); router.push("/"); }}
                className="text-[13px] text-toss-gray-400 hover:text-toss-gray-600 transition"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-lg hover:bg-[var(--blue-hover)] transition"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
