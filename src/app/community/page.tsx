"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const CATEGORIES = ["전체", "자유", "중고거래", "장비", "노하우", "질문", "홍보"];

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
  const [category, setCategory] = useState("전체");
  const [showWriteSheet, setShowWriteSheet] = useState(false);

  // 바텀시트 열릴 때 배경 스크롤 막기
  useEffect(() => {
    if (showWriteSheet) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showWriteSheet]);

  const fetchPosts = useCallback(async () => {
    if (posts.length === 0) setLoading(true); // 첫 로딩만 스피너
    const params = new URLSearchParams();
    if (category !== "전체") params.set("category", category);

    try {
      const res = await fetch(`/api/posts?${params}`);
      const json = await res.json();
      setPosts(json.data || []);
    } catch { /* empty */ }
    setLoading(false);
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="max-w-[960px] mx-auto px-4 py-4">
      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-shrink-0 px-4 h-[34px] rounded-full text-[13px] font-medium transition ${
              category === c ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 글쓰기 버튼 */}
      {/* 게시글 목록 */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-toss-gray-400 text-[15px]">아직 게시글이 없습니다</p>
          <button
            onClick={() => isLoggedIn ? router.push("/community/new") : openLoginModal()}
            className="mt-3 text-[14px] font-semibold text-toss-blue"
          >
            첫 글 작성하기
          </button>
        </div>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => router.push(`/community/${post.id}`)}
              className="bg-white rounded-2xl border border-toss-gray-100 p-4 cursor-pointer hover:border-toss-gray-200 transition"
            >
              {/* 카테고리 + 시간 */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                  post.category === "중고거래" ? "text-toss-orange bg-orange-50" : "text-toss-blue bg-blue-50"
                }`}>{post.category}</span>
                <span className="text-[11px] text-toss-gray-300">{timeAgo(post.created_at)}</span>
              </div>

              {/* 제목 + 썸네일 */}
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-toss-gray-900 mb-1 line-clamp-1">{post.title}</h3>
                  <p className="text-[13px] text-toss-gray-500 line-clamp-2 mb-3">{post.content}</p>
                </div>
                {post.image_urls?.length > 0 && (
                  <img src={post.image_urls[0]} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
              </div>

              {/* 하단: 작성자 + 통계 */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-toss-gray-400">{post.users?.nickname || "익명"}</span>
                <div className="flex items-center gap-3 text-[12px] text-toss-gray-400">
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {post.view_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    {post.like_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {post.comment_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 플로팅 글쓰기 버튼 */}
      <button
        onClick={() => {
          if (!isLoggedIn) { openLoginModal(); return; }
          setShowWriteSheet(true);
        }}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 bg-toss-blue text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2 hover:bg-[var(--blue-hover)] transition z-40 active:scale-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        <span className="text-[14px] font-semibold">글쓰기</span>
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
                { key: "중고거래", icon: "📦", desc: "장비를 사고팔아요" },
                { key: "장비", icon: "🎥", desc: "장비 추천/리뷰" },
                { key: "노하우", icon: "💡", desc: "작업 팁을 공유해요" },
                { key: "질문", icon: "❓", desc: "궁금한 걸 물어봐요" },
                { key: "홍보", icon: "📢", desc: "내 서비스를 알려요" },
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

