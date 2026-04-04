"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseAuthBrowser } from "@/lib/supabase-auth-browser";

type AuthStep = "social" | "phone" | "otp";

const SOCIAL_PROVIDERS = [
  {
    id: "kakao" as const,
    label: "카카오로 시작하기",
    bg: "#FEE500",
    text: "#000000",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3C5.58 3 2 5.95 2 9.56c0 2.3 1.5 4.33 3.77 5.5l-.97 3.56c-.08.29.25.52.5.35l4.26-2.83c.14.01.29.02.44.02 4.42 0 8-2.95 8-6.6C18 5.95 14.42 3 10 3z" fill="#000"/>
      </svg>
    ),
  },
  {
    id: "google" as const,
    label: "Google로 시작하기",
    bg: "#FFFFFF",
    text: "#000000",
    border: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M17.64 10.2c0-.63-.06-1.25-.16-1.84H10v3.49h4.29a3.67 3.67 0 01-1.59 2.41v2h2.57c1.5-1.39 2.37-3.43 2.37-6.06z" fill="#4285F4"/>
        <path d="M10 18c2.15 0 3.95-.71 5.27-1.93l-2.57-2a5.06 5.06 0 01-7.54-2.66H2.53v2.06A8 8 0 0010 18z" fill="#34A853"/>
        <path d="M5.16 11.41a4.82 4.82 0 010-3.07V6.28H2.53a8 8 0 000 7.19l2.63-2.06z" fill="#FBBC05"/>
        <path d="M10 5.08a4.33 4.33 0 013.06 1.2l2.3-2.3A7.72 7.72 0 0010 2a8 8 0 00-7.47 4.28l2.63 2.06A4.77 4.77 0 0110 5.08z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: "apple" as const,
    label: "Apple로 시작하기",
    bg: "#000000",
    text: "#FFFFFF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
        <path d="M14.94 10.37c-.02-2.08 1.7-3.08 1.78-3.13-1-.14-1.94-.58-2.48-1.48-.52-.87-.64-2.11.04-3.43-.96.47-1.6 1.18-2.02 1.68-.82-1.27-2.07-1.27-2.5-1.27-2.12.03-4.12 1.83-4.12 4.75 0 1.82.71 3.75 1.58 5.01.86 1.09 1.86 2.33 3.18 2.29.64-.03 1.09-.41 2.02-.41.9 0 1.32.41 2.02.4 1.36-.02 2.22-1.11 3.06-2.2a10.7 10.7 0 001.39-2.83c-1.47-.57-2.45-1.95-2.95-4.38z"/>
      </svg>
    ),
  },
  {
    id: "facebook" as const,
    label: "Facebook으로 시작하기",
    bg: "#1877F2",
    text: "#FFFFFF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
        <path d="M18 10a8 8 0 10-9.25 7.9v-5.59H6.7V10h2.05V8.22c0-2.03 1.2-3.14 3.05-3.14.88 0 1.81.16 1.81.16v2h-1.02c-1 0-1.32.63-1.32 1.27V10h2.22l-.35 2.31h-1.87v5.6A8 8 0 0018 10z"/>
      </svg>
    ),
  },
];

