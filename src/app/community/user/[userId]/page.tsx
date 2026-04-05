"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface UserInfo {
  id: string;
  nickname: string;
  profile_image: string | null;
}

interface Post {
  id: string;
  category: string;
  title: string;
  content: string;
  image_urls: string[];
  view_count: number;
  comment_count: number;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  post_title?: string;
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

export default function CommunityUserPage() {
  const { userId } = useParams();
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const isMe = profile?.id === userId;
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tab, setTab] = useState<"posts" | "comments">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const fetched = useRef({ posts: false, comments: false });

  // 유저 정보 + 작성글 가져오기
  useEffect(() => {
    setLoading(true);
    fetch(`/api/posts?user_id=${userId}&limit=100`)
      .then(r => r.json())
      .then(json => {
        const data = json.data || [];
        setPosts(data);
        setPostCount(json.total || data.length);
        if (data.length > 0 && data[0].users) {
          setUser(data[0].users);
        } else {
          // 유저 정보 별도 조회
          fetch(`/api/community/user/${userId}`)
            .then(r => r.json())
            .then(u => setUser(u))
            .catch(() => {});
        }
        fetched.current.posts = true;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  // 댓글 탭 전환 시 로드
  useEffect(() => {
    if (tab === "comments" && !fetched.current.comments) {
      setLoading(true);
      fetch(`/api/community/user/${userId}/comments`)
        .then(r => r.json())
        .then(data => {
          setComments(data.comments || []);
          setCommentCount(data.total || 0);
          if (data.user) setUser(data.user);
          fetched.current.comments = true;
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [tab, userId]);

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-toss-gray-100">
        <div className="pt-[env(safe-area-inset-top,0px)]" />
        <div className="flex items-center px-2 h-12">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        </div>
      </div>

      {/* 프로필 */}
      <div className="px-5 py-6 flex items-center gap-4">
        {user?.profile_image ? (
          <img src={user.profile_image} alt="" className="w-16 h-16 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-16 h-16 bg-toss-gray-100 rounded-full flex items-center justify-center">
            <span className="text-[24px] font-bold text-toss-gray-400">{user?.nickname?.[0] || "?"}</span>
          </div>
        )}
        <div>
          <h2 className="text-[20px] font-bold text-toss-gray-900">{user?.nickname || "사용자"}</h2>
          <div className="flex items-center gap-3 mt-1 text-[13px] text-toss-gray-400">
            <span>게시글 {postCount}</span>
            <span>댓글 {commentCount}</span>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-toss-gray-100">
        <button
          onClick={() => setTab("posts")}
          className={`flex-1 py-3 text-[14px] font-semibold text-center border-b-2 transition ${
            tab === "posts" ? "text-toss-gray-900 border-toss-gray-900" : "text-toss-gray-400 border-transparent"
          }`}
        >
          작성한 글
        </button>
        <button
          onClick={() => setTab("comments")}
          className={`flex-1 py-3 text-[14px] font-semibold text-center border-b-2 transition ${
            tab === "comments" ? "text-toss-gray-900 border-toss-gray-900" : "text-toss-gray-400 border-transparent"
          }`}
        >
          댓글단 글
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="max-w-[680px] mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : tab === "posts" ? (
          posts.length === 0 ? (
            <div className="text-center py-20 text-toss-gray-400 text-[14px]">작성한 글이 없습니다</div>
          ) : (
            <div className="divide-y divide-toss-gray-100">
              {posts.map(post => (
                <Link key={post.id} href={`/community/${post.id}`} className="block px-4 py-4 active:bg-toss-gray-50 transition">
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
                    <span>{timeAgo(post.created_at)} · 조회 {post.view_count}</span>
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
          )
        ) : (
          comments.length === 0 ? (
            <div className="text-center py-20 text-toss-gray-400 text-[14px]">댓글단 글이 없습니다</div>
          ) : (
            <div className="divide-y divide-toss-gray-100">
              {comments.map(c => (
                <Link key={c.id} href={`/community/${c.post_id}`} className="block px-4 py-4 active:bg-toss-gray-50 transition">
                  <p className="text-[14px] text-toss-gray-700 line-clamp-2">{c.content}</p>
                  <div className="flex items-center gap-2 mt-2 text-[12px] text-toss-gray-400">
                    <span>{timeAgo(c.created_at)}</span>
                    {c.post_title && (
                      <>
                        <span>·</span>
                        <span className="text-toss-gray-500 line-clamp-1">{c.post_title}</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
