"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

const CATEGORY_INFO: Record<string, { icon: string; desc: string }> = {
  "자유": { icon: "💬", desc: "자유롭게 이야기해요" },
  "질문": { icon: "❓", desc: "궁금한 걸 물어봐요" },
  "노하우": { icon: "💡", desc: "작업 팁을 공유해요" },
  "장터": { icon: "🏪", desc: "장비·라이선스 사고팔아요" },
  "홍보": { icon: "📢", desc: "내 서비스를 알려요" },
  "피드백": { icon: "🎬", desc: "내 작업물 피드백 받아요" },
};

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

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "방금 전";
  if (d < 60) return `${d}분 전`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function CategoryPage() {
  const { name } = useParams();
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const categoryName = decodeURIComponent(name as string);
  const info = CATEGORY_INFO[categoryName] || { icon: "📝", desc: "" };

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1 && !append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ category: categoryName, page: String(pageNum), limit: "20" });
      const res = await fetch(`/api/posts?${params}`);
      const json = await res.json();
      const newPosts = json.data || [];
      if (append) setPosts(prev => [...prev, ...newPosts]);
      else setPosts(newPosts);
      setHasMore(newPosts.length >= 20);
    } catch { /* empty */ }
    setLoading(false);
    setLoadingMore(false);
  }, [categoryName]);

  useEffect(() => { setPage(1); setHasMore(true); fetchPosts(1); }, [fetchPosts]);

  // 무한 스크롤
  useEffect(() => {
    if (!observerRef.current || !hasMore || loadingMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const next = page + 1;
          setPage(next);
          fetchPosts(next, true);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchPosts]);

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-toss-gray-100">
        <div className="flex items-center gap-3 px-4 h-12 pt-[env(safe-area-inset-top,0px)]">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button onClick={() => router.push("/community")} className="w-8 h-8 flex items-center justify-center text-toss-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/></svg>
          </button>
        </div>
      </div>

      {/* 카테고리 헤더 */}
      <div className="px-5 py-5 border-b border-toss-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-toss-gray-50 rounded-2xl flex items-center justify-center text-[28px]">
            {info.icon}
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-toss-gray-900">{categoryName}</h1>
            <p className="text-[13px] text-toss-gray-400 mt-0.5">{info.desc}</p>
          </div>
        </div>
      </div>

      {/* 글 목록 */}
      <div className="max-w-[680px] mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-toss-gray-400 text-[15px]">아직 게시글이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-toss-gray-100">
            {posts.map((post) => (
              <Link key={post.id} href={`/community/${post.id}`} className="block px-4 py-4 active:bg-toss-gray-50 transition">
                <div className={`${post.image_urls?.length > 0 ? "flex gap-3" : ""}`}>
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
                  <div className="flex items-center gap-2">
                    {post.like_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                        {post.like_count}
                      </span>
                    )}
                    {post.comment_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {post.comment_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!loading && hasMore && (
          <div ref={observerRef} className="flex justify-center py-6">
            {loadingMore && <div className="w-5 h-5 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />}
          </div>
        )}
      </div>

      {/* 글쓰기 FAB */}
      <button
        onClick={() => {
          if (!isLoggedIn) { openLoginModal(); return; }
          router.push(`/community/new?category=${encodeURIComponent(categoryName)}`);
        }}
        className="fixed bottom-24 right-5 md:bottom-8 md:right-8 bg-toss-blue text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-[var(--blue-hover)] transition z-40 active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <span className="text-[14px] font-semibold">글쓰기</span>
      </button>
    </div>
  );
}