export default function LoginModal() {
  const { showLoginModal, closeLoginModal } = useAuth();
  const [step, setStep] = useState<AuthStep>("social");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!showLoginModal) return null;

  const supabase = getSupabaseAuthBrowser();

  const handleSocialLogin = async (provider: "kakao" | "google" | "apple" | "facebook") => {
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (err) {
      setError("로그인에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  };

  const handlePhoneSend = async () => {
    if (phone.length < 10) {
      setError("올바른 휴대폰 번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");

    const formatted = phone.startsWith("0")
      ? "+82" + phone.slice(1)
      : phone.startsWith("+") ? phone : "+82" + phone;

    const { error: err } = await supabase.auth.signInWithOtp({ phone: formatted });
    if (err) {
      setError("인증번호 발송에 실패했습니다.");
      setLoading(false);
      return;
    }
    setStep("otp");
    setLoading(false);
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 6) {
      setError("6자리 인증번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError("");

    const formatted = phone.startsWith("0")
      ? "+82" + phone.slice(1)
      : phone.startsWith("+") ? phone : "+82" + phone;

    const { error: err } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: "sms",
    });
    if (err) {
      setError("인증번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }
    setLoading(false);
    // AuthProvider의 onAuthStateChange가 나머지 처리
  };

  const handleClose = () => {
    setStep("social");
    setPhone("");
    setOtp("");
    setError("");
    setLoading(false);
    closeLoginModal();
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* 모달 */}
      <div className="relative bg-white dark:bg-[var(--surface)] w-full md:w-[420px] md:rounded-2xl rounded-t-2xl p-6 pb-[env(safe-area-inset-bottom,24px)] animate-slide-up">
        {/* 닫기 */}
        <button onClick={handleClose} className="absolute top-4 right-4 text-toss-gray-400 hover:text-toss-gray-600 p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* 로고 + 타이틀 */}
        <div className="text-center mb-8 mt-2">
          <div className="flex justify-center mb-3">
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none" className="text-toss-blue">
              <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.1"/>
              <path d="M8 7L16 25L20 16L24 25L24 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 7L16 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-toss-gray-900">영상인에 오신 것을 환영합니다</h2>
          <p className="text-toss-gray-400 text-[14px] mt-1">크리에이터와 편집자를 위한 플랫폼</p>
        </div>

        {step === "social" && (
          <div className="space-y-3">
            {SOCIAL_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSocialLogin(p.id)}
                disabled={loading}
                className="w-full h-[52px] rounded-xl flex items-center justify-center gap-2 text-[15px] font-semibold transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: p.bg,
                  color: p.text,
                  border: p.border ? "1px solid #E5E7EB" : "none",
                }}
              >
                {p.icon}
                {p.label}
              </button>
            ))}

            {/* 휴대폰 로그인 */}
            <button
              onClick={() => setStep("phone")}
              disabled={loading}
              className="w-full h-[52px] rounded-xl flex items-center justify-center gap-2 text-[15px] font-semibold bg-toss-gray-100 text-toss-gray-700 hover:bg-toss-gray-200 transition disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
              휴대폰 번호로 시작하기
            </button>

            {error && <p className="text-center text-toss-red text-[13px] mt-2">{error}</p>}
          </div>
        )}

        {step === "phone" && (
          <div className="space-y-4">
            <button onClick={() => { setStep("social"); setError(""); }} className="text-toss-gray-400 text-[14px] flex items-center gap-1 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              뒤로
            </button>

            <div>
              <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">휴대폰 번호</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="01012345678"
                className="w-full h-[52px] rounded-xl border border-toss-gray-200 px-4 text-[16px] focus:outline-none focus:border-toss-blue"
                maxLength={11}
                autoFocus
              />
            </div>

            {error && <p className="text-toss-red text-[13px]">{error}</p>}

            <button
              onClick={handlePhoneSend}
              disabled={loading || phone.length < 10}
              className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] disabled:opacity-50 transition"
            >
              {loading ? "발송 중..." : "인증번호 받기"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }} className="text-toss-gray-400 text-[14px] flex items-center gap-1 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              뒤로
            </button>

            <p className="text-[14px] text-toss-gray-500">
              <span className="font-semibold text-toss-gray-900">{phone}</span>으로 인증번호를 보냈습니다
            </p>

            <div>
              <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">인증번호 6자리</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full h-[52px] rounded-xl border border-toss-gray-200 px-4 text-[16px] text-center tracking-[0.3em] focus:outline-none focus:border-toss-blue"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && <p className="text-toss-red text-[13px]">{error}</p>}

            <button
              onClick={handleOtpVerify}
              disabled={loading || otp.length !== 6}
              className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] disabled:opacity-50 transition"
            >
              {loading ? "확인 중..." : "확인"}
            </button>
          </div>
        )}

        {/* 약관 */}
        <p className="text-center text-[11px] text-toss-gray-300 mt-6">
          로그인 시 <span className="underline">서비스 이용약관</span> 및 <span className="underline">개인정보 처리방침</span>에 동의합니다
        </p>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
