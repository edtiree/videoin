"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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

interface SettlementSummary {
  count: number;
  totalAmount: number;
}

interface RecentProject {
  id: string;
  name: string;
  updated_at: string;
  toolIcon: string;
  toolLabel: string;
  href: string;
}

const QUICK_ACTIONS = [
  { key: "settlement", href: "/settlement", icon: "💰", label: "정산 관리" },
  { key: "calendar", href: "/calendar", icon: "📅", label: "촬영 일정" },
];

const ADMIN_QUICK_ACTIONS = [
  { key: "admin-staff", href: "/admin", icon: "👥", label: "직원 관리" },
  { key: "admin-ads", href: "/ads", icon: "📺", label: "광고 관리" },
];

const PROJECT_TOOLS = [
  { key: "youtube-title", label: "제목 생성기", icon: "✏️", api: "/api/youtube-title/projects", href: "/youtube-title" },
  { key: "youtube-shorts", label: "쇼츠 제작기", icon: "🎬", api: "/api/youtube-shorts/projects", href: "/youtube-shorts" },
  { key: "screen-material", label: "화면자료", icon: "🖼️", api: "/api/screen-material/projects", href: "/screen-material" },
  { key: "instagram-card", label: "카드뉴스", icon: "📸", api: "/api/card-projects", href: "/instagram-card" },
];

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function Home() {
  const router = useRouter();
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

  // Dashboard state (must be declared before any early returns to satisfy React hooks rules)
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(true);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

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

  // PIN 포커스는 버튼 클릭 핸들러에서 직접 처리 (iOS 키패드 정책)

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
      window.dispatchEvent(new Event("worker-login"));
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

  // Dashboard data fetching (declared before early returns for hooks rules)
  const fetchSettlements = useCallback(async () => {
    if (!worker) return;
    try {
      const res = await fetch(`/api/settlements/${worker.id}`);
      if (!res.ok) return;
      const all = await res.json();
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const submitted = (all || []).filter(
        (s: { status: string; settlement_month: string }) =>
          s.status === "제출됨" && s.settlement_month?.startsWith(thisMonth)
      );
      const totalAmount = submitted.reduce(
        (sum: number, s: { final_amount: number }) => sum + (s.final_amount || 0),
        0
      );
      setSettlementSummary({ count: submitted.length, totalAmount });
    } catch {
      setSettlementSummary({ count: 0, totalAmount: 0 });
    } finally {
      setSettlementLoading(false);
    }
  }, [worker]);

  const fetchRecentProjects = useCallback(async () => {
    if (!worker) return;
    try {
      const results = await Promise.allSettled(
        PROJECT_TOOLS.map(async (tool) => {
          const res = await fetch(`${tool.api}?workerId=${worker.id}`);
          if (!res.ok) return [];
          const data = await res.json();
          return (data || []).map((p: { id: string; name: string; updated_at: string }) => ({
            id: p.id,
            name: p.name,
            updated_at: p.updated_at,
            toolIcon: tool.icon,
            toolLabel: tool.label,
            href: tool.key === "instagram-card" ? tool.href : `${tool.href}/${p.id}`,
          }));
        })
      );
      const all = results
        .filter((r): r is PromiseFulfilledResult<RecentProject[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);
      all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setRecentProjects(all.slice(0, 5));
    } catch {
      setRecentProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [worker]);

  useEffect(() => {
    if (worker) {
      setSettlementLoading(true);
      setProjectsLoading(true);
      fetchSettlements();
      fetchRecentProjects();
    }
  }, [worker, fetchSettlements, fetchRecentProjects]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-toss-gray-400">불러오는 중...</div>;

  // 로그인 안 됨 → 로그인 폼
  if (!worker) {
    return (
      <div className="fixed inset-0 bg-gray-50 overflow-hidden touch-none">
        <div className="w-full max-w-sm mx-auto px-6 pt-[120px]">
          {step === "phone" ? (
            <>
              <div className="text-center mb-10">
                <h1 className="text-[30px] font-bold text-toss-gray-900 leading-snug">
                  에디트리<br />영상 제작팀
                </h1>
                <p className="text-toss-gray-400 text-[15px] mt-3">휴대폰번호로 접속해 주세요</p>
              </div>

              <div className="bg-white rounded-2xl border border-toss-gray-100 px-5 py-4 flex items-center gap-3 mb-5">
                <span className="text-[14px] text-toss-gray-400 shrink-0 flex items-center gap-1.5 pr-3 border-r border-toss-gray-200">
                  <span className="text-[16px]">🇰🇷</span> +82
                </span>
                <input value={phone} onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setPhone(formatted); setError("");
                    const nums = formatted.replace(/\D/g, "");
                    if (nums.length === 11) { setTimeout(() => { setStep("pin"); setTimeout(() => pinRef.current?.focus(), 50); }, 150); }
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" && phone.replace(/\D/g, "").length >= 10) { setStep("pin"); setTimeout(() => pinRef.current?.focus(), 50); } }}
                  className="flex-1 text-[16px] text-toss-gray-900 focus:outline-none bg-transparent"
                  placeholder="휴대폰번호 입력" inputMode="tel" autoFocus />
              </div>

              {error && <p className="text-toss-red text-[13px] text-center mb-3">{error}</p>}

              <button onClick={() => { setStep("pin"); setTimeout(() => pinRef.current?.focus(), 50); }}
                disabled={phone.replace(/\D/g, "").length < 10}
                className="w-full py-4 bg-toss-blue text-white text-[17px] font-semibold rounded-2xl hover:bg-toss-blue-hover disabled:opacity-40 transition">
                다음
              </button>

              <p className="text-center mt-5 text-[14px] text-toss-gray-400">
                처음이신가요? <Link href="/register" className="text-toss-blue font-semibold hover:underline">회원가입</Link>
              </p>
            </>
          ) : (
            <div onClick={() => pinRef.current?.focus()} className="cursor-default">
              <div className="text-center mb-10">
                <h1 className="text-[26px] font-bold text-toss-gray-900">비밀번호 입력</h1>
                <p className="text-toss-gray-400 text-[16px] mt-3">{phone}</p>
              </div>

              <div className="relative flex justify-center gap-5 mb-10">
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
                <button onClick={(e) => { e.stopPropagation(); setStep("phone"); setPin(""); setError(""); setFailCount(0); }}
                  className="text-[14px] text-toss-gray-400 hover:text-toss-gray-600 transition">
                  ← 번호 다시 입력
                </button>
                {lockedUntil && lockRemain > 0 && (
                  <p className="text-[12px] text-toss-gray-400">비밀번호를 잊으셨나요? 관리자에게 문의하세요.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 로그인 됨 → 대시보드
  const isAdmin = worker.isAdmin === true;

  const quickActions = isAdmin
    ? [...QUICK_ACTIONS, ...ADMIN_QUICK_ACTIONS]
    : QUICK_ACTIONS;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="w-full max-w-md mx-auto px-5 pt-10">

        {/* Header greeting */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[24px] font-bold text-toss-gray-900">
              {worker.name}님, 안녕하세요 👋
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {isAdmin && (
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[11px] font-bold rounded">관리자</span>
              )}
              {!isAdmin && (
                <span className={`px-2 py-0.5 rounded-lg text-[12px] font-bold ${
                  worker.contractType === "프리랜서" ? "bg-orange-50 text-orange-500" : "bg-green-50 text-green-600"
                }`}>{worker.contractType}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-[13px] text-toss-gray-400 hover:text-toss-red transition"
          >
            로그아웃
          </button>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {quickActions.map((action) => (
            <button
              key={action.key}
              onClick={() => router.push(action.href)}
              className="bg-white rounded-2xl border border-toss-gray-100 p-4 flex flex-col items-center gap-2 hover:border-toss-blue hover:bg-blue-50/30 active:scale-[0.97] transition-all shadow-sm"
            >
              <span className="text-[28px]">{action.icon}</span>
              <span className="text-[14px] font-semibold text-toss-gray-900">{action.label}</span>
            </button>
          ))}
        </div>

        {/* 내 정산 현황 card */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-toss-gray-900">이번 달 정산 현황</h2>
            <button
              onClick={() => router.push("/settlement")}
              className="text-[13px] text-toss-blue font-semibold hover:underline"
            >
              자세히 보기
            </button>
          </div>
          {settlementLoading ? (
            <div className="py-4 text-center">
              <p className="text-[14px] text-toss-gray-400">불러오는 중...</p>
            </div>
          ) : settlementSummary && settlementSummary.count > 0 ? (
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[13px] text-toss-gray-500">제출 건수</p>
                <p className="text-[20px] font-bold text-toss-gray-900 mt-0.5">{settlementSummary.count}건</p>
              </div>
              <div className="w-px h-10 bg-toss-gray-100" />
              <div>
                <p className="text-[13px] text-toss-gray-500">총 금액</p>
                <p className="text-[20px] font-bold text-toss-blue mt-0.5">
                  {settlementSummary.totalAmount.toLocaleString()}원
                </p>
              </div>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-[14px] text-toss-gray-500 mb-3">이번 달 정산서를 작성해주세요</p>
              <button
                onClick={() => router.push("/settlement")}
                className="w-full py-3 bg-toss-blue text-white text-[15px] font-semibold rounded-xl hover:bg-toss-blue-hover transition"
              >
                정산서 작성하기
              </button>
            </div>
          )}
        </div>

        {/* 최근 프로젝트 card */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-toss-gray-900">최근 프로젝트</h2>
            <button
              onClick={() => router.push("/tools")}
              className="text-[13px] text-toss-blue font-semibold hover:underline"
            >
              전체 보기
            </button>
          </div>
          {projectsLoading ? (
            <div className="py-4 text-center">
              <p className="text-[14px] text-toss-gray-400">불러오는 중...</p>
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <button
                  key={`${project.href}-${project.id}`}
                  onClick={() => router.push(project.href)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-all text-left"
                >
                  <span className="text-[22px] shrink-0">{project.toolIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-toss-gray-900 truncate">{project.name}</p>
                    <p className="text-[12px] text-toss-gray-400 mt-0.5">{project.toolLabel}</p>
                  </div>
                  <span className="text-[12px] text-toss-gray-400 shrink-0">{timeAgo(project.updated_at)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-[14px] text-toss-gray-500">아직 프로젝트가 없습니다</p>
              <button
                onClick={() => router.push("/tools")}
                className="mt-2 text-[14px] text-toss-blue font-semibold hover:underline"
              >
                새 프로젝트 시작하기
              </button>
            </div>
          )}
        </div>

        {/* 공지사항 card */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
          <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3">공지사항</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-[18px] shrink-0 mt-0.5">📢</span>
              <div className="flex-1">
                <p className="text-[14px] text-toss-gray-900">에디트리 내부 시스템이 오픈되었습니다!</p>
                <p className="text-[12px] text-toss-gray-400 mt-1">2026-03-30</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
