"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import CategoryBadge from "@/components/common/CategoryBadge";
import TopNav from "@/components/TopNav";
import { CATEGORIES as ALL_CATS, getCategoryByKey } from "@/lib/categories";

const MAIN_CATS = ["전체", ...ALL_CATS.map((c) => c.key)];

interface Job {
  id: string;
  title: string;
  category: string;
  budget_type: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_amount: number | null;
  region: string | null;
  is_remote: boolean;
  deadline: string | null;
  deadline_type: string;
  view_count: number;
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

function formatBudget(job: Job): string {
  if (job.budget_min && job.budget_max) return `${(job.budget_min / 10000).toFixed(0)}~${(job.budget_max / 10000).toFixed(0)}만원`;
  if (job.budget_amount) return `${(job.budget_amount / 10000).toFixed(0)}만원`;
  return "협의";
}

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, openLoginModal } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get("category") || "전체");
  const [subCategory, setSubCategory] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const activeSubs = getCategoryByKey(category)?.subs || [];

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== "전체") params.set("category", category);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/jobs?${params}`);
      const json = await res.json();
      setJobs(json.data || []);
    } catch { /* empty */ }
    setLoading(false);
  }, [category, search]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  return (
    <>
      <TopNav title="구인 공고" backHref="/" rightContent={
        <button
          onClick={() => isLoggedIn ? router.push("/jobs/new") : openLoginModal()}
          className="text-[14px] font-semibold text-toss-blue"
        >
          공고 올리기
        </button>
      } />

      <div className="max-w-[1200px] mx-auto px-4 py-4">
        {/* 검색 */}
        <div className="relative mb-4 md:max-w-[400px]">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-toss-gray-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="공고 검색"
            className="w-full h-[44px] pl-11 pr-4 rounded-xl bg-white border border-toss-gray-100 text-[14px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue"
          />
        </div>

        {/* 메인 카테고리 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
          {MAIN_CATS.map((c) => (
            <button
              key={c}
              onClick={() => { setCategory(c); setSubCategory(null); }}
              className={`flex-shrink-0 px-4 h-[34px] rounded-full text-[13px] font-medium transition ${
                category === c ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 세부 카테고리 */}
        {activeSubs.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
            <button
              onClick={() => setSubCategory(null)}
              className={`flex-shrink-0 px-3 h-[30px] rounded-lg text-[12px] font-medium transition ${
                !subCategory ? "bg-toss-blue text-white" : "bg-toss-gray-50 text-toss-gray-500"
              }`}
            >
              전체
            </button>
            {activeSubs.map((s) => (
              <button
                key={s.key}
                onClick={() => setSubCategory(s.key)}
                className={`flex-shrink-0 px-3 h-[30px] rounded-lg text-[12px] font-medium transition ${
                  subCategory === s.key ? "bg-toss-blue text-white" : "bg-toss-gray-50 text-toss-gray-500"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-toss-gray-400 text-[15px]">등록된 공고가 없습니다</p>
            <button
              onClick={() => isLoggedIn ? router.push("/jobs/new") : openLoginModal()}
              className="mt-4 text-[14px] font-semibold text-toss-blue"
            >
              첫 공고 올리기
            </button>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="bg-white rounded-2xl border border-toss-gray-100 p-5 cursor-pointer hover:border-toss-gray-200 transition"
              >
                <CategoryBadge category={job.category} />
                <h3 className="text-[16px] font-semibold text-toss-gray-900 mt-2 mb-1">{job.title}</h3>
                <p className="text-[13px] text-toss-gray-500">{job.users?.nickname || "익명"}</p>
                <div className="flex items-center gap-3 mt-3 text-[13px] text-toss-gray-400">
                  <span className="font-medium text-toss-gray-700">{formatBudget(job)}</span>
                  <span>·</span>
                  <span>{job.is_remote ? "재택" : job.region || "미정"}</span>
                  <span>·</span>
                  <span>{timeAgo(job.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
