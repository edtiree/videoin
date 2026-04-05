"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

const PLANS = [
  {
    key: "free",
    name: "프리",
    price: "무료",
    priceNum: 0,
    desc: "구인구직을 시작하세요",
    features: [
      { label: "구인구직", included: true },
      { label: "AI 매칭 추천", included: true },
      { label: "공고 3개까지", included: true },
      { label: "AI 도구", included: false },
      { label: "정산/달력 관리", included: false },
      { label: "직원 관리", included: false },
      { label: "광고 관리", included: false },
    ],
  },
  {
    key: "creator",
    name: "크리에이터",
    price: "9,900원",
    priceNum: 9900,
    desc: "AI 도구로 영상 제작을 더 쉽게",
    popular: true,
    features: [
      { label: "구인구직", included: true },
      { label: "AI 매칭 추천", included: true },
      { label: "공고 무제한", included: true },
      { label: "AI 도구 전체", included: true },
      { label: "정산/달력 관리", included: false },
      { label: "직원 관리", included: false },
      { label: "광고 관리", included: false },
    ],
  },
  {
    key: "team",
    name: "팀",
    price: "29,900원",
    priceNum: 29900,
    desc: "팀 운영에 필요한 모든 것",
    features: [
      { label: "구인구직", included: true },
      { label: "AI 매칭 추천", included: true },
      { label: "공고 무제한", included: true },
      { label: "AI 도구 전체", included: true },
      { label: "정산/달력 관리", included: true },
      { label: "직원 관리", included: true },
      { label: "광고 관리", included: false },
    ],
  },
  {
    key: "enterprise",
    name: "기업",
    price: "49,900원",
    priceNum: 49900,
    desc: "대규모 팀을 위한 전체 기능",
    features: [
      { label: "구인구직", included: true },
      { label: "AI 매칭 추천", included: true },
      { label: "공고 무제한", included: true },
      { label: "AI 도구 전체", included: true },
      { label: "정산/달력 관리", included: true },
      { label: "직원 관리", included: true },
      { label: "광고 관리", included: true },
    ],
  },
];

export default function PlansPage() {
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [toast, setToast] = useState("");

  const currentPlan = profile?.plan || "free";

  const handleSelect = (planKey: string) => {
    if (!isLoggedIn) { openLoginModal(); return; }
    if (planKey === currentPlan) return;
    if (planKey === "free") {
      // 무료 전환은 바로 가능
      setToast("프리 플랜으로 변경되었습니다");
      setTimeout(() => setToast(""), 3000);
      return;
    }
    // 유료 결제는 아직 미연동
    setToast("결제 기능을 준비 중입니다. 곧 오픈 예정이에요!");
    setTimeout(() => setToast(""), 3000);
  };

  return (
    <>
      <TopNav title="플랜" backHref="/" />

      <div className="max-w-[1200px] mx-auto px-4 py-5">
        <div className="text-center mb-6">
          <h1 className="text-[24px] font-bold text-toss-gray-900">나에게 맞는 플랜을 선택하세요</h1>
          <p className="text-[14px] text-toss-gray-400 mt-1">모든 플랜은 언제든 변경할 수 있어요</p>
        </div>

        <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-4 md:space-y-0">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div
                key={plan.key}
                className={`bg-white rounded-2xl border-2 p-5 relative transition ${
                  plan.popular ? "border-toss-blue" : isCurrent ? "border-toss-green" : "border-toss-gray-100"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-4 bg-toss-blue text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    인기
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-4 bg-toss-green text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    현재 플랜
                  </span>
                )}

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <h3 className="text-[18px] font-bold text-toss-gray-900">{plan.name}</h3>
                    <p className="text-[13px] text-toss-gray-400">{plan.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] font-bold text-toss-gray-900">{plan.price}</p>
                    {plan.priceNum > 0 && <p className="text-[11px] text-toss-gray-300">/월</p>}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {plan.features.map((f) => (
                    <div key={f.label} className="flex items-center gap-2">
                      {f.included ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-toss-blue flex-shrink-0" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-gray-200 flex-shrink-0" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      )}
                      <span className={`text-[13px] ${f.included ? "text-toss-gray-700" : "text-toss-gray-300"}`}>
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSelect(plan.key)}
                  disabled={isCurrent}
                  className={`w-full h-[44px] rounded-xl text-[14px] font-semibold transition ${
                    isCurrent
                      ? "bg-toss-gray-50 text-toss-gray-400 cursor-default"
                      : plan.popular
                        ? "bg-toss-blue text-white hover:bg-[var(--blue-hover)]"
                        : "bg-toss-gray-900 text-white hover:bg-toss-gray-800"
                  }`}
                >
                  {isCurrent ? "현재 사용 중" : plan.priceNum === 0 ? "무료로 시작하기" : "시작하기"}
                </button>
              </div>
            );
          })}
        </div>

        {/* 토스트 */}
        {toast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-toss-gray-900 text-white text-[14px] px-6 py-3 rounded-xl shadow-lg animate-slide-up z-[9999]">
            {toast}
          </div>
        )}
      </div>
    </>
  );
}
