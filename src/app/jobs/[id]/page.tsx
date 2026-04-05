"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import CategoryBadge from "@/components/common/CategoryBadge";
import TopNav from "@/components/TopNav";

interface JobDetail {
  id: string;
  user_id: string;
  title: string;
  description: string;
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
  status: string;
  created_at: string;
  users?: { nickname: string; profile_image: string | null };
}

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoggedIn, openLoginModal, profile } = useAuth();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((data) => { setJob(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <TopNav title="공고 상세" backHref="/jobs" />
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" /></div>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <TopNav title="공고 상세" backHref="/jobs" />
        <div className="text-center py-20 text-toss-gray-400">공고를 찾을 수 없습니다</div>
      </>
    );
  }

  const isOwner = profile?.id === job.user_id;

  const formatBudget = () => {
    if (job.budget_min && job.budget_max) return `${(job.budget_min / 10000).toFixed(0)}~${(job.budget_max / 10000).toFixed(0)}만원`;
    if (job.budget_amount) return `${(job.budget_amount / 10000).toFixed(0)}만원`;
    return "협의";
  };

  return (
    <>
      <TopNav title="공고 상세" backHref="/jobs" rightContent={
        isOwner ? (
          <button onClick={() => router.push(`/jobs/${id}/edit`)} className="text-[14px] font-semibold text-toss-blue">수정</button>
        ) : null
      } />

      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-5 md:py-8">
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 md:p-8 mb-4">
          <CategoryBadge category={job.category} size="md" />
          <h1 className="text-[22px] md:text-[28px] font-bold text-toss-gray-900 mt-3 mb-2">{job.title}</h1>
          <p className="text-[14px] text-toss-gray-500 mb-4">{job.users?.nickname || "익명"}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">예산</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">{formatBudget()}</p>
            </div>
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">근무 방식</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">{job.is_remote ? "재택" : job.region || "미정"}</p>
            </div>
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">마감</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">{job.deadline_type === "always" ? "상시채용" : job.deadline || "미정"}</p>
            </div>
            <div className="bg-toss-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-toss-gray-400 mb-0.5">조회</p>
              <p className="text-[15px] font-semibold text-toss-gray-900">{job.view_count || 0}회</p>
            </div>
          </div>

          {job.description && (
            <div className="border-t border-toss-gray-100 pt-4">
              <h3 className="text-[14px] font-semibold text-toss-gray-900 mb-2">상세 내용</h3>
              <p className="text-[14px] text-toss-gray-600 whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>
          )}
        </div>

        {/* 연락하기 */}
        {!isOwner && (
          <button
            onClick={() => {
              if (!isLoggedIn) { openLoginModal(); return; }
              router.push(`/messages?job=${job.id}&to=${job.user_id}&source=job`);
            }}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] transition hover:bg-[var(--blue-hover)]"
          >
            쪽지 보내기
          </button>
        )}
      </div>
    </>
  );
}
