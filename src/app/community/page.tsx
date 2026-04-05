"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/NotificationBell";

const CATEGORIES = ["자유", "질문", "노하우", "장터", "홍보", "피드백"];

function getCategoryStyle(cat: string) {
  switch (cat) {
    case "자유": return "text-toss-blue bg-blue-50";
    case "질문": return "text-amber-600 bg-amber-50";
    case "노하우": return "text-purple-600 bg-purple-50";
    case "장터": return "text-toss-orange bg-orange-50";
    case "홍보": return "text-pink-600 bg-pink-50";
    case "피드백": return "text-green-600 bg-green-50";
    default: return "text-toss-blue bg-blue-50";
  }
}

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  image_urls: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  users?: { nickname: string; profile_image: string | null };
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "방금 전";
  if (d < 60) return `${d}분 전`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function CommunityPage() {
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"latest" | "popular">("latest");
  const [showWriteSheet, setShowWriteSheet] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);

  // 바텀시트 열릴 때 배경 스크롤 막기
  useEffect(() => {
    if (showWriteSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showWriteSheet]);

  // 검색 열릴 때 인풋 포커스 + 최근검색어 로드
  useEffect(() => {
    if (showSearch) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
      try {
        const saved = localStorage.getItem("community_recent_searches");
        if (saved) setRecentSearches(JSON.parse(saved));
      } catch { /* empty */ }
    }
  }, [showSearch]);

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1 && !append) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (sortMode === "popular") params.set("sort", "popular");
    params.set("page", String(pageNum));
    params.set("limit", "20");

    try {
      const res = await fetch(`/api/posts?${params}`);
      const json = await res.json();
      const newPosts = json.data || [];
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      setHasMore(newPosts.length >= 20);
    } catch { /* empty */ }
    setLoading(false);
    setLoadingMore(false);
  }, [category, sortMode]);

  // Pull to refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-no-pull]")) { touchStartY.current = 0; return; }
    if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
    else touchStartY.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === 0 || refreshing) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0 && window.scrollY === 0) setPullY(Math.min(dy * 0.4, 80));
    else setPullY(0);
  };
  const handleTouchEnd = async () => {
    if (pullY >= 60 && !refreshing) {
      setRefreshing(true);
      setPullY(60);
      setPage(1);
      setHasMore(true);
      await fetchPosts(1, false);
      setRefreshing(false);
    }
    setPullY(0);
    touchStartY.current = 0;
  };

  // 카테고리/정렬 변경 시 첫 페이지부터
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setPosts([]);
    window.scrollTo(0, 0);
    fetchPosts(1, false);
  }, [fetchPosts]);

  // 무한 스크롤: IntersectionObserver
  useEffect(() => {
    if (!observerRef.current || !hasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPosts]);

  const saveRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 10);
    setRecentSearches(updated);
    try { localStorage.setItem("community_recent_searches", JSON.stringify(updated)); } catch { /* empty */ }
  };

  const removeRecentSearch = (q: string) => {
    const updated = recentSearches.filter(s => s !== q);
    setRecentSearches(updated);
    try { localStorage.setItem("community_recent_searches", JSON.stringify(updated)); } catch { /* empty */ }
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try { localStorage.removeItem("community_recent_searches"); } catch { /* empty */ }
  };

  const handleSearch = async (query?: string) => {
    const q = (query ?? searchQuery).trim();
    if (!q) return;
    if (query) setSearchQuery(q);
    searchInputRef.current?.blur();
    saveRecentSearch(q);
    setSearching(true);
    try {
      const params = new URLSearchParams({ search: q });
      const res = await fetch(`/api/posts?${params}`);
      const json = await res.json();
      setSearchResults(json.data || []);
    } catch { /* empty */ }
    setSearching(false);
  };

  const handleCategoryClick = (cat: string) => {
    setCategory(prev => prev === cat ? null : cat);
    window.scrollTo({ top: 0 });
  };

  // 검색 화면
  if (showSearch) {
    return (
      <div className="min-h-screen">
        {/* 검색 헤더 */}
        <div className="sticky top-0 z-30 bg-white">
          <div className="pt-[env(safe-area-inset-top,0px)]">
            <div className="flex items-center gap-3 px-4 h-[52px] border-b border-toss-gray-100">
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-toss-gray-700"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="flex-1 relative">
                <input
                  ref={searchInputRef}
                  type="search"
                  enterKeyHint="search"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSearch()}
                  placeholder="커뮤니티 글 검색"
                  className="w-full h-[38px] bg-toss-gray-50 rounded-lg px-4 pr-10 text-[14px] border-none focus:outline-none placeholder:text-toss-gray-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setSearchResults([]); searchInputRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-toss-gray-300"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                )}
              </div>
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}
                className="flex-shrink-0 text-[14px] font-medium text-toss-gray-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="max-w-[680px] mx-auto">
          {searching ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-toss-gray-100">
              {searchResults.map((post) => (
                <Link
                  key={post.id}
                  href={`/community/${post.id}`}
                  className="block px-4 py-4 active:bg-toss-gray-50 transition"
                >
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded ${getCategoryStyle(post.category)}`}>
                    {post.category}
                  </span>
                  <div className={`mt-2 ${post.image_urls?.length > 0 ? "flex gap-3" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-bold text-toss-gray-900 line-clamp-2">{post.title}</h3>
                      <p className="text-[14px] text-toss-gray-500 line-clamp-2 mt-1 leading-relaxed">{post.content}</p>
                    </div>
                    {post.image_urls?.length > 0 && (
                      <img src={post.image_urls[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-[12px] text-toss-gray-400">
                    <span>{post.users?.nickname || "익명"} · {timeAgo(post.created_at)} · 조회 {post.view_count}</span>
                    {post.comment_count > 0 && (
                      <span className="flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {post.comment_count}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : searchQuery && !searching ? (
            <div className="text-center py-20">
              <p className="text-toss-gray-400 text-[15px]">검색 결과가 없습니다</p>
              <p className="text-toss-gray-300 text-[13px] mt-1">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            /* 최근 검색어 */
            <div className="px-4 pt-5">
              {recentSearches.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[15px] font-bold text-toss-gray-900">최근 검색</span>
                    <button onClick={clearAllRecentSearches} className="text-[13px] text-toss-gray-400">전체 삭제</button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((q) => (
                      <div key={q} className="flex items-center justify-between py-2.5">
                        <button
                          onClick={() => handleSearch(q)}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-gray-300 flex-shrink-0">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          <span className="text-[14px] text-toss-gray-700 truncate">{q}</span>
                        </button>
                        <button
                          onClick={() => removeRecentSearch(q)}
                          className="flex-shrink-0 p-1 text-toss-gray-300"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {recentSearches.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-toss-gray-400 text-[15px]">검색어를 입력해주세요</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-20 bg-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh 인디케이터 */}
      {(pullY > 0 || refreshing) && (
        <div
          className="fixed left-0 right-0 z-[60] flex justify-center transition-transform"
          style={{ top: `calc(env(safe-area-inset-top, 0px) + 100px)`, transform: `translateY(${pullY - 30}px)` }}
        >
          <div className={`w-8 h-8 rounded-full bg-white shadow-lg border border-toss-gray-100 flex items-center justify-center ${refreshing ? "animate-spin" : ""}`}>
            {refreshing ? (
              <div className="w-4 h-4 border-2 border-toss-gray-200 border-t-toss-blue rounded-full" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-toss-gray-500 transition-transform ${pullY >= 60 ? "rotate-180" : ""}`}>
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            )}
          </div>
        </div>
      )}

      {/* 커스텀 헤더 + 필터 칩 - 모바일 (fixed) */}
      <div className="fixed top-0 left-0 right-0 z-30 md:hidden bg-white">
        <div className="pt-[env(safe-area-inset-top,0px)]" />
        <div className="flex items-center justify-between px-5 h-[52px]">
          <h2 className="text-[18px] font-extrabold text-toss-gray-900">커뮤니티</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 flex items-center justify-center text-toss-gray-700"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            <NotificationBell />
          </div>
        </div>
        {/* 필터 칩 (헤더에 포함) */}
        <div className="border-t border-b border-toss-gray-100" data-no-pull>
        <div className="max-w-[680px] mx-auto flex items-center px-4 py-3">
          {/* 정렬 드롭다운 (고정) */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="px-3 h-[32px] rounded-full text-[13px] font-medium transition flex items-center gap-1 bg-white border border-toss-gray-200 text-toss-gray-700"
            >
              {sortMode === "latest" ? "최신" : "인기"}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${showSortDropdown ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showSortDropdown && typeof window !== "undefined" && createPortal(
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setShowSortDropdown(false)} />
                <div className="fixed z-[9999] bg-white rounded-xl shadow-lg border border-toss-gray-100 py-1 min-w-[120px]"
                  style={{ top: `calc(env(safe-area-inset-top, 0px) + 52px + 44px)`, left: "16px" }}>
                  <button
                    onClick={() => { setSortMode("latest"); setShowSortDropdown(false); window.scrollTo({ top: 0 }); }}
                    className={`w-full px-4 py-2.5 text-left text-[14px] hover:bg-toss-gray-50 ${sortMode === "latest" ? "text-toss-blue font-semibold" : "text-toss-gray-700"}`}
                  >
                    최신순
                  </button>
                  <button
                    onClick={() => { setSortMode("popular"); setShowSortDropdown(false); window.scrollTo({ top: 0 }); }}
                    className={`w-full px-4 py-2.5 text-left text-[14px] hover:bg-toss-gray-50 ${sortMode === "popular" ? "text-toss-blue font-semibold" : "text-toss-gray-700"}`}
                  >
                    인기순
                  </button>
                </div>
              </>,
              document.body
            )}
          </div>

          <div className="w-px h-[20px] bg-toss-gray-200 mx-2 flex-shrink-0" />

          {/* 카테고리 칩 (스크롤) */}
          <div className="flex gap-2 overflow-x-auto overflow-y-hidden scrollbar-hide touch-pan-x">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryClick(c)}
                className={`flex-shrink-0 px-3 h-[32px] rounded-full text-[13px] font-medium transition ${
                  category === c
                    ? "bg-toss-gray-900 text-white"
                    : "bg-white border border-toss-gray-200 text-toss-gray-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* 모바일 헤더+필터 높이만큼 스페이서 */}
      <div className="h-[calc(52px+50px+env(safe-area-inset-top,0px))] md:hidden" />

      {/* 데스크톱 헤더 */}
      <div className="hidden md:block max-w-[680px] mx-auto px-4 pt-6 pb-2">
        <h1 className="text-[24px] font-extrabold text-toss-gray-900">커뮤니티</h1>
      </div>

      {/* 데스크톱 필터 칩 */}
      <div className="hidden md:block sticky top-0 z-20 bg-white border-b border-toss-gray-100">
        <div className="max-w-[680px] mx-auto flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
          <button
            onClick={() => setSortMode("latest")}
            className={`flex-shrink-0 px-3 h-[32px] rounded-full text-[13px] font-medium transition flex items-center gap-1 ${
              sortMode === "latest" ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-200 text-toss-gray-600"
            }`}
          >최신</button>
          <button
            onClick={() => setSortMode("popular")}
            className={`flex-shrink-0 px-3 h-[32px] rounded-full text-[13px] font-medium transition flex items-center gap-1 ${
              sortMode === "popular" ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-200 text-toss-gray-600"
            }`}
          >인기</button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => handleCategoryClick(c)}
              className={`flex-shrink-0 px-3 h-[32px] rounded-full text-[13px] font-medium transition ${
                category === c ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-200 text-toss-gray-600"
              }`}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="max-w-[680px] mx-auto">
        {loading && !refreshing ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 && !loading ? (
          <div className="text-center py-20">
            <p className="text-toss-gray-400 text-[15px]">아직 게시글이 없습니다</p>
            <button
              onClick={() => isLoggedIn ? setShowWriteSheet(true) : openLoginModal()}
              className="mt-3 text-[14px] font-semibold text-toss-blue"
            >
              첫 글 작성하기
            </button>
          </div>
        ) : (
          <div className="divide-y divide-toss-gray-100">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block px-4 py-4 active:bg-toss-gray-50 transition"
              >
                {/* 카테고리 뱃지 */}
                <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded ${getCategoryStyle(post.category)}`}>
                  {post.category}
                </span>

                {/* 제목 + 썸네일 */}
                <div className={`mt-2 ${post.image_urls?.length > 0 ? "flex gap-3" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-bold text-toss-gray-900 line-clamp-2">{post.title}</h3>
                    <p className="text-[14px] text-toss-gray-500 line-clamp-2 mt-1 leading-relaxed">{post.content}</p>
                  </div>
                  {post.image_urls?.length > 0 && (
                    <div className="relative flex-shrink-0">
                      <img
                        src={post.image_urls[0]}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                      {post.image_urls.length > 1 && (
                        <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {post.image_urls.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 하단 메타 */}
                <div className="flex items-center justify-between mt-3 text-[12px] text-toss-gray-400">
                  <span>
                    {post.users?.nickname || "익명"} · {timeAgo(post.created_at)} · 조회 {post.view_count}
                  </span>
                  {post.comment_count > 0 && (
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      {post.comment_count}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        {/* 무한 스크롤 트리거 */}
        {!loading && hasMore && (
          <div ref={observerRef} className="flex justify-center py-6">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* 플로팅 글쓰기 버튼 */}
      <button
        onClick={() => {
          if (!isLoggedIn) { openLoginModal(); return; }
          router.push("/community/new");
        }}
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 bg-toss-blue text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--blue-hover)] transition z-40 active:scale-95"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
      </button>

      {/* 카테고리 선택 바텀시트 */}
      {showWriteSheet && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center" onTouchMove={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWriteSheet(false)} />
          <div className="relative bg-white dark:bg-[var(--surface)] w-full md:w-[400px] md:rounded-2xl rounded-t-2xl pb-[env(safe-area-inset-bottom,16px)] animate-slide-up max-h-[80vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-[18px] font-bold text-toss-gray-900">어떤 글을 쓸까요?</h3>
              <button onClick={() => setShowWriteSheet(false)} className="text-toss-gray-400 p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-3 pb-3">
              {[
                { key: "자유", icon: "💬", desc: "자유롭게 이야기해요" },
                { key: "질문", icon: "❓", desc: "궁금한 걸 물어봐요" },
                { key: "노하우", icon: "💡", desc: "작업 팁을 공유해요" },
                { key: "장터", icon: "🏪", desc: "장비·라이선스 사고팔아요" },
                { key: "홍보", icon: "📢", desc: "내 서비스를 알려요" },
                { key: "피드백", icon: "🎬", desc: "내 작업물 피드백 받아요" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setShowWriteSheet(false);
                    router.push(`/community/new?category=${encodeURIComponent(item.key)}`);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-toss-gray-50 transition text-left"
                >
                  <span className="text-[24px]">{item.icon}</span>
                  <div>
                    <p className="text-[15px] font-semibold text-toss-gray-900">{item.key}</p>
                    <p className="text-[12px] text-toss-gray-400">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
