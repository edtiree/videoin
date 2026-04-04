"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";

const SLIDES = [
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-toss-blue">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: "딱 ��는 편집자를 찾아보세요",
    desc: "영상 편집, 촬영, 썸네일, 모션그래픽\n분야별 전문가를 한 곳에서 만나보세요",
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-toss-blue">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    ),
    title: "AI가 맞춤 추천해드려요",
    desc: "내가 올린 정보를 기반으로\nAI가 나에게 딱 맞는 공고를 추천해요",
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-toss-blue">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2"/>
      </svg>
    ),
    title: "실제 작업물을 확인하세요",
    desc: "편집자의 유���브 포트폴리오를\n직접 확인하고 선택할 수 있어요",
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-toss-blue">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: "쪽지로 부담없이 소통하세요",
    desc: "관심 있는 상대에게 바로 쪽지를 보내\n편하게 소통할 수 있어요",
  },
];

export default function LandingSlide() {
  const { openLoginModal } = useAuth();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(0);

  useEffect(() => {
    if (localStorage.getItem("landing_seen")) return;
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    localStorage.setItem("landing_seen", "1");
    setVisible(false);
  }, []);

  const handleLogin = useCallback(() => {
    close();
    setTimeout(() => openLoginModal(), 300);
  }, [close, openLoginModal]);

  if (!visible) return null;

  const goNext = () => setCurrent((p) => Math.min(p + 1, SLIDES.length - 1));
  const goPrev = () => setCurrent((p) => Math.max(p - 1, 0));

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const slide = SLIDES[current];

  const modal = (
    <div className="fixed inset-0 z-[10000] bg-white dark:bg-[var(--surface)] flex flex-col">
      {/* 상단 닫기 */}
      <div className="flex justify-end p-4">
        <button onClick={close} className="text-toss-gray-400 hover:text-toss-gray-600 p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* 슬라이드 영역 */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mb-8 opacity-80">{slide.icon}</div>
        <h2 className="text-[24px] font-bold text-toss-gray-900 text-center leading-tight mb-3">
          {slide.title}
        </h2>
        <p className="text-[15px] text-toss-gray-400 text-center whitespace-pre-line leading-relaxed">
          {slide.desc}
        </p>
      </div>

      {/* 하단 */}
      <div className="px-6 pb-[env(safe-area-inset-bottom,24px)]">
        {/* 도트 인디케이터 */}
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? "bg-toss-blue w-6" : "bg-toss-gray-200"
              }`}
            />
          ))}
        </div>

        {current === SLIDES.length - 1 ? (
          <>
            <button
              onClick={handleLogin}
              className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] mb-3 transition hover:bg-[var(--blue-hover)]"
            >
              시작하기
            </button>
            <button
              onClick={close}
              className="w-full h-[44px] rounded-xl text-toss-gray-400 text-[14px] hover:bg-toss-gray-50 transition"
            >
              둘러보기
            </button>
          </>
        ) : (
          <button
            onClick={goNext}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] mb-3 transition hover:bg-[var(--blue-hover)]"
          >
            다음
          </button>
        )}
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
