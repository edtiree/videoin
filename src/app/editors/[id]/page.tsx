"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import CategoryBadge from "@/components/common/CategoryBadge";
import StarRating from "@/components/common/StarRating";
import TopNav from "@/components/TopNav";

interface PortfolioVideo {
  id: string;
  type: string;
  youtube_url: string | null;
  external_url: string | null;
  title: string | null;
  thumbnail_url: string | null;
}

interface Review {
  id: string;
  rating: number;
  content: string | null;
  created_at: string;
  users?: { nickname: string; profile_image: string | null };
}

interface EditorDetail {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  categories: string[];
  youtube_channel_url: string | null;
  youtube_channel_name: string | null;
  experience_years: number | null;
  hourly_rate: number | null;
  available: boolean;
  rating_avg: number;
  review_count: number;
  portfolio_videos: PortfolioVideo[];
  reviews: Review[];
}

export default function EditorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [editor, setEditor] = useState<EditorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"portfolio" | "reviews">("portfolio");

  useEffect(() => {
    fetch(`/api/editors/${id}`)
      .then((r) => r.json())
      .then((data) => { setEditor(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <TopNav title="편집자 프로필" backHref="/editors" />
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" /></div>
      </>
    );
  }

  if (!editor) {
    return (
      <>
        <TopNav title="편집자 프로필" backHref="/editors" />
        <div className="text-center py-20 text-toss-gray-400">프로필을 찾을 수 없습니다</div>
      </>
    );
  }

  return (
    <>
      <TopNav title="편집자 프로필" backHref="/editors" />

      <div className="max-w-[640px] mx-auto px-4 py-5">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[24px] font-bold text-toss-gray-400">{editor.display_name[0]}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[20px] font-bold text-toss-gray-900">{editor.display_name}</h1>
                {editor.available ? (
                  <span className="text-[11px] font-medium text-toss-green bg-green-50 px-2 py-0.5 rounded">작업 가능</span>
                ) : (
                  <span className="text-[11px] font-medium text-toss-gray-400 bg-toss-gray-50 px-2 py-0.5 rounded">마감</span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <StarRating rating={editor.rating_avg} size={14} />
                <span className="text-[13px] text-toss-gray-500 ml-1">{editor.rating_avg} ({editor.review_count}개 리뷰)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {editor.categories?.map((c) => <CategoryBadge key={c} category={c} size="md" />)}
          </div>

          {editor.bio && <p className="text-[14px] text-toss-gray-600 mb-4 whitespace-pre-wrap">{editor.bio}</p>}

          <div className="grid grid-cols-2 gap-2">
            {editor.hourly_rate && (
              <div className="bg-toss-gray-50 rounded-xl p-3">
                <p className="text-[11px] text-toss-gray-400 mb-0.5">단가</p>
                <p className="text-[14px] font-semibold text-toss-gray-900">{(editor.hourly_rate / 10000).toFixed(0)}만원</p>
              </div>
            )}
            {editor.experience_years && (
              <div className="bg-toss-gray-50 rounded-xl p-3">
                <p className="text-[11px] text-toss-gray-400 mb-0.5">경력</p>
                <p className="text-[14px] font-semibold text-toss-gray-900">{editor.experience_years}년</p>
              </div>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`flex-1 h-[40px] rounded-xl text-[14px] font-semibold transition ${
              activeTab === "portfolio" ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
            }`}
          >
            포트폴리오 ({editor.portfolio_videos.length})
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex-1 h-[40px] rounded-xl text-[14px] font-semibold transition ${
              activeTab === "reviews" ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
            }`}
          >
            리뷰 ({editor.review_count})
          </button>
        </div>

        {/* 포트폴리오 */}
        {activeTab === "portfolio" && (
          <div className="space-y-3">
            {editor.portfolio_videos.length === 0 ? (
              <p className="text-center py-10 text-toss-gray-400 text-[14px]">등록된 포트폴리오가 없습니다</p>
            ) : (
              editor.portfolio_videos.map((v) => (
                <div key={v.id} className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden">
                  {v.thumbnail_url && (
                    <div className="aspect-video bg-toss-gray-100">
                      <img src={v.thumbnail_url} alt={v.title || ""} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="text-[14px] font-semibold text-toss-gray-900">{v.title || "제목 없음"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 리뷰 */}
        {activeTab === "reviews" && (
          <div className="space-y-3">
            {editor.reviews.length === 0 ? (
              <p className="text-center py-10 text-toss-gray-400 text-[14px]">아직 리뷰가 없습니다</p>
            ) : (
              editor.reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-toss-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[13px] font-semibold text-toss-gray-900">{r.users?.nickname || "익명"}</span>
                    <StarRating rating={r.rating} size={12} />
                  </div>
                  {r.content && <p className="text-[14px] text-toss-gray-600">{r.content}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* 연락하기 */}
        <div className="mt-6 mb-4">
          <button
            onClick={() => {
              if (!isLoggedIn) { openLoginModal(); return; }
              router.push(`/messages?to=${editor.user_id}`);
            }}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] transition hover:bg-[var(--blue-hover)]"
          >
            쪽지 보내기
          </button>
        </div>
      </div>
    </>
  );
}
