"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCache, setCache } from "@/lib/cache";


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

interface SettlementDashboard {
  thisMonth: { total: number; byRole: Record<string, number>; statusTotals: Record<string, number> };
  lastMonth: { total: number; byRole: Record<string, number> };
}

interface RecentProject {
  id: string;
  name: string;
  updated_at: string;
  toolIcon: string;
  toolLabel: string;
  href: string;
}

interface TaskRequest {
  id: string;
  type: string;
  title: string;
  message: string;
  deadlineDate: string | null;
  link?: string;
  createdAt: string;
}

interface ToolProjectCount {
  key: string;
  label: string;
  icon: string;
  total: number;
  completed: number;
  inProgress: number;
}

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

  // Dashboard state
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null);
  const [settlementDashboard, setSettlementDashboard] = useState<SettlementDashboard | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allSettlements, setAllSettlements] = useState<any[]>([]);
  const [showSettleDetail, setShowSettleDetail] = useState(false);
  const [detailMonth, setDetailMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });
  const [expandedSettleId, setExpandedSettleId] = useState<string | null>(null);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [settleDetailMounted, setSettleDetailMounted] = useState(false);
  const [showTasksSheet, setShowTasksSheet] = useState(false);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [taskView, setTaskView] = useState<"list" | "calendar">("list");
  const [taskCalMonth, setTaskCalMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() + 1 }; });
  const [showProjectsSheet, setShowProjectsSheet] = useState(false);
  const detailYearTimer = useRef<NodeJS.Timeout | null>(null);
  const detailMonthTimer = useRef<NodeJS.Timeout | null>(null);
  const [pickerDetailYear, setPickerDetailYear] = useState(new Date().getFullYear());
  const [pickerDetailMonth, setPickerDetailMonth] = useState(new Date().getMonth() + 1);
  const DETAIL_ITEM_H = 40;
  const DETAIL_YEARS = Array.from({ length: 10 }, (_, i) => 2020 + i);
  const DETAIL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [toolCounts, setToolCounts] = useState<ToolProjectCount[]>([]);
  const [taskRequests, setTaskRequests] = useState<TaskRequest[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("completedTasks") || "[]")); } catch { return new Set(); }
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const toggleTaskComplete = useCallback((taskId: string) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      localStorage.setItem("completedTasks", JSON.stringify([...next]));
      return next;
    });
  }, []);

  // 캐시에서 초기 데이터 로드
  useEffect(() => {
    const cs = getCache<SettlementSummary>("home_settlement");
    if (cs) { setSettlementSummary(cs); setSettlementLoading(false); }
    const cd = getCache<SettlementDashboard>("home_settle_dashboard");
    if (cd) setSettlementDashboard(cd);
    const cp = getCache<RecentProject[]>("home_projects");
    if (cp) { setRecentProjects(cp); setProjectsLoading(false); }
    const ct = getCache<ToolProjectCount[]>("home_toolcounts");
    if (ct) setToolCounts(ct);
    const ctr = getCache<TaskRequest[]>("home_tasks");
    if (ctr) setTaskRequests(ctr);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ca = getCache<any[]>("home_announcements");
    if (ca) setAnnouncements(ca);
  }, []);

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
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

      // 지난달은 확정된 것만
      const activeLast = (all || []).filter(
        (s: { status: string }) => s.status === "제출됨" || s.status === "정산완료"
      );
      // 이번달은 임시저장 포함 전체
      const allStatuses = (all || []).filter(
        (s: { status: string }) => s.status !== ""
      );

      // 기존 요약
      const submitted = allStatuses.filter(
        (s: { settlement_month: string; status: string }) =>
          s.settlement_month?.startsWith(thisMonth) && s.status !== "임시저장"
      );
      const totalAmount = submitted.reduce(
        (sum: number, s: { final_amount: number }) => sum + (s.final_amount || 0), 0
      );
      const summary = { count: submitted.length, totalAmount };
      setSettlementSummary(summary);
      setCache("home_settlement", summary);

      // 대시보드 데이터 — 이번달 (임시저장 포함)
      const thisMonthItems = allStatuses.filter(
        (s: { settlement_month: string }) => s.settlement_month?.startsWith(thisMonth)
      );
      const thisMonthTotal = thisMonthItems.reduce(
        (sum: number, s: { final_amount: number }) => sum + (s.final_amount || 0), 0
      );
      const thisMonthByRole: Record<string, number> = {};
      thisMonthItems.forEach((s: { role: string; final_amount: number }) => {
        thisMonthByRole[s.role] = (thisMonthByRole[s.role] || 0) + (s.final_amount || 0);
      });
      const statusTotals: Record<string, number> = {};
      thisMonthItems.forEach((s: { status: string; final_amount: number }) => {
        statusTotals[s.status] = (statusTotals[s.status] || 0) + (s.final_amount || 0);
      });

      // 지난달 (확정만)
      const lastMonthItems = activeLast.filter(
        (s: { settlement_month: string }) => s.settlement_month?.startsWith(lastMonth)
      );
      const lastMonthTotal = lastMonthItems.reduce(
        (sum: number, s: { final_amount: number }) => sum + (s.final_amount || 0), 0
      );
      const lastMonthByRole: Record<string, number> = {};
      lastMonthItems.forEach((s: { role: string; final_amount: number }) => {
        lastMonthByRole[s.role] = (lastMonthByRole[s.role] || 0) + (s.final_amount || 0);
      });

      const dashboard: SettlementDashboard = {
        thisMonth: { total: thisMonthTotal, byRole: thisMonthByRole, statusTotals },
        lastMonth: { total: lastMonthTotal, byRole: lastMonthByRole },
      };
      setSettlementDashboard(dashboard);
      setCache("home_settle_dashboard", dashboard);
      setAllSettlements(all || []);
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
          if (!res.ok) return { tool, projects: [] };
          const data = await res.json();
          return { tool, projects: data || [] };
        })
      );

      const allProjects: RecentProject[] = [];
      const counts: ToolProjectCount[] = [];

      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { tool, projects } = result.value;
        const mapped = projects.map((p: { id: string; name: string; updated_at: string }) => ({
          id: p.id,
          name: p.name,
          updated_at: p.updated_at,
          toolIcon: tool.icon,
          toolLabel: tool.label,
          href: tool.key === "instagram-card" ? tool.href : `${tool.href}/${p.id}`,
        }));
        allProjects.push(...mapped);

        const completed = projects.filter((p: { status?: string }) => p.status === "completed").length;
        counts.push({
          key: tool.key,
          label: tool.label,
          icon: tool.icon,
          total: projects.length,
          completed,
          inProgress: projects.length - completed,
        });
      }

      allProjects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const recent = allProjects.slice(0, 5);
      setRecentProjects(recent);
      setToolCounts(counts);
      setCache("home_projects", recent);
      setCache("home_toolcounts", counts);
    } catch {
      setRecentProjects([]);
      setToolCounts([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [worker]);

  const dashboardFetched = useRef(false);
  useEffect(() => {
    if (worker && !dashboardFetched.current) {
      dashboardFetched.current = true;
      fetchSettlements();
      fetchRecentProjects();
      // 요청/마감 알림 가져오기
      fetch(`/api/notifications?workerId=${worker.id}`)
        .then(r => r.json())
        .then(data => {
          const allNotifs = data.notifications || [];
          // 작업 요청 (deadline, filming, editing)
          const requests = allNotifs
            .filter((n: TaskRequest) => n.type !== "announcement")
            .filter((n: TaskRequest) => {
              if (!n.deadlineDate) return true; // 마감일 미정은 항상 표시
              const dd = new Date(n.deadlineDate); const now = new Date();
              const diff = Math.round((new Date(dd.getFullYear(), dd.getMonth(), dd.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
              return diff >= 0; // 마감일 지난 건 숨김
            });
          setTaskRequests(requests);
          setCache("home_tasks", requests);
          // 공지사항
          const announcements = allNotifs
            .filter((n: { type: string }) => n.type === "announcement")
            .slice(0, 10);
          setAnnouncements(announcements);
          setCache("home_announcements", announcements);
        })
        .catch(() => {});
    }
  }, [worker, fetchSettlements, fetchRecentProjects]);

  // 데이터 로딩 완료 시 스플래시 제거
  useEffect(() => {
    if (!loading && !settlementLoading && !projectsLoading) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).dismissSplash?.();
    }
  }, [loading, settlementLoading, projectsLoading]);

  // 비로그인 상태에서도 스플래시 제거 (로그인 폼 표시)
  useEffect(() => {
    if (!loading && !worker) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).dismissSplash?.();
    }
  }, [loading, worker]);

  if (loading) return <div className="min-h-full bg-gray-50" />;

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

  const quickActions = isAdmin ? ADMIN_QUICK_ACTIONS : [];

  return (
    <div className="min-h-full bg-gray-50 pb-20">

      <div className="w-full max-w-md md:max-w-3xl mx-auto px-5 md:px-8 pt-6">

        {/* Header greeting */}
        <div className="mb-8">
          <h1 className="text-[24px] font-bold text-toss-gray-900">
            {worker.name}님, 안녕하세요 👋
          </h1>
        </div>

        {/* 요청된 작업 — 항상 표시, 데드라인 임박순 */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-toss-gray-900">요청된 작업</h2>
            <button onClick={() => setShowTasksSheet(true)} className="text-[13px] text-toss-blue font-semibold hover:underline">전체 보기</button>
          </div>
          <div className="flex gap-1.5 mb-3">
            {([["all", "전체"], ["filming", "촬영"], ["editing", "편집"], ["shorts", "쇼츠"], ["cardnews", "카드뉴스"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTaskFilter(k)}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${
                  taskFilter === k ? "bg-toss-gray-900 text-white" : "bg-toss-gray-100 text-toss-gray-500"
                }`}>{l}</button>
            ))}
          </div>
          {(() => {
            const pending = taskRequests.filter(t => !completedTasks.has(t.id) && (taskFilter === "all" || t.type === taskFilter));
            return pending.length > 0 ? (
            <div className="space-y-1">
              {[...pending]
                .sort((a, b) => {
                  if (!a.deadlineDate && !b.deadlineDate) return 0;
                  if (!a.deadlineDate) return 1;
                  if (!b.deadlineDate) return -1;
                  return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
                })
                .slice(0, 5)
                .map((task) => {
                  const hasDeadline = !!task.deadlineDate;
                  const daysLeft = hasDeadline ? (() => { const t = new Date(task.deadlineDate!); const n = new Date(); return Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86400000); })() : null;
                  const isOverdue = hasDeadline && daysLeft! < 0;
                  const isUrgent = hasDeadline && daysLeft! >= 0 && daysLeft! <= 2;
                  const typeIcon = task.type === "filming" ? "🎬" : task.type === "editing" ? "✂️" : task.type === "shorts" ? "🎞️" : task.type === "cardnews" ? "📰" : "📅";
                  const typeLabel = task.type === "filming" ? "촬영" : task.type === "editing" ? "편집" : task.type === "shorts" ? "쇼츠" : task.type === "cardnews" ? "카드뉴스" : "기타";
                  const ddayText = !hasDeadline ? "미정"
                    : isOverdue ? `D+${Math.abs(daysLeft!)}`
                    : daysLeft === 0 ? "D-Day" : `D-${daysLeft}`;

                  return (
                    <div key={task.id} className="w-full flex items-center gap-3 p-3 rounded-xl text-left">
                      <button onClick={() => toggleTaskComplete(task.id)}
                        className="w-5 h-5 shrink-0 rounded-full border-2 border-toss-gray-300 hover:border-toss-blue transition flex items-center justify-center" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            task.type === "filming" ? "bg-blue-50 text-toss-blue" : "bg-green-50 text-toss-green"
                          }`}>{typeLabel}</span>
                          <p className="text-[14px] font-semibold text-toss-gray-900 truncate">{task.title}</p>
                        </div>
                        <p className="text-[12px] text-toss-gray-400 mt-0.5 truncate">
                          업로드 {hasDeadline ? new Date(task.deadlineDate!).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "일정 미정"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`text-[14px] font-extrabold ${
                          !hasDeadline ? "text-toss-gray-400" : isOverdue ? "text-toss-gray-400 line-through" : isUrgent ? "text-red-500" : "text-toss-blue"
                        }`}>{ddayText}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-[14px] text-toss-gray-500">{taskRequests.length > 0 ? "모든 작업을 완료했습니다" : "요청된 작업이 없습니다"}</p>
              {taskRequests.length === 0 && <p className="text-[12px] text-toss-gray-400 mt-1">관리자가 작업을 요청하면 여기에 표시됩니다</p>}
            </div>
          );
          })()}
        </div>

        {/* 관리자 Quick actions */}
        {quickActions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
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
        )}

        {/* 정산 + 최근 프로젝트 — PC에서 2열 */}
        <div className="md:grid md:grid-cols-2 md:gap-5">
        {/* 내 정산 현황 card */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm mb-5 md:mb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold text-toss-gray-900">내 정산 현황</h2>
            <button
              onClick={() => setShowSettleDetail(true)}
              className="text-[13px] text-toss-blue font-semibold hover:underline"
            >
              자세히 보기
            </button>
          </div>
          {settlementLoading ? (
            <div className="py-4 text-center">
              <p className="text-[14px] text-toss-gray-400">불러오는 중...</p>
            </div>
          ) : settlementDashboard && (settlementDashboard.thisMonth.total > 0 || settlementDashboard.lastMonth.total > 0) ? (
            <div className="space-y-5">
              {/* 이번달 / 저번달 비교 */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <p className="text-[12px] text-toss-gray-400 mb-1">이번 달</p>
                  <p className="text-[24px] font-bold text-toss-gray-900 leading-tight">
                    {settlementDashboard.thisMonth.total.toLocaleString()}<span className="text-[16px]">원</span>
                  </p>
                  {/* 상태별 뱃지 */}
                  {settlementDashboard.thisMonth.total > 0 && (() => {
                    const st = settlementDashboard.thisMonth.statusTotals;
                    const done = st["정산완료"] ?? 0;
                    const pending = (st["임시저장"] ?? 0) + (st["제출됨"] ?? 0);
                    return (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {done > 0 && (
                          <span className="px-2 py-0.5 bg-green-50 text-toss-green text-[11px] font-bold rounded-lg">
                            정산 완료 {done.toLocaleString()}원
                          </span>
                        )}
                        {pending > 0 && (
                          <span className="px-2 py-0.5 bg-blue-50 text-toss-blue text-[11px] font-bold rounded-lg">
                            정산 예정 {pending.toLocaleString()}원
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {settlementDashboard.lastMonth.total > 0 && settlementDashboard.thisMonth.total > 0 && (() => {
                  const diff = settlementDashboard.thisMonth.total - settlementDashboard.lastMonth.total;
                  const pct = Math.round((diff / settlementDashboard.lastMonth.total) * 100);
                  return (
                    <div className="text-right shrink-0">
                      <p className="text-[12px] text-toss-gray-400 mb-1">전월 대비</p>
                      <p className={`text-[15px] font-bold ${diff >= 0 ? "text-toss-blue" : "text-toss-red"}`}>
                        {diff >= 0 ? "▲" : "▼"} {Math.abs(pct)}%
                      </p>
                    </div>
                  );
                })()}
              </div>

              {settlementDashboard.lastMonth.total > 0 && (
                <div>
                  <p className="text-[12px] text-toss-gray-400 mb-1">지난 달</p>
                  <p className="text-[16px] font-semibold text-toss-gray-500">
                    {settlementDashboard.lastMonth.total.toLocaleString()}원
                  </p>
                </div>
              )}

              {/* 카테고리별 비율 */}
              {(() => {
                const hasThis = Object.keys(settlementDashboard.thisMonth.byRole).length > 0;
                const hasLast = Object.keys(settlementDashboard.lastMonth.byRole).length > 0;
                if (!hasThis && !hasLast) return null;
                const roles = hasThis ? settlementDashboard.thisMonth.byRole : settlementDashboard.lastMonth.byRole;
                const total = Object.values(roles).reduce((a, b) => a + b, 0);
                const roleColors: Record<string, string> = {
                  "촬영비": "bg-toss-blue",
                  "편집비": "bg-toss-green",
                  "숏폼": "bg-toss-orange",
                  "카드뉴스": "bg-pink-400",
                };
                const roleLabels: Record<string, string> = {
                  "촬영비": "영상 촬영",
                  "편집비": "롱폼 편집",
                  "숏폼": "쇼츠·릴스",
                  "카드뉴스": "카드뉴스",
                };
                const sorted = Object.entries(roles).sort(([,a], [,b]) => b - a);
                return (
                  <div className="space-y-2.5">
                    <p className="text-[12px] font-semibold text-toss-gray-400">{hasThis ? "이번 달" : "지난 달"} 카테고리별 수입</p>
                    {/* 통합 바 */}
                    <div className="flex h-3 rounded-full overflow-hidden bg-toss-gray-100">
                      {sorted.map(([role, amount]) => (
                        <div key={role} className={`${roleColors[role] || "bg-toss-gray-300"} transition-all`}
                          style={{ width: `${(amount / total) * 100}%` }} />
                      ))}
                    </div>
                    {/* 범례 */}
                    <div className="grid grid-cols-2 gap-2">
                      {sorted.map(([role, amount]) => (
                        <div key={role} className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${roleColors[role] || "bg-toss-gray-300"}`} />
                          <span className="text-[12px] text-toss-gray-500 truncate">{roleLabels[role] || role}</span>
                          <span className="text-[12px] font-bold text-toss-gray-700 ml-auto">{amount.toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
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
              onClick={() => setShowProjectsSheet(true)}
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
        </div>

        {/* 공지사항 card */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm mt-5">
          <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3">공지사항</h2>
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <span className="text-[18px] shrink-0 mt-0.5">📢</span>
                  <div className="flex-1">
                    <p className="text-[14px] text-toss-gray-900">{a.title}</p>
                    {a.message && a.message !== a.title && (
                      <p className="text-[13px] text-toss-gray-500 mt-0.5">{a.message}</p>
                    )}
                    <p className="text-[12px] text-toss-gray-400 mt-1">
                      {new Date(a.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-toss-gray-400 py-2">공지사항이 없습니다</p>
          )}
        </div>

      </div>

      {/* 요청된 작업 바텀시트 */}
      {showTasksSheet && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => setShowTasksSheet(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-xl h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom,0px)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h3 className="text-[18px] font-bold text-toss-gray-900">요청된 작업</h3>
              <button onClick={() => setShowTasksSheet(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-gray-400 text-[20px]">✕</button>
            </div>
            <div className="flex items-center justify-between px-6 pb-3 shrink-0">
              <div className="flex gap-2">
                {([["all", "전체"], ["filming", "촬영"], ["editing", "편집"], ["shorts", "쇼츠"], ["cardnews", "카드뉴스"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setTaskFilter(k)}
                    className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                      taskFilter === k ? "bg-toss-gray-900 text-white" : "bg-toss-gray-100 text-toss-gray-500"
                    }`}>{l}</button>
                ))}
              </div>
              <div className="flex bg-toss-gray-100 rounded-lg p-0.5">
                <button onClick={() => setTaskView("list")}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${taskView === "list" ? "bg-white text-toss-gray-900 shadow-sm" : "text-toss-gray-400"}`}>목록</button>
                <button onClick={() => setTaskView("calendar")}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${taskView === "calendar" ? "bg-white text-toss-gray-900 shadow-sm" : "text-toss-gray-400"}`}>달력</button>
              </div>
            </div>
            <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0">
              {taskView === "list" ? (
                taskRequests.length > 0 ? (
                <div className="space-y-1">
                  {[...taskRequests]
                    .filter(t => taskFilter === "all" || t.type === taskFilter)
                    .sort((a, b) => {
                      const ac = completedTasks.has(a.id) ? 1 : 0;
                      const bc = completedTasks.has(b.id) ? 1 : 0;
                      if (ac !== bc) return ac - bc;
                      if (!a.deadlineDate && !b.deadlineDate) return 0;
                      if (!a.deadlineDate) return 1;
                      if (!b.deadlineDate) return -1;
                      return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
                    })
                    .map((task) => {
                      const isDone = completedTasks.has(task.id);
                      const hasDeadline = !!task.deadlineDate;
                      const daysLeft = hasDeadline ? (() => { const t = new Date(task.deadlineDate!); const n = new Date(); return Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86400000); })() : null;
                      const isOverdue = hasDeadline && daysLeft! < 0;
                      const isUrgent = hasDeadline && daysLeft! >= 0 && daysLeft! <= 2;
                      const typeLabel = task.type === "filming" ? "촬영" : task.type === "editing" ? "편집" : "마감";
                      const ddayText = isDone ? "완료" : !hasDeadline ? "미정"
                        : isOverdue ? `D+${Math.abs(daysLeft!)}`
                        : daysLeft === 0 ? "D-Day" : `D-${daysLeft}`;
                      return (
                        <div key={task.id} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left ${isDone ? "opacity-50" : ""}`}>
                          <button onClick={() => toggleTaskComplete(task.id)}
                            className={`w-5 h-5 shrink-0 rounded-full border-2 transition flex items-center justify-center ${
                              isDone ? "border-toss-green bg-toss-green" : "border-toss-gray-300 hover:border-toss-blue"
                            }`}>
                            {isDone && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                task.type === "filming" ? "bg-blue-50 text-toss-blue" : task.type === "editing" ? "bg-green-50 text-toss-green" : task.type === "shorts" ? "bg-amber-50 text-amber-600" : "bg-pink-50 text-pink-600"
                              }`}>{typeLabel}</span>
                              <p className={`text-[14px] font-semibold truncate ${isDone ? "text-toss-gray-400 line-through" : "text-toss-gray-900"}`}>{task.title}</p>
                            </div>
                            <p className="text-[12px] text-toss-gray-400 mt-0.5 truncate">
                              업로드 {hasDeadline ? new Date(task.deadlineDate!).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "일정 미정"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className={`text-[14px] font-extrabold ${
                              isDone ? "text-toss-green" : !hasDeadline ? "text-toss-gray-400" : isOverdue ? "text-toss-gray-400 line-through" : isUrgent ? "text-red-500" : "text-toss-blue"
                            }`}>{ddayText}</span>
                            <p className="text-[11px] text-toss-gray-400 mt-0.5">{typeLabel}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-toss-gray-400 text-[14px]">요청된 작업이 없습니다</p>
                </div>
              )) : (() => {
                // 달력 뷰
                const cy = taskCalMonth.year, cm = taskCalMonth.month;
                const daysInMonth = new Date(cy, cm, 0).getDate();
                const firstDay = new Date(cy, cm - 1, 1).getDay();
                const calDays: (number | null)[] = [];
                for (let i = 0; i < firstDay; i++) calDays.push(null);
                for (let d = 1; d <= daysInMonth; d++) calDays.push(d);
                const today = new Date();
                const isToday = (d: number) => today.getFullYear() === cy && today.getMonth() + 1 === cm && today.getDate() === d;
                const filtered = taskRequests.filter(t => taskFilter === "all" || t.type === taskFilter);
                const getTasksForDay = (d: number) => {
                  const ds = `${cy}-${String(cm).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                  return filtered.filter(t => t.deadlineDate === ds);
                };

                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => setTaskCalMonth(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 })}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 text-toss-blue font-bold text-[16px]">‹</button>
                      <span className="text-[15px] font-bold text-toss-gray-900">{cy}년 {cm}월</span>
                      <button onClick={() => setTaskCalMonth(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 })}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 text-toss-blue font-bold text-[16px]">›</button>
                    </div>
                    <div className="grid grid-cols-7 mb-1">
                      {["일","월","화","수","목","금","토"].map((l, i) => (
                        <div key={l} className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? "text-toss-red" : i === 6 ? "text-toss-blue" : "text-toss-gray-400"}`}>{l}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {calDays.map((day, idx) => {
                        if (day === null) return <div key={idx} />;
                        const tasks = getTasksForDay(day);
                        const hasDone = tasks.some(t => completedTasks.has(t.id));
                        const hasPending = tasks.some(t => !completedTasks.has(t.id));
                        return (
                          <div key={idx} className={`text-center py-1.5 relative ${isToday(day) ? "font-bold" : ""}`}>
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] ${
                              isToday(day) ? "bg-toss-blue text-white" : "text-toss-gray-700"
                            }`}>{day}</span>
                            {(hasPending || hasDone) && (
                              <div className="flex justify-center gap-0.5 mt-0.5">
                                {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-toss-blue" />}
                                {hasDone && <span className="w-1.5 h-1.5 rounded-full bg-toss-green" />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* 이번 달 작업 목록 */}
                    <div className="mt-4 space-y-1.5">
                      {filtered.filter(t => t.deadlineDate?.startsWith(`${cy}-${String(cm).padStart(2,"0")}`)).length > 0 ? (
                        filtered.filter(t => t.deadlineDate?.startsWith(`${cy}-${String(cm).padStart(2,"0")}`))
                          .sort((a, b) => new Date(a.deadlineDate!).getTime() - new Date(b.deadlineDate!).getTime())
                          .map(task => {
                            const isDone = completedTasks.has(task.id);
                            const typeLabel = task.type === "filming" ? "🎬" : "✂️";
                            return (
                              <div key={task.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg ${isDone ? "opacity-50" : "bg-toss-gray-50"}`}>
                                <button onClick={() => toggleTaskComplete(task.id)}
                                  className={`w-4.5 h-4.5 shrink-0 rounded-full border-2 transition flex items-center justify-center ${
                                    isDone ? "border-toss-green bg-toss-green" : "border-toss-gray-300"
                                  }`} style={{ width: 18, height: 18 }}>
                                  {isDone && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                </button>
                                <span className="text-[14px] shrink-0">{typeLabel}</span>
                                <p className={`text-[13px] flex-1 truncate ${isDone ? "text-toss-gray-400 line-through" : "text-toss-gray-900 font-semibold"}`}>{task.title}</p>
                                <span className="text-[12px] text-toss-gray-400 shrink-0">{new Date(task.deadlineDate!).getDate()}일</span>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-center text-[13px] text-toss-gray-400 py-4">이 달에 예정된 작업이 없습니다</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 최근 프로젝트 바텀시트 */}
      {showProjectsSheet && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => setShowProjectsSheet(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-xl h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom,0px)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h3 className="text-[18px] font-bold text-toss-gray-900">최근 프로젝트</h3>
              <button onClick={() => setShowProjectsSheet(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-gray-400 text-[20px]">✕</button>
            </div>
            <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0">
              {recentProjects.length > 0 ? (
                <div className="space-y-1">
                  {recentProjects.map((project) => (
                    <button
                      key={`sheet-${project.href}-${project.id}`}
                      onClick={() => { setShowProjectsSheet(false); router.push(project.href); }}
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
                <div className="text-center py-12">
                  <p className="text-toss-gray-400 text-[14px]">아직 프로젝트가 없습니다</p>
                </div>
              )}
              <button onClick={() => { setShowProjectsSheet(false); router.push("/tools"); }}
                className="w-full py-3.5 mt-4 bg-toss-gray-100 text-toss-gray-700 font-semibold rounded-xl hover:bg-toss-gray-200 transition text-[14px]">
                프로젝트 페이지로 가기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 정산 상세 바텀시트 */}
      {showSettleDetail && createPortal((() => {
        const prefix = `${detailMonth.year}-${String(detailMonth.month).padStart(2, "0")}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monthItems = allSettlements.filter((s: any) => s.settlement_month?.startsWith(prefix) && s.status !== "");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const total = monthItems.reduce((sum: number, s: any) => sum + (s.final_amount || 0), 0);
        const byRole: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monthItems.forEach((s: any) => { byRole[s.role] = (byRole[s.role] || 0) + (s.final_amount || 0); });
        const byStatus: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monthItems.forEach((s: any) => { byStatus[s.status] = (byStatus[s.status] || 0) + (s.final_amount || 0); });
        const roleColors: Record<string, string> = { "촬영비": "bg-toss-blue", "편집비": "bg-toss-green", "숏폼": "bg-toss-orange", "카드뉴스": "bg-pink-400" };
        const roleLabels: Record<string, string> = { "촬영비": "영상 촬영", "편집비": "롱폼 편집", "숏폼": "쇼츠·릴스", "카드뉴스": "카드뉴스" };
        const prevMo = () => { setDetailMonth(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 }); setExpandedSettleId(null); };
        const nextMo = () => { setDetailMonth(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 }); setExpandedSettleId(null); };
        const sortedRoles = Object.entries(byRole).sort(([,a], [,b]) => b - a);
        const done = byStatus["정산완료"] ?? 0;
        const pending = (byStatus["임시저장"] ?? 0) + (byStatus["제출됨"] ?? 0);

        return (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => { setShowSettleDetail(false); setExpandedSettleId(null); setShowYearMonthPicker(false); setSettleDetailMounted(false); }}>
            <div className={`bg-white w-full max-w-lg rounded-t-3xl shadow-xl h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom,0px)] ${!settleDetailMounted ? "animate-slide-up" : ""}`}
              ref={(el) => { if (el && !settleDetailMounted) setTimeout(() => setSettleDetailMounted(true), 300); }}
              onClick={(e) => e.stopPropagation()}>
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                <h3 className="text-[18px] font-bold text-toss-gray-900">내 정산 현황</h3>
                <button onClick={() => { setShowSettleDetail(false); setExpandedSettleId(null); setShowYearMonthPicker(false); setSettleDetailMounted(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-gray-400 text-[20px]">✕</button>
              </div>

              {/* 월 네비 */}
              <div className="flex items-center justify-between px-6 mb-4 shrink-0">
                <button onClick={prevMo} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 text-toss-blue font-bold text-[18px]">‹</button>
                <button onClick={() => { setPickerDetailYear(detailMonth.year); setPickerDetailMonth(detailMonth.month); setShowYearMonthPicker(true); }}
                  className="text-[17px] font-bold text-toss-blue flex items-center gap-1">
                  {detailMonth.year}년 {detailMonth.month}월
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button onClick={nextMo} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 text-toss-blue font-bold text-[18px]">›</button>
              </div>

              {/* 콘텐츠 */}
              <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0 space-y-5">
                {/* 총 수입 */}
                <div className="text-center py-4 bg-toss-gray-50 rounded-2xl">
                  <p className="text-[13px] text-toss-gray-500 mb-1">총 수입</p>
                  <p className="text-[28px] font-bold text-toss-gray-900">{total.toLocaleString()}<span className="text-[18px]">원</span></p>
                  {total > 0 && (
                    <div className="flex justify-center gap-2 mt-2">
                      {done > 0 && <span className="px-2 py-0.5 bg-green-50 text-toss-green text-[11px] font-bold rounded-lg">정산 완료 {done.toLocaleString()}원</span>}
                      {pending > 0 && <span className="px-2 py-0.5 bg-blue-50 text-toss-blue text-[11px] font-bold rounded-lg">정산 예정 {pending.toLocaleString()}원</span>}
                    </div>
                  )}
                </div>

                {/* 카테고리별 */}
                {sortedRoles.length > 0 && (
                  <div>
                    <p className="text-[13px] font-semibold text-toss-gray-500 mb-3">카테고리별 수입</p>
                    <div className="flex h-3 rounded-full overflow-hidden bg-toss-gray-100 mb-3">
                      {sortedRoles.map(([role, amount]) => (
                        <div key={role} className={`${roleColors[role] || "bg-toss-gray-300"}`}
                          style={{ width: `${(amount / total) * 100}%` }} />
                      ))}
                    </div>
                    <div className="space-y-2.5">
                      {sortedRoles.map(([role, amount]) => (
                        <div key={role} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${roleColors[role] || "bg-toss-gray-300"}`} />
                            <span className="text-[14px] text-toss-gray-700">{roleLabels[role] || role}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[14px] font-bold text-toss-gray-900">{amount.toLocaleString()}원</span>
                            <span className="text-[12px] text-toss-gray-400 ml-1.5">{Math.round((amount / total) * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 정산 내역 리스트 */}
                {monthItems.length > 0 && (
                  <div>
                    <p className="text-[13px] font-semibold text-toss-gray-500 mb-3">정산 내역</p>
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {monthItems.map((s: any) => {
                        const isExpanded = expandedSettleId === s.id;
                        return (
                          <div key={s.id} className="bg-toss-gray-50 rounded-xl overflow-hidden">
                            <button onClick={() => setExpandedSettleId(isExpanded ? null : s.id)}
                              className="w-full p-3.5 flex items-center justify-between text-left">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px] font-bold text-toss-gray-900">{roleLabels[s.role] || s.role}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    s.status === "정산완료" ? "bg-green-50 text-toss-green"
                                    : s.status === "임시저장" ? "bg-amber-50 text-amber-600"
                                    : "bg-blue-50 text-toss-blue"
                                  }`}>{s.status === "임시저장" ? "작성 중" : s.status === "정산완료" ? "정산 완료" : "정산 예정"}</span>
                                </div>
                                <p className="text-[12px] text-toss-gray-400 mt-0.5">
                                  {new Date(s.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 제출
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[15px] font-bold text-toss-gray-900">{(s.final_amount || 0).toLocaleString()}원</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                  className={`text-toss-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                                  <path d="M6 9l6 6 6-6" />
                                </svg>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="px-3.5 pb-3.5 space-y-2">
                                <div className="bg-white rounded-lg p-3 space-y-1.5 text-[13px]">
                                  <div className="flex justify-between">
                                    <span className="text-toss-gray-500">{roleLabels[s.role] || s.role}</span>
                                    <span className="font-semibold text-toss-gray-900">{((s.total_amount || 0) - (s.total_expense || 0)).toLocaleString()}원</span>
                                  </div>
                                  {(s.total_expense || 0) > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-toss-gray-500">경비</span>
                                      <span className="font-semibold text-toss-gray-900">{s.total_expense.toLocaleString()}원</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-toss-gray-500">총액</span>
                                    <span className="font-semibold text-toss-gray-900">{(s.total_amount || 0).toLocaleString()}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-toss-gray-500">{s.contract_type === "프리랜서" ? "원천징수(3.3%)" : "부가세(10%)"}</span>
                                    <span className={`font-semibold ${s.contract_type === "프리랜서" ? "text-toss-red" : "text-toss-blue"}`}>
                                      {s.contract_type === "프리랜서" ? "-" : "+"}{(s.tax || 0).toLocaleString()}원
                                    </span>
                                  </div>
                                  <div className="border-t border-toss-gray-200 pt-1.5 flex justify-between">
                                    <span className="font-bold text-toss-gray-900">{s.contract_type === "프리랜서" ? "실수령액" : "총 청구액"}</span>
                                    <span className="font-bold text-toss-blue">{(s.final_amount || 0).toLocaleString()}원</span>
                                  </div>
                                </div>
                                {/* 상세 항목 */}
                                {s.items?.length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-bold text-toss-gray-400 px-1">상세 항목</p>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {s.items.map((item: any, idx: number) => (
                                      <div key={idx} className="bg-white rounded-lg px-3 py-2 flex justify-between text-[12px]">
                                        <span className="text-toss-gray-700">{item.performer}</span>
                                        <span className="font-semibold text-toss-gray-900">{(item.amount || 0).toLocaleString()}원</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {monthItems.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-toss-gray-400 text-[14px]">이 달의 정산 내역이 없습니다</p>
                  </div>
                )}

                {/* 정산서 작성 바로가기 */}
                <button onClick={() => { setShowSettleDetail(false); setExpandedSettleId(null); router.push("/settlement"); }}
                  className="w-full py-3.5 bg-toss-gray-100 text-toss-gray-700 font-semibold rounded-xl hover:bg-toss-gray-200 transition text-[14px]">
                  정산서 작성하러 가기
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* 정산 현황 년/월 선택 바텀시트 */}
      {showYearMonthPicker && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-end justify-center" onClick={() => setShowYearMonthPicker(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-xl animate-slide-up pb-[env(safe-area-inset-bottom,0px)]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-[18px] font-bold text-toss-gray-900">년/월 선택</h3>
              <button onClick={() => setShowYearMonthPicker(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-gray-400 text-[20px]">✕</button>
            </div>
            <div className="px-4 py-4">
              <div className="relative h-[220px]">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-toss-gray-100 rounded-xl pointer-events-none" style={{ height: DETAIL_ITEM_H }} />
                <div className="flex h-full">
                  <div className="flex-1 h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
                    style={{ paddingTop: `${(220 - DETAIL_ITEM_H) / 2}px`, paddingBottom: `${(220 - DETAIL_ITEM_H) / 2}px` }}
                    onScroll={(e) => {
                      const el = e.target as HTMLDivElement;
                      const idx = Math.round(el.scrollTop / DETAIL_ITEM_H);
                      if (idx >= 0 && idx < DETAIL_YEARS.length) {
                        setPickerDetailYear(prev => { if (prev !== DETAIL_YEARS[idx]) try { navigator.vibrate?.(1); } catch {} return DETAIL_YEARS[idx]; });
                      }
                    }}
                    ref={(el) => { if (el) { const idx = DETAIL_YEARS.indexOf(pickerDetailYear); if (idx >= 0) el.scrollTop = idx * DETAIL_ITEM_H; } }}>
                    {DETAIL_YEARS.map((y) => (
                      <div key={y} style={{ height: DETAIL_ITEM_H, justifyContent: "flex-end", paddingRight: 12 }}
                        className={`flex items-center snap-center transition-all ${
                          y === pickerDetailYear ? "text-toss-gray-900 font-bold text-[20px]" : "text-toss-gray-400 text-[16px]"
                        }`}>{y}년</div>
                    ))}
                  </div>
                  <div className="flex-1 h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
                    style={{ paddingTop: `${(220 - DETAIL_ITEM_H) / 2}px`, paddingBottom: `${(220 - DETAIL_ITEM_H) / 2}px` }}
                    onScroll={(e) => {
                      const el = e.target as HTMLDivElement;
                      const idx = Math.round(el.scrollTop / DETAIL_ITEM_H);
                      if (idx >= 0 && idx < DETAIL_MONTHS.length) {
                        setPickerDetailMonth(prev => { if (prev !== DETAIL_MONTHS[idx]) try { navigator.vibrate?.(1); } catch {} return DETAIL_MONTHS[idx]; });
                      }
                    }}
                    ref={(el) => { if (el) { const idx = pickerDetailMonth - 1; if (idx >= 0) el.scrollTop = idx * DETAIL_ITEM_H; } }}>
                    {DETAIL_MONTHS.map((m) => (
                      <div key={m} style={{ height: DETAIL_ITEM_H, justifyContent: "flex-start", paddingLeft: 12 }}
                        className={`flex items-center snap-center transition-all ${
                          m === pickerDetailMonth ? "text-toss-gray-900 font-bold text-[20px]" : "text-toss-gray-400 text-[16px]"
                        }`}>{m}월</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => { setDetailMonth({ year: pickerDetailYear, month: pickerDetailMonth }); setShowYearMonthPicker(false); setExpandedSettleId(null); }}
                className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl text-[16px] active:scale-[0.98] transition">
                {pickerDetailYear}년 {pickerDetailMonth}월 선택
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
