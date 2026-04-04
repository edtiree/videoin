"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface PlanGateModalProps {
  open: boolean;
  onClose: () => void;
  requiredPlan?: string;
}

const PLAN_FEATURES = [
  { plan: "free", label: "프리", price: "무료", features: ["구인구직", "AI 매칭 추천", "공고 3개까지"] },
  { plan: "creator", label: "크리에이터", price: "9,900원/월", features: ["구인구�� 무제한", "AI 도구 전체", "공고 무제한"], highlight: true },
  { plan: "team", label: "팀", price: "29,900원/월", features: ["AI 도구 전체", "정산/달력/직원관리", "공고 무제한"] },
  { plan: "enterprise", label: "기업", price: "49,900원/월", features: ["전체 기능", "광고 관리", "우선 지원"] },
];

export default function PlanGateModal({ open, onClose, requiredPlan = "team" }: PlanGateModalProps) {
  const router = useRouter();

  if (!open) return null;

  const requiredPlanInfo = PLAN_FEATURES.find((p) => p.plan === requiredPlan) || PLAN_FEATURES[2];

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white dark:bg-[var(--surface)] w-full md:w-[420px] md:rounded-2xl rounded-t-2xl p-6 pb-[env(safe-area-inset-bottom,24px)] animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-toss-gray-400 hover:text-toss-gray-600 p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div className="text-center mb-6 mt-2">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-toss-blue" strokeLinecap="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-toss-gray-900">
            {requiredPlanInfo.label} 플랜이 필요해요
          </h2>
          <p className="text-toss-gray-400 text-[14px] mt-1">
            이 기능은 {requiredPlanInfo.label} 플랜부터 이용할 수 있어요
          </p>
        </div>

        {/* 플랜 미니 비교 */}
        <div className="bg-toss-gray-50 rounded-xl p-4 mb-6">
          <p className="text-[13px] font-semibold text-toss-gray-700 mb-2">
            {requiredPlanInfo.label} 플랜 ({requiredPlanInfo.price})
          </p>
          <ul className="space-y-1.5">
            {requiredPlanInfo.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-toss-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-toss-blue" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => { onClose(); router.push("/plans"); }}
          className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] transition hover:bg-[var(--blue-hover)] mb-3"
        >
          플랜 살펴보기
        </button>
        <button
          onClick={onClose}
          className="w-full h-[44px] rounded-xl text-toss-gray-400 text-[14px] hover:bg-toss-gray-50 transition"
        >
          닫기
        </button>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
