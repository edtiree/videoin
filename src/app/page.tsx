"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface WorkerSession {
  id: string;
  name: string;
  phone: string;
  role: string;
  contractType: string;
  approved: boolean;
  isAdmin?: boolean;
  allowedServices?: string[];
  [key: string]: unknown;
}

const ALL_MENUS = [
  { key: "settlement", href: "/settlement", icon: "💰", title: "정산 관리", desc: "촬영비·편집비 정산서 작성 및 제출" },
  { key: "calendar", href: "/calendar", icon: "📅", title: "촬영 일정", desc: "촬영·업로드 일정 캘린더" },
  { key: "review", href: "/review", icon: "🎬", title: "영상 리뷰", desc: "영상 공유 및 타임코드 피드백" },
  { key: "instagram-card", href: "/instagram-card", icon: "📸", title: "카드뉴스 메이커", desc: "인스타 카드뉴스 자동 생성" },
  { key: "youtube-title", href: "/youtube-title", icon: "✏️", title: "제목 생성기", desc: "AI 유튜브 제목·썸네일 문구 생성" },
];

const ADMIN_MENUS = [
  { key: "admin-staff", href: "/admin", icon: "👥", title: "직원·정산 관리", desc: "직원 승인, 정산서 확인, 대시보드" },
  { key: "admin-ads", href: "/ads", icon: "📺", title: "광고 관리", desc: "광고 DB, 정산현황, 캘린더" },
];

