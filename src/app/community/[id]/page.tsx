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
    case "중고거래": return "text-toss-orange bg-orange-50";
    case "장비": return "text-green-600 bg-green-50";
    case "노하우": return "text-purple-600 bg-purple-50";
    case "질문": return "text-amber-600 bg-amber-50";
    case "홍보": return "text-pink-600 bg-pink-50";
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
      <div className="min-h-screen">
        <div className="sticky top-0 z-30 bg-white border-b border-toss-gray-100">
          <div className="flex items-center px-2 h-12 pt-[env(safe-area-inset-top,0px)]">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>
        </div>
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-30 bg-white border-b border-toss-gray-100">
          <div className="flex items-center px-2 h-12 pt-[env(safe-area-inset-top,0px)]">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </div>
        </div>
        <div className="text-center py-20 text-toss-gray-400">게시글을 찾을 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 커스텀 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b border-toss-gray-100">
        <div className="flex items-center justify-between px-2 h-12 pt-[env(safe-area-inset-top,0px)]">
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

      <div className="max-w-[680px] mx-auto">
        {/* 게시글 */}
        <div className="bg-white px-5 py-5 md:px-8 md:py-8 md:rounded-2xl md:border md:border-toss-gray-100 md:my-4 md:mx-4">
          {/* 카테고리 뱃지 */}
          <Link
            href={`/community?category=${encodeURIComponent(post.category)}`}
            className={`inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded ${getCategoryStyle(post.category)}`}
          >
            {post.category}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </Link>

          {/* 작성자 */}
          <div className="flex items-center gap-3 mt-4">
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
          </div>

          {/* 제목 */}
          <h1 className="text-[22px] font-bold text-toss-gray-900 mt-4 leading-tight">{post.title}</h1>

          {/* 내용 */}
          <p className="text-[15px] text-toss-gray-700 whitespace-pre-wrap leading-relaxed mt-3">{post.content}</p>

          {/* 이미지 */}
          {post.image_urls?.length > 0 && (
            <div className={`mt-4 gap-2 ${
              post.image_urls.length === 1 ? "flex" : "grid grid-cols-2"
            }`}>
              {post.image_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={`rounded-xl object-cover w-full ${
                    post.image_urls.length === 1 ? "max-h-[400px]" : "aspect-square"
                  }`}
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
              {commentSort === "asc" ? "등록순" : "최신순"}
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
      </div>

      {/* 댓글 입력 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-toss-gray-100 z-[51]">
        {replyTo && (
          <div className="flex items-center justify-between px-4 pt-2">
            <span className="text-[12px] text-toss-blue">@{replyTo.nickname}에게 답글</span>
            <button onClick={() => { setReplyTo(null); setCommentInput(""); }} className="text-[12px] text-toss-gray-400">취소</button>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2 pb-[env(safe-area-inset-bottom,8px)]">
          <button className="flex-shrink-0 p-1.5 text-toss-gray-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleComment()}
            placeholder={replyTo ? `@${replyTo.nickname}에게 답글 작성` : isLoggedIn ? "댓글을 입력해주세요.." : "로그인 후 댓글을 작성할 수 있어요"}
            className="flex-1 h-[40px] bg-toss-gray-50 rounded-full px-4 text-[14px] border-none focus:outline-none placeholder:text-toss-gray-300"
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

  return (
    <div className={`px-5 py-3.5 ${isReply ? "pl-4" : ""}`}>
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
            <span className="text-[13px] font-semibold text-toss-gray-900">{comment.users?.nickname || "익명"}</span>
            <span className="text-[11px] text-toss-gray-300">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-[14px] text-toss-gray-700 mt-1">{comment.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => { if (!isLoggedIn) return; setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}
              className={`text-[12px] font-medium ${liked ? "text-toss-red" : "text-toss-gray-400"}`}
            >
              좋아요{likes > 0 && ` ${likes}`}
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
