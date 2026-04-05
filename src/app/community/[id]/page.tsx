"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface PollData {
  options: { label: string; votes: number }[];
  voters: Record<string, number>;
}

interface Post {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  image_urls: string[];
  poll_data: PollData | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  users?: { id: string; nickname: string; profile_image: string | null };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  users?: { id: string; nickname: string; profile_image: string | null };
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "방금 전";
  if (d < 60) return `${d}분 전`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  return `${days}일 전`;
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

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentInput, setCommentInput] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [pollData, setPollData] = useState<PollData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [commentSort, setCommentSort] = useState<"asc" | "desc">("asc");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [similarPosts, setSimilarPosts] = useState<Post[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [subscribedKeywords, setSubscribedKeywords] = useState<Set<string>>(new Set());
  const [imageViewerIndex, setImageViewerIndex] = useState<number | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setPost(data);
        setLikeCount(data.like_count || 0);
        if (data.poll_data) setPollData(data.poll_data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const fetchComments = useCallback(() => {
    fetch(`/api/posts/${id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // iOS 키보드 감지
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  // 비슷한 게시글 + 키워드 추출
  useEffect(() => {
    if (!post) return;

    // 키워드 추출: 제목+내용에서 2글자 이상 명사성 단어 추출
    const text = `${post.title} ${post.content}`;
    const stopWords = new Set(["그리고","하지만","그런데","그래서","때문에","이것","저것","그것","우리","나는","너는","있는","없는","하는","되는","같은","위해","대한","통해","에서","으로","부터","까지","에게","한테","처럼","만큼","라고","이라","라는"]);
    const words = text
      .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));
    const freq = new Map<string, number>();
    words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);
    setKeywords(sorted);

    // 같은 카테고리 게시글 가져오기
    fetch(`/api/posts?category=${encodeURIComponent(post.category)}&limit=6`)
      .then(r => r.json())
      .then(json => {
        const filtered = (json.data || []).filter((p: Post) => p.id !== post.id).slice(0, 5);
        setSimilarPosts(filtered);
      })
      .catch(() => {});
  }, [post]);

  const toggleKeyword = (kw: string) => {
    setSubscribedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  };

  // 더보기 메뉴 열릴 때 바깥 클릭으로 닫기
  useEffect(() => {
    if (!showMoreMenu) return;
    const close = () => setShowMoreMenu(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showMoreMenu]);

  const handleLike = async () => {
    if (!isLoggedIn) { openLoginModal(); return; }
    const res = await fetch(`/api/posts/${id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile?.id }),
    });
    const data = await res.json();
    setLiked(data.liked);
    setLikeCount((prev) => data.liked ? prev + 1 : prev - 1);
  };

  const handleComment = async () => {
    if (!isLoggedIn) { openLoginModal(); return; }
    if (!commentInput.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile?.id,
          content: commentInput.trim(),
          parent_id: replyTo?.id || null,
        }),
      });

      if (res.ok) {
        setCommentInput("");
        setReplyTo(null);
        fetchComments();
        setPost((prev) => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev);
      } else {
        const err = await res.json();
        alert(`댓글 등록 실패: ${err.error || "알 수 없는 에러"}`);
      }
    } catch {
      alert("네트워크 오류가 발생했습니다");
    }
    setSubmitting(false);
  };

  const handleVote = async (optionIndex: number) => {
    if (!isLoggedIn) { openLoginModal(); return; }
    const res = await fetch(`/api/posts/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile?.id, option_index: optionIndex }),
    });
    const data = await res.json();
    if (data.poll_data) setPollData(data.poll_data);
  };

  const isOwner = profile?.id === post?.user_id;

  const handleDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    router.push("/community");
  };

  // 댓글 정렬
  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    if (commentSort === "desc") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return sorted;
  }, [comments, commentSort]);

  const rootComments = sortedComments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) =>
    sortedComments.filter((c) => c.parent_id === parentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="fixed top-0 left-0 right-0 z-30 bg-white">
          <div className="pt-[env(safe-area-inset-top,0px)]" />
          <div className="flex items-center px-2 h-12 border-b border-toss-gray-100">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>
        </div>
        <div className="flex justify-center py-20 pt-32">
          <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="fixed top-0 left-0 right-0 z-30 bg-white">
          <div className="pt-[env(safe-area-inset-top,0px)]" />
          <div className="flex items-center px-2 h-12 border-b border-toss-gray-100">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>
        </div>
        <div className="text-center py-20 pt-32 text-toss-gray-400">게시글을 찾을 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* 커스텀 헤더 (fixed) */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-white">
        <div className="pt-[env(safe-area-inset-top,0px)]" />
        <div className="flex items-center justify-between px-2 h-12 border-b border-toss-gray-100">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-1">
            {/* 공유 */}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: post.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("링크가 복사되었습니다");
                }
              }}
              className="w-10 h-10 flex items-center justify-center text-toss-gray-700"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
            {/* 더보기 */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}
                className="w-10 h-10 flex items-center justify-center text-toss-gray-700"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-toss-gray-100 py-1 min-w-[120px] z-50">
                  {isOwner ? (
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2.5 text-left text-[14px] text-toss-red hover:bg-toss-gray-50"
                    >
                      삭제
                    </button>
                  ) : (
                    <button
                      onClick={() => { setShowMoreMenu(false); alert("신고가 접수되었습니다"); }}
                      className="w-full px-4 py-2.5 text-left text-[14px] text-toss-gray-700 hover:bg-toss-gray-50"
                    >
                      신고하기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* 헤더 높이 스페이서 */}
      <div className="h-[calc(12px+env(safe-area-inset-top,0px)+48px)]" />

      <div className="max-w-[680px] mx-auto">
        {/* 게시글 */}
        <div className="bg-white px-5 py-5 md:px-8 md:py-8 md:rounded-2xl md:border md:border-toss-gray-100 md:my-4 md:mx-4">
          {/* 카테고리 뱃지 */}
          <Link
            href={`/community/category/${encodeURIComponent(post.category)}`}
            className={`inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded ${getCategoryStyle(post.category)}`}
          >
            {post.category}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </Link>

          {/* 작성자 */}
          <div className="flex items-center justify-between mt-4">
            <Link href={`/community/user/${post.user_id}`} className="flex items-center gap-3">
              {post.users?.profile_image ? (
                <img src={post.users.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-toss-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-[14px] font-bold text-toss-gray-400">{post.users?.nickname?.[0] || "?"}</span>
                </div>
              )}
              <div>
                <p className="text-[14px] font-semibold text-toss-gray-900">{post.users?.nickname || "익명"}</p>
                <p className="text-[12px] text-toss-gray-400">{timeAgo(post.created_at)}</p>
              </div>
            </Link>
          </div>

          {/* 제목 */}
          <h1 className="text-[22px] font-bold text-toss-gray-900 mt-4 leading-tight">{post.title}</h1>

          {/* 내용 */}
          <p className="text-[15px] text-toss-gray-700 whitespace-pre-wrap leading-relaxed mt-3">{post.content}</p>

          {/* 이미지 */}
          {post.image_urls?.length > 0 && (
            <div className="mt-4 space-y-2">
              {post.image_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  onClick={() => setImageViewerIndex(i)}
                  className="rounded-xl w-full cursor-pointer"
                />
              ))}
            </div>
          )}

          {/* 투표 */}
          {pollData && (() => {
            const totalVotes = pollData.options.reduce((sum, o) => sum + o.votes, 0);
            const myVote = profile?.id ? pollData.voters[profile.id] : undefined;
            return (
              <div className="mt-4 bg-toss-gray-50 rounded-xl p-4">
                <p className="text-[13px] font-semibold text-toss-gray-700 mb-3">투표 ({totalVotes}명 참여)</p>
                <div className="space-y-2">
                  {pollData.options.map((opt, i) => {
                    const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                    const isMyVote = myVote === i;
                    return (
                      <button
                        key={i}
                        onClick={() => handleVote(i)}
                        className={`w-full relative overflow-hidden rounded-lg border-2 transition text-left ${
                          isMyVote ? "border-toss-blue" : "border-toss-gray-200 hover:border-toss-gray-300"
                        }`}
                      >
                        <div
                          className={`absolute inset-y-0 left-0 transition-all ${isMyVote ? "bg-blue-100" : "bg-toss-gray-100"}`}
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between px-4 py-3">
                          <span className={`text-[14px] font-medium ${isMyVote ? "text-toss-blue" : "text-toss-gray-700"}`}>
                            {isMyVote && "✓ "}{opt.label}
                          </span>
                          <span className={`text-[13px] font-semibold ${isMyVote ? "text-toss-blue" : "text-toss-gray-500"}`}>{pct}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 조회수 */}
          <p className="text-[13px] text-toss-gray-400 mt-6 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            {post.view_count}명이 봤어요
          </p>

          {/* 공감 + 저장 액션 바 */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-toss-gray-100">
            <button
              onClick={handleLike}
              className={`flex-1 h-[44px] rounded-xl border flex items-center justify-center gap-2 text-[14px] font-medium transition ${
                liked ? "border-toss-red bg-red-50 text-toss-red" : "border-toss-gray-200 text-toss-gray-500"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
              </svg>
              공감하기 {likeCount > 0 && likeCount}
            </button>
            <button
              onClick={() => alert("준비 중입니다")}
              className="flex-1 h-[44px] rounded-xl border border-toss-gray-200 text-toss-gray-500 flex items-center justify-center gap-2 text-[14px] font-medium transition hover:bg-toss-gray-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              저장
            </button>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white mt-2 md:rounded-2xl md:border md:border-toss-gray-100 md:mx-4 md:mb-4">
          {/* 댓글 헤더 */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <span className="text-[16px] font-bold text-toss-gray-900">댓글 {comments.length}</span>
            <button
              onClick={() => setCommentSort(prev => prev === "asc" ? "desc" : "asc")}
              className="text-[13px] text-toss-gray-400 hover:text-toss-gray-600 transition"
            >
              {commentSort === "asc" ? "최신순" : "인기순"}
            </button>
          </div>

          {comments.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-toss-gray-400">아직 댓글이 없습니다</p>
          ) : (
            <div className="divide-y divide-toss-gray-50">
              {rootComments.map((c) => {
                const replies = getReplies(c.id);
                const isExpanded = expandedThreads.has(c.id);
                const visibleReplies = isExpanded || replies.length <= 2
                  ? replies
                  : replies.slice(-1); // 마지막 1개만
                const hiddenCount = replies.length - visibleReplies.length;

                return (
                  <div key={c.id}>
                    <CommentItem
                      comment={c}
                      isLoggedIn={isLoggedIn}
                      onReply={() => {
                        setReplyTo({ id: c.id, nickname: c.users?.nickname || "익명" });
                        setCommentInput("");
                      }}
                    />
                    {/* 숨겨진 답글 더보기 */}
                    {hiddenCount > 0 && (
                      <button
                        onClick={() => setExpandedThreads(prev => new Set(prev).add(c.id))}
                        className="ml-14 px-4 py-2 text-[13px] text-toss-blue font-medium flex items-center gap-1"
                      >
                        이전 답글 {hiddenCount}개 더보기
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    )}
                    {/* 답글 */}
                    {visibleReplies.map((reply) => (
                      <div key={reply.id} className="ml-12 border-l-2 border-toss-gray-100">
                        <CommentItem
                          comment={reply}
                          isLoggedIn={isLoggedIn}
                          isReply
                          onReply={() => {
                            setReplyTo({ id: c.id, nickname: reply.users?.nickname || "익명" });
                            setCommentInput("");
                          }}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 비슷한 게시글 알림 제안 */}
        {keywords.length > 0 && (
          <div className="bg-white mt-2 px-5 py-5 md:rounded-2xl md:border md:border-toss-gray-100 md:mx-4">
            <p className="text-[15px] font-bold text-toss-gray-900">비슷한 게시글이 올라오면 바로 알려드릴까요?</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {keywords.map((kw) => {
                const isActive = subscribedKeywords.has(kw);
                return (
                  <button
                    key={kw}
                    onClick={() => {
                      if (!isLoggedIn) { openLoginModal(); return; }
                      toggleKeyword(kw);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium border transition ${
                      isActive
                        ? "border-toss-blue bg-blue-50 text-toss-blue"
                        : "border-toss-gray-200 text-toss-gray-600"
                    }`}
                  >
                    {isActive ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    )}
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 이 글과 비슷한 게시글 */}
        {similarPosts.length > 0 && (
          <div className="bg-white mt-2 px-5 py-5 md:rounded-2xl md:border md:border-toss-gray-100 md:mx-4 md:mb-4">
            <p className="text-[15px] font-bold text-toss-gray-900 flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              이 글과 비슷한 게시글
            </p>
            <div className="divide-y divide-toss-gray-100 mt-3">
              {similarPosts.map((sp) => (
                <Link
                  key={sp.id}
                  href={`/community/${sp.id}`}
                  className="block py-3.5 first:pt-0 last:pb-0 active:bg-toss-gray-50 transition"
                >
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded ${getCategoryStyle(sp.category)}`}>
                    {sp.category}
                  </span>
                  <h4 className="text-[15px] font-semibold text-toss-gray-900 mt-1.5 line-clamp-1">{sp.title}</h4>
                  <p className="text-[13px] text-toss-gray-500 line-clamp-1 mt-0.5">{sp.content}</p>
                  <div className="flex items-center justify-between mt-2 text-[12px] text-toss-gray-400">
                    <span>{sp.users?.nickname || "익명"} · {timeAgo(sp.created_at)} · 조회 {sp.view_count}</span>
                    <div className="flex items-center gap-2">
                      {sp.like_count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                          {sp.like_count}
                        </span>
                      )}
                      {sp.comment_count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {sp.comment_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 이미지 전체화면 뷰어 */}
      {imageViewerIndex !== null && post.image_urls?.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black" onClick={() => setImageViewerIndex(null)}>
          {/* 이미지 - 전체 화면 (터치 스와이프) */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              (e.currentTarget as HTMLElement).dataset.touchX = String(e.touches[0].clientX);
            }}
            onTouchEnd={(e) => {
              const startX = Number((e.currentTarget as HTMLElement).dataset.touchX || 0);
              const endX = e.changedTouches[0].clientX;
              const diff = startX - endX;
              if (diff > 50 && imageViewerIndex < post.image_urls.length - 1) {
                setImageViewerIndex(imageViewerIndex + 1);
              } else if (diff < -50 && imageViewerIndex > 0) {
                setImageViewerIndex(imageViewerIndex - 1);
              }
            }}
          >
            <img
              src={post.image_urls[imageViewerIndex]}
              alt=""
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          </div>
          {/* 헤더 (이미지 위에 오버레이) */}
          <div className="absolute top-0 left-0 right-0 z-10 pt-[env(safe-area-inset-top,0px)]">
            <div className="flex items-center justify-between px-4 h-12">
              <button onClick={() => setImageViewerIndex(null)} className="w-10 h-10 flex items-center justify-center text-white drop-shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <span className="text-[14px] text-white/80 drop-shadow-lg">{imageViewerIndex + 1} / {post.image_urls.length}</span>
              <div className="w-10" />
            </div>
          </div>
          {/* 좌우 네비게이션 */}
          {post.image_urls.length > 1 && (
            <>
              {imageViewerIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setImageViewerIndex(imageViewerIndex - 1); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
              )}
              {imageViewerIndex < post.image_urls.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setImageViewerIndex(imageViewerIndex + 1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              )}
            </>
          )}
          {/* 인디케이터 */}
          {post.image_urls.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center gap-1.5 pb-[calc(env(safe-area-inset-bottom,8px)+16px)]">
              {post.image_urls.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition ${i === imageViewerIndex ? "bg-white" : "bg-white/30"}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 댓글 입력 */}
      <div className="fixed bottom-0 left-0 right-0 z-[51] bg-white">
        <div className="border-t border-toss-gray-100">
        {replyTo && (
          <div className="flex items-center justify-between px-4 pt-2">
            <span className="text-[12px] text-toss-blue">@{replyTo.nickname}에게 답글</span>
            <button onClick={() => { setReplyTo(null); setCommentInput(""); }} className="text-[12px] text-toss-gray-400">취소</button>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <button className="flex-shrink-0 p-1 text-toss-gray-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleComment()}
            placeholder={replyTo ? `@${replyTo.nickname}에게 답글 작성` : isLoggedIn ? "댓글을 입력해주세요.." : "로그인 후 댓글을 작성할 수 있어요"}
            className="flex-1 h-[36px] bg-toss-gray-50 rounded-full px-4 text-[14px] border-none focus:outline-none placeholder:text-toss-gray-300"
            onClick={() => !isLoggedIn && openLoginModal()}
            readOnly={!isLoggedIn}
          />
          {commentInput.trim() && (
            <button
              onClick={handleComment}
              disabled={submitting}
              className="flex-shrink-0 text-toss-blue font-semibold text-[14px] disabled:opacity-50"
            >
              등록
            </button>
          )}
        </div>
        </div>
        {!keyboardOpen && <div className="pb-[env(safe-area-inset-bottom,4px)]" />}
      </div>
    </div>
  );
}

function CommentItem({ comment, isLoggedIn, isReply, onReply }: {
  comment: Comment;
  isLoggedIn: boolean;
  isReply?: boolean;
  onReply: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [showHeart, setShowHeart] = useState(false);

  const handleDoubleTap = () => {
    if (!isLoggedIn || liked) return;
    setLiked(true);
    setLikes(l => l + 1);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 600);
  };

  return (
    <div className={`px-5 py-3.5 ${isReply ? "pl-4" : ""} relative`} onDoubleClick={handleDoubleTap}>
      <div className="flex items-start gap-2.5">
        {/* 아바타 */}
        {comment.users?.profile_image ? (
          <img src={comment.users.profile_image} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 bg-toss-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-toss-gray-400">{comment.users?.nickname?.[0] || "?"}</span>
          </div>
        )}
        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link href={`/community/user/${comment.user_id}`} className="text-[13px] font-semibold text-toss-gray-900" onClick={(e) => e.stopPropagation()}>{comment.users?.nickname || "익명"}</Link>
            <span className="text-[11px] text-toss-gray-300">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-[14px] text-toss-gray-700 mt-1">{comment.content}</p>
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#ef4444" stroke="none" className="animate-ping opacity-75">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => { if (!isLoggedIn) return; setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}
              className={`flex items-center gap-1 text-[12px] font-medium ${liked ? "text-toss-red" : "text-toss-gray-400"}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {likes > 0 && likes}
            </button>
            <button
              onClick={onReply}
              className="text-[12px] text-toss-gray-400 hover:text-toss-blue font-medium"
            >
              답글 쓰기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
