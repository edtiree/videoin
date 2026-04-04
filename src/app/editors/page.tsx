"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import StarRating from "@/components/common/StarRating";
import TopNav from "@/components/TopNav";

const CATEGORIES = ["전체", "영상 편집", "영상 촬영", "썸네일", "모션그래픽", "스크립트", "성우", "출연자", "스튜디오"];
const SORT_OPTIONS = [
  { key: "rating", label: "인기순" },
  { key: "recent", label: "최신순" },
  { key: "price_low", label: "가격 낮은순" },
];

interface EditorProfile {
  id: string;
  display_name: string;
  bio: string | null;
  categories: string[];
  tools: string[];
  experience_years: number | null;
  hourly_rate: number | null;
  available: boolean;
  rating_avg: number;
  review_count: number;
  users?: { nickname: string; profile_image: string | null };
}

export default function EditorsPage() {
  const router = useRouter();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [editors, setEditors] = useState<EditorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("rating");

  const fetchEditors = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "전체") params.set("category", category);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/editors?${params}`);
      const json = await res.json();
      setEditors(json.data || []);
    } catch { /* empty */ }
    setLoading(false);
  }, [category, search]);

  useEffect(() => { fetchEditors(); }, [fetchEditors]);

  const sortedEditors = [...editors].sort((a, b) => {
    if (sort === "rating") return b.rating_avg - a.rating_avg;
    if (sort === "price_low") return (a.hourly_rate || 0) - (b.hourly_rate || 0);
    return 0;
  });

  return (
    <>
      <TopNav title="편집자 찾기" backHref="/" />

      <div className="max-w-[960px] mx-auto px-4 py-4">
        {/* 검색 */}
        <div className="relative mb-4">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="편집자 검색"
            className="w-full h-[44px] pl-11 pr-4 rounded-xl bg-white border border-toss-gray-100 text-[14px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue"
          />
        </div>

        {/* 카테고리 */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
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

        {/* 정렬 + 카운트 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] text-toss-gray-500">{sortedEditors.length}명</span>
          <div className="flex gap-1">
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`text-[12px] px-2 py-1 rounded transition ${
                  sort === s.key ? "text-toss-gray-900 font-semibold" : "text-toss-gray-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : sortedEditors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-toss-gray-400 text-[15px]">등록된 편집자가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            {sortedEditors.map((editor) => (
              <div
                key={editor.id}
                onClick={() => isLoggedIn ? router.push(`/editors/${editor.id}`) : openLoginModal()}
                className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden cursor-pointer hover:border-toss-gray-200 transition"
              >
                {/* 썸네일 영역 (포트폴리오 이미지가 있으면 표시) */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 아바타 */}
                    {editor.users?.profile_image ? (
                      <img src={editor.users.profile_image} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[18px] font-bold text-toss-gray-400">{editor.display_name[0]}</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* 이름 + 상태 */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-bold text-toss-gray-900">{editor.display_name}</h3>
                        {editor.available && (
                          <span className="text-[10px] font-bold text-toss-green bg-green-50 px-1.5 py-0.5 rounded">가능</span>
                        )}
                      </div>

                      {/* 별점 */}
                      <div className="flex items-center gap-1 mb-2">
                        <StarRating rating={editor.rating_avg} size={12} />
                        <span className="text-[12px] text-toss-gray-500">{editor.rating_avg} ({editor.review_count})</span>
                      </div>

                      {/* 단가 */}
                      {editor.hourly_rate && (
                        <p className="text-[15px] font-bold text-toss-gray-900 mb-2">
                          {(editor.hourly_rate / 10000).toFixed(0)}만원~
                        </p>
                      )}

                      {/* 카테고리 */}
                      <div className="flex flex-wrap gap-1 mb-1">
                        {editor.categories?.slice(0, 3).map((c) => (
                          <span key={c} className="text-[11px] font-medium text-toss-blue bg-blue-50 px-2 py-0.5 rounded">{c}</span>
                        ))}
                      </div>

                      {/* 도구 */}
                      {editor.tools?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {editor.tools.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] text-toss-gray-400 bg-toss-gray-50 px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                          {editor.tools.length > 3 && (
                            <span className="text-[10px] text-toss-gray-300">+{editor.tools.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 하트 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="flex-shrink-0 p-1"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-toss-gray-300">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