export default function Home() {
  const [worker, setWorker] = useState<WorkerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockRemain, setLockRemain] = useState(0);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (saved) {
      try {
        const w = JSON.parse(saved);
        setWorker(w);
        // 최신 권한 정보 가져오기
        fetch(`/api/worker/${w.id}`).then(r => r.ok ? r.json() : null).then(data => {
          if (data) {
            const updated = { ...w, allowedServices: data.allowedServices ?? data.allowed_services ?? w.allowedServices, isAdmin: data.isAdmin ?? data.is_admin ?? w.isAdmin };
            setWorker(updated);
            localStorage.setItem("worker", JSON.stringify(updated));
          }
        }).catch(() => {});
      } catch {
        localStorage.removeItem("worker");
      }
    }
    setLoading(false);
  }, []);

  // 잠금 상태 복원
  useEffect(() => {
    const saved = localStorage.getItem("login_lock");
    if (saved) {
      const lock = JSON.parse(saved);
      if (lock.until > Date.now()) {
        setLockedUntil(lock.until);
        setFailCount(lock.count);
      } else {
        localStorage.removeItem("login_lock");
      }
    }
  }, []);

  // 잠금 카운트다운
  useEffect(() => {
    if (!lockedUntil) { setLockRemain(0); return; }
    const tick = () => {
      const remain = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remain <= 0) {
        setLockedUntil(null);
        setLockRemain(0);
        setFailCount(0);
        localStorage.removeItem("login_lock");
      } else {
        setLockRemain(remain);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    if (step === "pin") setTimeout(() => pinRef.current?.focus(), 50);
  }, [step]);

  const formatPhone = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const doLogin = async (pinVal: string) => {
    if (lockedUntil && lockedUntil > Date.now()) { setPin(""); return; }
    setLoggingIn(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), pin: pinVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        const newCount = failCount + 1;
        setFailCount(newCount);
        if (newCount >= 5) {
          const until = Date.now() + 5 * 60 * 1000; // 5분
          setLockedUntil(until);
          localStorage.setItem("login_lock", JSON.stringify({ until, count: newCount }));
          setError("5회 이상 틀렸습니다. 5분 후 다시 시도해주세요.");
        } else {
          setError(`${data.error} (${newCount}/5)`);
        }
        setPin("");
        return;
      }
      if (!data.worker.approved) { setError("관리자 승인 대기 중입니다."); setPin(""); return; }
      setFailCount(0);
      localStorage.removeItem("login_lock");
      localStorage.setItem("worker", JSON.stringify(data.worker));
      setWorker(data.worker);
    } catch {
      setError("서버 오류가 발생했습니다.");
      setPin("");
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePinInput = (val: string) => {
    if (lockedUntil && lockedUntil > Date.now()) return;
    const nums = val.replace(/\D/g, "").slice(0, 4);
    setPin(nums);
    if (nums.length === 4) doLogin(nums);
  };

  const handleLogout = () => {
    localStorage.removeItem("worker");
    setWorker(null);
    setPhone("");
    setPin("");
    setStep("phone");
    setError("");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-toss-gray-400">불러오는 중...</div>;

  // 로그인 안 됨 → 로그인 폼
  if (!worker) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
        <div className="w-full max-w-sm">
          {step === "phone" ? (
            <>
              <div className="text-center mb-10">
                <h1 className="text-[30px] font-bold text-toss-gray-900 leading-snug">
                  영상 제작팀<br />내부 시스템
                </h1>
                <p className="text-toss-gray-400 text-[15px] mt-3">휴대폰번호로 접속해 주세요</p>
              </div>

              <div className="bg-white rounded-2xl border border-toss-gray-100 px-5 py-4 flex items-center gap-3 mb-5">
                <span className="text-[14px] text-toss-gray-400 shrink-0 flex items-center gap-1.5 pr-3 border-r border-toss-gray-200">
                  <span className="text-[16px]">🇰🇷</span> +82
                </span>
                <input value={phone} onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && phone.replace(/\D/g, "").length >= 10 && setStep("pin")}
                  className="flex-1 text-[16px] text-toss-gray-900 focus:outline-none bg-transparent"
                  placeholder="휴대폰번호 입력" inputMode="tel" autoFocus />
              </div>

              {error && <p className="text-toss-red text-[13px] text-center mb-3">{error}</p>}

              <button onClick={() => setStep("pin")}
                disabled={phone.replace(/\D/g, "").length < 10}
                className="w-full py-4 bg-toss-blue text-white text-[17px] font-semibold rounded-2xl hover:bg-toss-blue-hover disabled:opacity-40 transition">
                다음
              </button>

              <p className="text-center mt-5 text-[14px] text-toss-gray-400">
                처음이신가요? <Link href="/register" className="text-toss-blue font-semibold hover:underline">회원가입</Link>
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-10">
                <h1 className="text-[26px] font-bold text-toss-gray-900">비밀번호 입력</h1>
                <p className="text-toss-gray-400 text-[16px] mt-3">{phone}</p>
              </div>

              <div className="relative flex justify-center gap-5 mb-10"
                onClick={() => pinRef.current?.focus()}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}
                    className={`w-[60px] h-[60px] rounded-2xl flex items-center justify-center transition-all duration-200 ${
                      pin.length > i
                        ? "bg-toss-blue"
                        : pin.length === i
                        ? "bg-white border-2 border-toss-blue"
                        : "bg-toss-gray-100"
                    }`}>
                    {pin.length > i && <div className="w-3 h-3 bg-white rounded-full" />}
                  </div>
                ))}
                <input ref={pinRef} type="tel" value={pin} autoFocus
                  onChange={(e) => handlePinInput(e.target.value)}
                  autoComplete="off"
                  className="absolute inset-0 opacity-0 w-full h-full caret-transparent"
                  inputMode="numeric" />
              </div>

              {lockedUntil && lockRemain > 0 ? (
                <div className="text-center mb-3">
                  <p className="text-toss-red text-[14px] font-semibold">5회 이상 틀렸습니다</p>
                  <p className="text-toss-red text-[13px] mt-1">{Math.floor(lockRemain / 60)}분 {lockRemain % 60}초 후 다시 시도해주세요</p>
                </div>
              ) : (
                <>
                  {error && <p className="text-toss-red text-[13px] text-center mb-3">{error}</p>}
                  {loggingIn && <p className="text-toss-blue text-[13px] text-center mb-3">로그인 중...</p>}
                </>
              )}

              <div className="flex flex-col items-center gap-3 mt-2">
                <button onClick={() => { setStep("phone"); setPin(""); setError(""); setFailCount(0); }}
                  className="text-[14px] text-toss-gray-400 hover:text-toss-gray-600 transition">
                  ← 번호 다시 입력
                </button>
                {lockedUntil && lockRemain > 0 && (
                  <p className="text-[12px] text-toss-gray-400">비밀번호를 잊으셨나요? 관리자에게 문의하세요.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // 로그인 됨 → 메뉴
  const isAdmin = worker.isAdmin === true;
  const allowed = worker.allowedServices || ["settlement", "calendar", "review"];
  const visibleMenus = isAdmin
    ? ALL_MENUS
    : ALL_MENUS.filter((m) => allowed.includes(m.key));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-[28px] font-bold text-toss-gray-900 leading-tight">
              영상 제작팀<br />내부 시스템
            </h1>
          </div>
          <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-bold text-toss-gray-900">{worker.name}</span>
                  {isAdmin && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-bold rounded">관리자</span>}
                </div>
                {!isAdmin && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[12px] font-bold ${
                    worker.contractType === "프리랜서" ? "bg-orange-50 text-orange-500" : "bg-green-50 text-green-600"
                  }`}>{worker.contractType}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <Link href="/settlement" className="text-toss-gray-400 hover:text-toss-blue transition">내 정보</Link>
                <span className="text-toss-gray-200">|</span>
                <button onClick={handleLogout} className="text-toss-gray-400 hover:text-toss-red transition">로그아웃</button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {visibleMenus.map((m) => (
            <Link key={m.key} href={m.href}
              className="w-full flex items-center gap-4 bg-white rounded-2xl border border-toss-gray-100 p-5 hover:border-toss-blue hover:bg-blue-50/30 active:scale-[0.98] transition-all text-left shadow-sm">
              <span className="text-[32px]">{m.icon}</span>
              <div>
                <p className="text-[17px] font-bold text-toss-gray-900">{m.title}</p>
                <p className="text-[13px] text-toss-gray-500 mt-0.5">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {isAdmin && (
          <div className="mt-6">
            <p className="text-[12px] font-bold text-toss-gray-400 uppercase mb-2 px-1">관리자</p>
            <div className="space-y-3">
              {ADMIN_MENUS.map((m) => (
                <Link key={m.key} href={m.href}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl border border-toss-gray-100 p-5 hover:border-toss-blue hover:bg-blue-50/30 active:scale-[0.98] transition-all text-left shadow-sm">
                  <span className="text-[32px]">{m.icon}</span>
                  <div>
                    <p className="text-[17px] font-bold text-toss-gray-900">{m.title}</p>
                    <p className="text-[13px] text-toss-gray-500 mt-0.5">{m.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {visibleMenus.length === 0 && (
          <div className="text-center py-12">
            <p className="text-toss-gray-400 text-[14px]">사용 가능한 서비스가 없습니다.</p>
            <p className="text-toss-gray-400 text-[13px] mt-1">관리자에게 문의하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
