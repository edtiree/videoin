"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import CategoryBadge from "@/components/common/CategoryBadge";
import StarRating from "@/components/common/StarRating";
import TopNav from "@/components/TopNav";

const CATEGORIES = ["전체", "영상 편집", "영상 촬영", "썸네일", "모션그래픽"];

interface EditorProfile {
  id: string;
  display_name: string;
  bio: string | null;
  categories: string[];
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

  return (
    <>
      <TopNav title="편집자 찾기" backHref="/" />

      <div className="max-w-[640px] mx-auto px-4 py-4">
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

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : editors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-toss-gray-400 text-[15px]">등록된 편집자가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {editors.map((editor) => (
              <div
                key={editor.id}
                onClick={() => isLoggedIn ? router.push(`/editors/${editor.id}`) : openLoginModal()}
                className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[18px] font-bold text-toss-gray-400">{editor.display_name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-semibold text-toss-gray-900">{editor.display_name}</h3>
                      {editor.available ? (
                        <span className="text-[11px] font-medium text-toss-green bg-green-50 px-1.5 py-0.5 rounded">가능</span>
                      ) : (
                        <span className="text-[11px] font-medium text-toss-gray-400 bg-toss-gray-50 px-1.5 py-0.5 rounded">마감</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {editor.categories?.map((c) => <CategoryBadge key={c} category={c} />)}
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-toss-gray-400">
                      {editor.hourly_rate && <span className="font-medium text-toss-gray-700">{(editor.hourly_rate / 10000).toFixed(0)}만원</span>}
                      {editor.experience_years && <><span>·</span><span>경력 {editor.experience_years}년</span></>}
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <StarRating rating={editor.rating_avg} size={12} />
                        <span>{editor.rating_avg} ({editor.review_count})</span>
                      </span>
                    </div>
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
