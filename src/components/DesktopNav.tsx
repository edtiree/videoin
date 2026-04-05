"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CATEGORIES } from "@/lib/categories";

export default function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const userPlan = profile?.plan || "free";
  const canAccessManage = userPlan === "team" || userPlan === "enterprise";

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-white">
      {/* 상단: 로고 + 검색 + 유저 */}
      <div className="border-b border-toss-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between gap-6">
          {/* 로고 */}
          <button onClick={() => router.push("/")} className="flex items-center gap-2 flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-toss-blue"><rect width="32" height="32" rx="8" fill="currentColor" opacity="0.1"/><path d="M8 7L16 25L20 16L24 25L24 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 7L16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-[20px] font-extrabold text-toss-gray-900">영상인</span>
          </button>

          {/* 검색바 */}
          <div className="relative flex-1 max-w-[500px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="어떤 전문가가 필요하세요?"
              className="w-full h-[42px] pl-5 pr-12 rounded-full bg-toss-gray-50 border border-toss-gray-100 text-[14px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue focus:bg-white transition"
            />
            <button onClick={handleSearch} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-toss-blue flex items-center justify-center hover:bg-[var(--blue-hover)] transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </div>

          {/* 오른쪽 메뉴 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLoggedIn && canAccessManage && (
              <div className="relative group">
                <button className="text-[13px] font-medium text-toss-gray-500 hover:text-toss-gray-900 px-3 py-2 transition">
                  팀 관리
                </button>
                <div className="absolute top-full right-0 mt-1 w-[160px] bg-white border border-toss-gray-100 rounded-xl shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {[
                    { label: "대시보드", href: "/dashboard" },
                    { label: "정산 관리", href: "/settlement" },
                    { label: "촬영 달력", href: "/calendar" },
                    { label: "관리자", href: "/admin" },
                  ].map((sub) => (
                    <button key={sub.href} onClick={() => router.push(sub.href)}
                      className={`w-full text-left px-4 py-2 text-[13px] transition ${pathname.startsWith(sub.href) ? "text-toss-blue font-semibold" : "text-toss-gray-700 hover:bg-toss-gray-50"}`}>
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 채팅 */}
            <button onClick={() => { if (!isLoggedIn) { openLoginModal(); return; } router.push("/messages"); }}
              className="p-2 rounded-lg hover:bg-toss-gray-50 transition text-toss-gray-400 relative">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>

            {/* 알림 */}
            <button className="p-2 rounded-lg hover:bg-toss-gray-50 transition text-toss-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>

            {isLoggedIn && profile ? (
              <div className="relative group">
                <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-toss-gray-50 transition">
                  {profile.profile_image ? (
                    <img src={profile.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 bg-toss-blue rounded-full flex items-center justify-center">
                      <span className="text-white text-[12px] font-bold">{(profile.nickname || "?")[0]}</span>
                    </div>
                  )}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-gray-400"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {/* 프로필 드롭다운 */}
                <div className="absolute top-full right-0 mt-1 w-[180px] bg-white border border-toss-gray-100 rounded-xl shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="px-4 py-2 border-b border-toss-gray-50">
                    <p className="text-[14px] font-semibold text-toss-gray-900">{profile.nickname || "사용자"}</p>
                    <p className="text-[11px] text-toss-gray-400">{profile.role?.[0] || ""}</p>
                  </div>
                  <button onClick={() => router.push("/profile")} className="w-full text-left px-4 py-2.5 text-[13px] text-toss-gray-700 hover:bg-toss-gray-50">내 정보</button>
                  <button onClick={() => router.push("/tools")} className="w-full text-left px-4 py-2.5 text-[13px] text-toss-gray-700 hover:bg-toss-gray-50">도구</button>
                  <button onClick={() => router.push("/plans")} className="w-full text-left px-4 py-2.5 text-[13px] text-toss-gray-700 hover:bg-toss-gray-50">플랜</button>
                  <div className="border-t border-toss-gray-50 mt-1 pt-1">
                    <button onClick={async () => { await signOut(); router.push("/"); }} className="w-full text-left px-4 py-2.5 text-[13px] text-toss-red hover:bg-red-50">로그아웃</button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={openLoginModal} className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-lg hover:bg-[var(--blue-hover)] transition">
                로그인
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 하단: 카테고리 네비 */}
      <div className="border-b border-toss-gray-100 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center h-[44px] gap-1">
          {/* 카테고리 메뉴 */}
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="relative" onMouseEnter={() => setHoveredCat(cat.key)} onMouseLeave={() => setHoveredCat(null)}>
              <button
                onClick={() => router.push(`/editors?category=${encodeURIComponent(cat.key)}`)}
                className={`flex items-center gap-1 px-3 py-2 text-[13px] font-medium transition whitespace-nowrap ${
                  hoveredCat === cat.key ? "text-toss-gray-900" : "text-toss-gray-600 hover:text-toss-gray-900"
                }`}
              >
                <span className="text-[15px]">{cat.icon}</span>
                {cat.label}
              </button>

              {/* 세부 카테고리 드롭다운 */}
              {hoveredCat === cat.key && cat.subs.length > 0 && (
                <div className="absolute top-full left-0 mt-0 w-[200px] bg-white border border-toss-gray-100 rounded-xl shadow-lg py-2 z-50">
                  <button onClick={() => router.push(`/editors?category=${encodeURIComponent(cat.key)}`)}
                    className="w-full text-left px-4 py-2 text-[13px] font-semibold text-toss-gray-900 hover:bg-toss-gray-50">
                    {cat.label} 전체
                  </button>
                  <div className="border-t border-toss-gray-50 my-1" />
                  {cat.subs.map((sub) => (
                    <button key={sub.key} onClick={() => router.push(`/editors?category=${encodeURIComponent(cat.key)}&sub=${encodeURIComponent(sub.key)}`)}
                      className="w-full text-left px-4 py-2 text-[13px] text-toss-gray-600 hover:bg-toss-gray-50 hover:text-toss-gray-900">
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex-1" />

          {/* 오른쪽 링크 */}
          <button onClick={() => router.push("/community")}
            className={`px-3 py-2 text-[13px] font-medium transition ${pathname.startsWith("/community") ? "text-toss-gray-900" : "text-toss-gray-500 hover:text-toss-gray-900"}`}>
            커뮤니티
          </button>
          <button onClick={() => { if (!isLoggedIn) { openLoginModal(); return; } router.push("/tools"); }}
            className={`px-3 py-2 text-[13px] font-medium transition ${pathname.startsWith("/tools") ? "text-toss-gray-900" : "text-toss-gray-500 hover:text-toss-gray-900"}`}>
            도구
          </button>
        </div>
      </div>
    </header>
  );
}
