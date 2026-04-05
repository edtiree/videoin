"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

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
        console.error("댓글 에러:", err);
        alert(`댓글 등록 실패: ${err.error || "알 수 없는 에러"}`);
      }
    } catch (e) {
      console.error("댓글 네트워크 에러:", e);
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

  // 댓글을 트리 구조로 정리 (부모 → 자식)
  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  if (loading) {
    return (
      <>
        <TopNav title="" backHref="/community" />
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" /></div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <TopNav title="" backHref="/community" />
        <div className="text-center py-20 text-toss-gray-400">게시글을 찾을 수 없습니다</div>
      </>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      <TopNav title="" backHref="/community" rightContent={
        isOwner ? <button onClick={handleDelete} className="text-[14px] text-toss-red">삭제</button> : null
      } />

      <div className="max-w-[1000px] mx-auto">
        {/* 게시글 */}
        <div className="bg-white px-5 md:px-8 py-5 md:py-8 border-b border-toss-gray-100 md:rounded-2xl md:border md:my-4 md:mx-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
              post.category === "중고거래" ? "text-toss-orange bg-orange-50" : "text-toss-blue bg-blue-50"
            }`}>{post.category}</span>
            <span className="text-[11px] text-toss-gray-300">{timeAgo(post.created_at)}</span>
          </div>

          <h1 className="text-[20px] md:text-[26px] font-bold text-toss-gray-900 mb-3">{post.title}</h1>

          <div className="flex items-center gap-2 mb-4">
            {post.users?.profile_image ? (
              <img src={post.users.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-toss-gray-100 rounded-full flex items-center justify-center">
                <span className="text-[12px] font-bold text-toss-gray-400">{post.users?.nickname?.[0] || "?"}</span>
              </div>
            )}
            <span className="text-[13px] font-medium text-toss-gray-700">{post.users?.nickname || "익명"}</span>
          </div>

          <p className="text-[15px] md:text-[16px] text-toss-gray-700 whitespace-pre-wrap leading-relaxed md:leading-loose">{post.content}</p>

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

          {/* 좋아요 + 통계 */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-toss-gray-50">
            <div className="flex items-center gap-4 text-[13px] text-toss-gray-400">
              <span>조회 {post.view_count}</span>
              <span>댓글 {comments.length}</span>
            </div>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                liked ? "border-toss-red bg-red-50 text-toss-red" : "border-toss-gray-200 text-toss-gray-500"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span className="text-[13px] font-medium">{likeCount}</span>
            </button>
          </div>
        </div>

        {/* 댓글 */}
        <div className="bg-white mt-2 md:rounded-2xl md:border md:border-toss-gray-100 md:mx-4 md:mb-4">
          <p className="px-5 pt-4 pb-2 text-[14px] font-bold text-toss-gray-900">댓글 {comments.length}</p>

          {comments.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-toss-gray-400">아직 댓글이 없습니다</p>
          ) : (
            <div className="divide-y divide-toss-gray-50">
              {rootComments.map((c) => (
                <div key={c.id}>
                  {/* 원 댓글 */}
                  <CommentItem
                    comment={c}
                    isLoggedIn={isLoggedIn}
                    onReply={() => {
                      setReplyTo({ id: c.id, nickname: c.users?.nickname || "익명" });
                      setCommentInput("");
                    }}
                  />
                  {/* 답글 */}
                  {getReplies(c.id).map((reply) => (
                    <div key={reply.id} className="ml-9 border-l-2 border-toss-gray-100">
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 댓글 입력 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-toss-gray-100 px-4 py-2 pb-[env(safe-area-inset-bottom,8px)] z-[51]">
        <div className="max-w-[1000px] mx-auto">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[12px] text-toss-blue">@{replyTo.nickname}에게 답글</span>
              <button onClick={() => { setReplyTo(null); setCommentInput(""); }} className="text-[12px] text-toss-gray-400">취소</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleComment()}
              placeholder={replyTo ? `@${replyTo.nickname}에게 답글 작성` : isLoggedIn ? "댓글을 입력하세요" : "로그인 후 댓글을 작성할 수 있어요"}
              className="flex-1 h-[44px] rounded-xl border border-toss-gray-200 px-4 text-[14px] focus:outline-none focus:border-toss-blue"
              onClick={() => !isLoggedIn && openLoginModal()}
              readOnly={!isLoggedIn}
            />
            <button
              onClick={handleComment}
              disabled={!commentInput.trim() || submitting}
              className="w-[44px] h-[44px] rounded-xl bg-toss-blue text-white flex items-center justify-center disabled:opacity-50 transition flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
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
    <div className={`px-5 py-3 ${isReply ? "pl-4" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        {comment.users?.profile_image ? (
          <img src={comment.users.profile_image} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 bg-toss-gray-100 rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-toss-gray-400">{comment.users?.nickname?.[0] || "?"}</span>
          </div>
        )}
        <span className="text-[13px] font-semibold text-toss-gray-900">{comment.users?.nickname || "익명"}</span>
        <span className="text-[11px] text-toss-gray-300">{timeAgo(comment.created_at)}</span>
      </div>
      <div className="ml-9">
        <p className="text-[14px] text-toss-gray-700">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => { if (!isLoggedIn) return; setLiked(!liked); setLikes(l => liked ? l - 1 : l + 1); }}
            className={`flex items-center gap-1 text-[12px] font-medium ${liked ? "text-toss-red" : "text-toss-gray-400"}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {likes > 0 && likes}
          </button>
          <button
            onClick={onReply}
            className="text-[12px] text-toss-gray-400 hover:text-toss-blue font-medium"
          >
            답글
          </button>
        </div>
      </div>
    </div>
  );
}

