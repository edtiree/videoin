"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const CATEGORIES = ["전체", "자유", "중고거래", "장비", "노하우", "질문", "홍보"];

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
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

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "전체") params.set("category", category);

    try {
      const res = await fetch(`/api/posts?${params}`);
      const json = await res.json();
      setPosts(json.data || []);
    } catch { /* empty */ }
    setLoading(false);
  }, [category]);

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
      <button
        onClick={() => isLoggedIn ? router.push("/community/new") : openLoginModal()}
        className="w-full bg-white rounded-2xl border border-toss-gray-100 p-4 mb-4 flex items-center gap-3 hover:bg-toss-gray-50 transition"
      >
        <div className="w-9 h-9 bg-toss-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-gray-400" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </div>
        <span className="text-[14px] text-toss-gray-400">글을 작성해보세요</span>
      </button>

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

              {/* 제목 */}
              <h3 className="text-[15px] font-semibold text-toss-gray-900 mb-1 line-clamp-1">{post.title}</h3>

              {/* 본문 미리보기 */}
              <p className="text-[13px] text-toss-gray-500 line-clamp-2 mb-3">{post.content}</p>

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
    </div>
  );
}
