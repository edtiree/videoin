"use client";

import { useEffect, useState, useRef } from "react";
import ConfirmModal from "@/components/ConfirmModal";

interface WorkerData {
  id: string; name: string; phone: string; role: string; contract_type: string;
  bank_name: string | null; bank_account: string | null; account_holder: string | null;
  business_registration_url: string | null; approved: boolean; created_at: string;
  categories: string[] | null;
}

const ALL_CATEGORIES = [
  { key: "촬영비", label: "촬영비" },
  { key: "숏폼", label: "숏폼" },
  { key: "카드뉴스", label: "카드뉴스" },
  { key: "편집비", label: "편집비" },
];

interface DashboardData {
  summary: {
    totalAmount: number; totalExpense: number; totalTax: number;
    totalFinal: number; totalCount: number;
    statusCounts: Record<string, number>;
  };
  workerRanking: {
    name: string; role: string; contractType: string;
    totalAmount: number; totalFinal: number; count: number;
  }[];
  recentSettlements: {
    id: string; workerName: string; role: string; contractType: string;
    settlementMonth: string; totalAmount: number; finalAmount: number;
    status: string; createdAt: string;
  }[];
}

const ADMIN_PIN = "0123";
type Tab = "dashboard" | "settlements" | "workers";

interface SettlementData {
  id: string; worker_id: string; worker_name: string; role: string;
  contract_type: string; settlement_month: string; total_amount: number;
  total_expense: number; tax: number; final_amount: number; status: string;
  created_at: string;
  items: { performer: string; filmingDate?: string; expense?: number;
    receiptUrls?: string[]; videoLink?: string; videoDuration?: number; amount: number; }[];
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [settlements, setSettlements] = useState<SettlementData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteWorkerTarget, setDeleteWorkerTarget] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [loginError, setLoginError] = useState("");

  const handleAuth = (pinVal?: string) => {
    const p = pinVal || pin;
    if (p === ADMIN_PIN) { setAuthed(true); fetchAll(); }
    else { setLoginError("PIN이 일치하지 않습니다."); setPin(""); }
  };

  const fetchAll = () => { fetchWorkers(); fetchDashboard(); fetchSettlements(); };

  const fetchWorkers = async () => {
    const res = await fetch("/api/admin/workers");
    if (res.ok) setWorkers(await res.json());
  };

  const fetchDashboard = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/dashboard?month=${selectedMonth}`);
    if (res.ok) setDashboard(await res.json());
    setLoading(false);
  };

  const fetchSettlements = async () => {
    const res = await fetch(`/api/admin/settlements?month=${selectedMonth}`);
    if (res.ok) setSettlements(await res.json());
  };

  const handleStatusChange = async (settlementId: string, status: string) => {
    const res = await fetch("/api/admin/settlement-status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settlementId, status }),
    });
    if (res.ok) {
      setSettlements((prev) => prev.map((s) => s.id === settlementId ? { ...s, status } : s));
      fetchDashboard();
    }
  };

  useEffect(() => {
    if (authed) { fetchDashboard(); fetchSettlements(); }
  }, [selectedMonth]);

  // 탭 포커스 시 새로고침
  useEffect(() => {
    if (!authed) return;
    const onFocus = () => { fetchWorkers(); fetchDashboard(); fetchSettlements(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [authed]);

  const handleCategoryToggle = async (workerId: string, category: string) => {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;
    const current = worker.categories || ["촬영비", "숏폼", "카드뉴스", "편집비"];
    const updated = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    const res = await fetch("/api/admin/workers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId, categories: updated }),
    });
    if (res.ok) setWorkers((prev) => prev.map((w) => w.id === workerId ? { ...w, categories: updated } : w));
  };

  const handleApprove = async (workerId: string, approved: boolean) => {
    const res = await fetch("/api/admin/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId, approved }),
    });
    if (res.ok) setWorkers((prev) => prev.map((w) => w.id === workerId ? { ...w, approved } : w));
  };

  const handleReject = (workerId: string) => {
    setDeleteWorkerTarget(workerId);
  };

  const confirmDeleteWorker = async () => {
    if (!deleteWorkerTarget) return;
    const res = await fetch("/api/admin/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: deleteWorkerTarget }),
    });
    if (res.ok) setWorkers((prev) => prev.filter((w) => w.id !== deleteWorkerTarget));
    setDeleteWorkerTarget(null);
  };

  const formatPhone = (p: string) => {
    if (!p) return "";
    if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
    return p;
  };

  const formatDate = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}.${dt.getMonth() + 1}.${dt.getDate()}`; };
  const formatMonth = (d: string) => { const dt = new Date(d); return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`; };

  // ─── 로그인 ───
  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        onClick={() => pinRef.current?.focus()}>
        <div className="w-full max-w-sm text-center">
          <h2 className="text-[22px] font-bold text-toss-gray-900 mb-2">관리자 PIN 입력</h2>
          <p className="text-toss-gray-500 text-[15px] mb-10">4자리 비밀번호를 입력하세요</p>

          {loginError && (
            <div className="mb-5 px-4 py-3 bg-red-50 text-toss-red rounded-2xl text-[14px]">
              {loginError}
            </div>
          )}

          <div className="relative flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}
                className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-xl transition-all duration-200 ${
                  pin.length > i
                    ? "bg-toss-blue text-white scale-105"
                    : pin.length === i
                    ? "bg-white border-2 border-toss-blue"
                    : "bg-toss-gray-100 border border-toss-gray-200"
                }`}>
                {pin[i] ? "●" : ""}
              </div>
            ))}
            <input ref={pinRef} type="tel" value={pin} autoFocus
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(val);
                if (val.length === 4) setTimeout(() => handleAuth(val), 150);
              }}
              className="absolute inset-0 opacity-0 w-full h-full"
              inputMode="numeric" />
          </div>
        </div>
      </div>
    );
  }

  const pendingWorkers = workers.filter((w) => !w.approved);
  const approvedWorkers = workers.filter((w) => w.approved);

  return (
    <div className="min-h-screen pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-toss-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-toss-gray-900">관리자</h1>
          <button
            onClick={() => {
              const url = `${window.location.origin}`;
              navigator.clipboard.writeText(url);
              setAlertMsg("가입 링크가 복사되었습니다!\n직원에게 공유해주세요.");
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-toss-blue text-white rounded-xl text-[13px] font-semibold hover:bg-toss-blue-hover active:scale-[0.98] transition-all"
          >
            🔗 가입 링크 복사
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 mt-6">
        {/* 탭 */}
        <div className="flex bg-toss-gray-100 rounded-2xl p-1 mb-6">
          {[
            { key: "dashboard" as Tab, label: "대시보드" },
            { key: "settlements" as Tab, label: `정산서${settlements.filter(s => s.status === "제출됨").length > 0 ? ` (${settlements.filter(s => s.status === "제출됨").length})` : ""}` },
            { key: "workers" as Tab, label: `직원${pendingWorkers.length > 0 ? ` (${pendingWorkers.length})` : ""}` },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-[14px] font-semibold rounded-xl transition-all ${
                tab === t.key ? "bg-white text-toss-gray-900 shadow-sm" : "text-toss-gray-500"
              }`}>{t.label}</button>
          ))}
        </div>

        {tab === "dashboard" ? (
          <DashboardView
            dashboard={dashboard}
            loading={loading}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            formatMonth={formatMonth}
            formatDate={formatDate}
          />
        ) : tab === "settlements" ? (
          <SettlementsView
            settlements={settlements}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onStatusChange={handleStatusChange}
            formatMonth={formatMonth}
            formatDate={formatDate}
          />
        ) : (
          <WorkersView
            pendingWorkers={pendingWorkers}
            approvedWorkers={approvedWorkers}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            handleApprove={handleApprove}
            handleReject={handleReject}
            handleCategoryToggle={handleCategoryToggle}
            formatPhone={formatPhone}
            formatDate={formatDate}
          />
        )}
      </div>

      {alertMsg && (
        <ConfirmModal title="알림" message={alertMsg} confirmText="확인" onConfirm={() => setAlertMsg(null)} />
      )}

      {deleteWorkerTarget && (
        <ConfirmModal
          title="직원을 삭제할까요?"
          message="관련 정산서도 함께 삭제됩니다."
          confirmText="삭제"
          cancelText="취소"
          confirmColor="red"
          onConfirm={confirmDeleteWorker}
          onCancel={() => setDeleteWorkerTarget(null)}
        />
      )}
    </div>
  );
}

// ─── 정산서 관리 ───
function SettlementsView({ settlements, selectedMonth, onMonthChange, onStatusChange, formatMonth, formatDate }: {
  settlements: SettlementData[]; selectedMonth: string;
  onMonthChange: (m: string) => void;
  onStatusChange: (id: string, status: string) => void;
  formatMonth: (d: string) => string; formatDate: (d: string) => string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("전체");

  const [y, m] = selectedMonth.split("-").map(Number);
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  const filtered = filter === "전체" ? settlements : settlements.filter((s) => s.status === filter);

  const statusStyle: Record<string, string> = {
    "제출됨": "bg-amber-50 text-amber-600",
    "확인됨": "bg-blue-50 text-toss-blue",
    "정산완료": "bg-green-50 text-toss-green",
  };

  return (
    <div className="space-y-5">
      {/* 월 선택 */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <button onClick={() => onMonthChange(prevMonth)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-toss-gray-100 transition text-toss-gray-600">←</button>
        <span className="text-[18px] font-bold text-toss-gray-900 min-w-[120px] text-center">{y}년 {m}월</span>
        <button onClick={() => onMonthChange(nextMonth)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-toss-gray-100 transition text-toss-gray-600">→</button>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {["전체", "제출됨", "정산완료"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${
              filter === f ? "bg-toss-gray-900 text-white" : "bg-toss-gray-100 text-toss-gray-500 hover:bg-toss-gray-200"
            }`}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-toss-gray-400 text-[14px]">해당 정산서가 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isExpanded = expandedId === s.id;
            const isFreelancer = s.contract_type === "프리랜서";
            return (
              <div key={s.id} className="bg-white border border-toss-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-toss-gray-50 transition">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-bold text-toss-gray-900">{s.worker_name}</span>
                      <span className="px-1.5 py-0.5 bg-toss-gray-100 text-toss-gray-600 rounded text-[11px] font-bold">
                        {s.role === "촬영비" ? "촬영비" : s.role === "편집비" ? "편집비" : s.role}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${statusStyle[s.status] || ""}`}>
                        {s.status}
                      </span>
                    </div>
                    <span className="text-[12px] text-toss-gray-400">{formatMonth(s.settlement_month)}</span>
                  </div>
                  <span className="text-[16px] font-bold text-toss-blue">{s.final_amount.toLocaleString()}원</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-toss-gray-100 px-5 py-5 bg-toss-gray-50 space-y-4">
                    <div className="space-y-2.5 text-[14px]">
                      <SRow label={s.role === "촬영비" ? "촬영비" : s.role === "편집비" ? "편집비" : s.role} value={`${(s.total_amount - s.total_expense).toLocaleString()}원`} />
                      {s.total_expense > 0 && <SRow label="경비" value={`${s.total_expense.toLocaleString()}원`} />}
                      <SRow label="총액" value={`${s.total_amount.toLocaleString()}원`} />
                      <SRow label={isFreelancer ? "원천징수(3.3%)" : "부가세(10%)"}
                        value={`${isFreelancer ? "-" : "+"}${s.tax.toLocaleString()}원`}
                        color={isFreelancer ? "text-toss-red" : "text-toss-blue"} />
                      <div className="border-t border-toss-gray-200 pt-2.5 flex justify-between">
                        <span className="font-bold text-toss-gray-900">{isFreelancer ? "실수령액" : "총 청구액"}</span>
                        <span className="font-bold text-toss-blue text-[16px]">{s.final_amount.toLocaleString()}원</span>
                      </div>
                    </div>

                    {/* 상세 항목 */}
                    <div className="space-y-2">
                      <h4 className="text-[12px] font-bold text-toss-gray-400 uppercase tracking-wider">상세 내역</h4>
                      {s.items.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-3.5 border border-toss-gray-100">
                          <div className="flex justify-between">
                            <span className="font-semibold text-toss-gray-900 text-[14px]">{item.performer}</span>
                            <span className="font-bold text-toss-gray-800 text-[14px]">{item.amount.toLocaleString()}원</span>
                          </div>
                          {s.role === "촬영비" && item.filmingDate && (
                            <p className="text-[12px] text-toss-gray-500 mt-1">
                              {item.filmingDate}{item.expense && item.expense > 0 ? ` · 경비 ${item.expense.toLocaleString()}원` : ""}
                            </p>
                          )}
                          {s.role === "편집비" && (
                            <p className="text-[12px] text-toss-gray-500 mt-1">
                              {item.videoDuration}분
                              {item.videoLink && <> · <a href={item.videoLink} target="_blank" rel="noopener noreferrer" className="text-toss-blue hover:underline">영상 링크</a></>}
                            </p>
                          )}
                          {/* 영수증 */}
                          {item.receiptUrls && item.receiptUrls.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {(item.receiptUrls as string[]).map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={`영수증 ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-toss-gray-200" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-[12px] text-toss-gray-400 text-right">제출 {formatDate(s.created_at)}</p>

                    {/* 상태 변경 버튼 */}
                    <div className="flex gap-2 pt-1">
                      {s.status === "제출됨" && (
                        <button onClick={() => onStatusChange(s.id, "정산완료")}
                          className="flex-1 py-3 bg-toss-green text-white rounded-xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                          정산 완료
                        </button>
                      )}
                      {s.status === "정산완료" && (
                        <div className="flex gap-2 w-full">
                          <div className="flex-1 py-3 text-center text-toss-green text-[14px] font-semibold">
                            ✓ 정산 완료
                          </div>
                          <button onClick={() => onStatusChange(s.id, "제출됨")}
                            className="px-4 py-3 border border-toss-gray-200 text-toss-gray-500 rounded-xl text-[13px] font-medium hover:bg-toss-gray-100 active:scale-[0.98] transition-all">
                            완료 취소
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-toss-gray-600">{label}</span>
      <span className={`font-semibold ${color || "text-toss-gray-900"}`}>{value}</span>
    </div>
  );
}

// ─── 대시보드 ───
function DashboardView({ dashboard, loading, selectedMonth, onMonthChange, formatMonth, formatDate }: {
  dashboard: DashboardData | null; loading: boolean; selectedMonth: string;
  onMonthChange: (m: string) => void; formatMonth: (d: string) => string; formatDate: (d: string) => string;
}) {
  const [y, m] = selectedMonth.split("-").map(Number);
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  const statusStyle: Record<string, string> = {
    "제출됨": "bg-amber-50 text-amber-600",
    "확인됨": "bg-blue-50 text-toss-blue",
    "정산완료": "bg-green-50 text-toss-green",
  };

  return (
    <div className="space-y-5">
      {/* 월 선택 */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <button onClick={() => onMonthChange(prevMonth)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-toss-gray-100 transition text-toss-gray-600">←</button>
        <span className="text-[18px] font-bold text-toss-gray-900 min-w-[120px] text-center">
          {y}년 {m}월
        </span>
        <button onClick={() => onMonthChange(nextMonth)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-toss-gray-100 transition text-toss-gray-600">→</button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-toss-gray-400">불러오는 중...</div>
      ) : !dashboard ? (
        <div className="text-center py-16 text-toss-gray-400">데이터를 불러올 수 없습니다.</div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="총 지출액" value={`${dashboard.summary.totalFinal.toLocaleString()}원`} highlight />
            <SummaryCard label="정산 건수" value={`${dashboard.summary.totalCount}건`} />
            <SummaryCard label="촬영/편집비" value={`${(dashboard.summary.totalAmount - dashboard.summary.totalExpense).toLocaleString()}원`} />
            <SummaryCard label="경비" value={`${dashboard.summary.totalExpense.toLocaleString()}원`} />
          </div>

          {/* 처리 현황 */}
          <div className="bg-white rounded-2xl border border-toss-gray-100 p-5">
            <h3 className="text-[15px] font-bold text-toss-gray-900 mb-3">처리 현황</h3>
            <div className="flex gap-3">
              {Object.entries(dashboard.summary.statusCounts).map(([status, count]) => (
                <div key={status} className="flex-1 text-center">
                  <div className={`inline-block px-3 py-1 rounded-lg text-[12px] font-bold mb-1 ${statusStyle[status] || ""}`}>
                    {status}
                  </div>
                  <div className="text-[20px] font-bold text-toss-gray-900">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 직원별 지출 순위 */}
          <div className="bg-white rounded-2xl border border-toss-gray-100 p-5">
            <h3 className="text-[15px] font-bold text-toss-gray-900 mb-4">직원별 인건비</h3>
            {dashboard.workerRanking.length === 0 ? (
              <p className="text-toss-gray-400 text-[14px] text-center py-4">이번 달 정산 내역이 없어요</p>
            ) : (
              <div className="space-y-3">
                {dashboard.workerRanking.map((w, i) => {
                  const maxAmount = dashboard.workerRanking[0]?.totalFinal || 1;
                  const barWidth = Math.max((w.totalFinal / maxAmount) * 100, 8);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                            i === 0 ? "bg-toss-blue text-white" : "bg-toss-gray-100 text-toss-gray-600"
                          }`}>{i + 1}</span>
                          <span className="text-[14px] font-semibold text-toss-gray-900">{w.name}</span>
                          <span className="text-[11px] text-toss-gray-400">{w.count}건</span>
                        </div>
                        <span className="text-[15px] font-bold text-toss-gray-900">
                          {w.totalFinal.toLocaleString()}원
                        </span>
                      </div>
                      <div className="h-2 bg-toss-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          i === 0 ? "bg-toss-blue" : "bg-toss-gray-300"
                        }`} style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 최근 정산서 */}
          <div className="bg-white rounded-2xl border border-toss-gray-100 p-5">
            <h3 className="text-[15px] font-bold text-toss-gray-900 mb-4">최근 정산서</h3>
            {dashboard.recentSettlements.length === 0 ? (
              <p className="text-toss-gray-400 text-[14px] text-center py-4">정산서가 없어요</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentSettlements.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3 border-b border-toss-gray-50 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-toss-gray-900">{s.workerName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusStyle[s.status] || ""}`}>
                          {s.status}
                        </span>
                      </div>
                      <span className="text-[12px] text-toss-gray-400">
                        {formatMonth(s.settlementMonth)} · {s.role === "촬영비" ? "촬영비" : s.role === "편집비" ? "편집비" : s.role}
                      </span>
                    </div>
                    <span className="text-[15px] font-bold text-toss-gray-900">
                      {s.finalAmount.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${highlight ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100"}`}>
      <p className={`text-[12px] mb-1 ${highlight ? "text-blue-200" : "text-toss-gray-500"}`}>{label}</p>
      <p className={`text-[20px] font-bold ${highlight ? "text-white" : "text-toss-gray-900"}`}>{value}</p>
    </div>
  );
}

// ─── 직원 관리 ───
function WorkersView({ pendingWorkers, approvedWorkers, expandedId, setExpandedId, handleApprove, handleReject, handleCategoryToggle, formatPhone, formatDate }: {
  pendingWorkers: WorkerData[]; approvedWorkers: WorkerData[];
  expandedId: string | null; setExpandedId: (id: string | null) => void;
  handleApprove: (id: string, approved: boolean) => void;
  handleReject: (id: string) => void;
  handleCategoryToggle: (workerId: string, category: string) => void;
  formatPhone: (p: string) => string; formatDate: (d: string) => string;
}) {
  return (
    <div className="space-y-6">
      {pendingWorkers.length > 0 && (
        <div>
          <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3 flex items-center gap-2">
            승인 대기
            <span className="px-2 py-0.5 bg-toss-red text-white rounded-lg text-[11px] font-bold">{pendingWorkers.length}</span>
          </h2>
          <div className="space-y-3">
            {pendingWorkers.map((w) => (
              <WorkerCard key={w.id} worker={w} expanded={expandedId === w.id}
                onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)}
                onApprove={() => handleApprove(w.id, true)}
                onReject={() => handleReject(w.id)}
                onCategoryToggle={(cat) => handleCategoryToggle(w.id, cat)}
                formatPhone={formatPhone} formatDate={formatDate} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-[16px] font-bold text-toss-gray-900 mb-3">직원 목록 ({approvedWorkers.length})</h2>
        {approvedWorkers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-toss-gray-400 text-[14px]">등록된 직원이 없어요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvedWorkers.map((w) => (
              <WorkerCard key={w.id} worker={w} expanded={expandedId === w.id}
                onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)}
                onDelete={() => handleReject(w.id)}
                onCategoryToggle={(cat) => handleCategoryToggle(w.id, cat)}
                formatPhone={formatPhone} formatDate={formatDate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkerCard({ worker, expanded, onToggle, onApprove, onReject, onRevoke, onDelete, onCategoryToggle, formatPhone, formatDate }: {
  worker: WorkerData; expanded: boolean; onToggle: () => void;
  onApprove?: () => void; onReject?: () => void; onRevoke?: () => void; onDelete?: () => void;
  onCategoryToggle?: (category: string) => void;
  formatPhone: (p: string) => string; formatDate: (d: string) => string;
}) {
  const categories = worker.categories || ["촬영비", "숏폼", "카드뉴스", "편집비"];
  return (
    <div className="bg-white border border-toss-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <button onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-toss-gray-50 transition">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-bold text-toss-gray-900">{worker.name}</span>
          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
            worker.contract_type === "프리랜서" ? "bg-orange-50 text-toss-orange" : "bg-green-50 text-toss-green"
          }`}>{worker.contract_type}</span>
          {!worker.approved && (
            <span className="px-2 py-0.5 bg-red-50 text-toss-red rounded-lg text-[11px] font-bold">대기</span>
          )}
        </div>
        <span className="text-toss-gray-400 text-[12px]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-toss-gray-100 px-5 py-5 bg-toss-gray-50 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-[14px]">
            <InfoField label="휴대폰" value={formatPhone(worker.phone)} />
            <InfoField label="가입일" value={formatDate(worker.created_at)} />
            {worker.bank_name && <InfoField label="은행" value={worker.bank_name} />}
            {worker.bank_account && <InfoField label="계좌번호" value={worker.bank_account} />}
            {worker.account_holder && <InfoField label="예금주" value={worker.account_holder} />}
          </div>
          {worker.business_registration_url && (
            <div>
              <span className="text-[12px] text-toss-gray-400 block mb-1.5">사업자등록증</span>
              <img src={worker.business_registration_url} alt="사업자등록증" className="max-h-48 rounded-xl border border-toss-gray-200" />
            </div>
          )}
          {onCategoryToggle && (
            <div>
              <span className="text-[12px] text-toss-gray-400 block mb-2">정산 카테고리</span>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map((c) => (
                  <button key={c.key} onClick={() => onCategoryToggle(c.key)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                      categories.includes(c.key)
                        ? "bg-toss-blue text-white"
                        : "bg-toss-gray-100 text-toss-gray-400"
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {onApprove && (
              <button onClick={onApprove}
                className="flex-1 py-3 bg-toss-blue text-white rounded-xl text-[14px] font-semibold hover:bg-toss-blue-hover active:scale-[0.98] transition-all">
                승인
              </button>
            )}
            {onReject && (
              <button onClick={onReject}
                className="flex-1 py-3 bg-toss-red text-white rounded-xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                거절
              </button>
            )}
            {onRevoke && (
              <button onClick={onRevoke}
                className="px-5 py-3 border border-toss-gray-200 text-toss-gray-600 rounded-xl text-[14px] font-medium hover:bg-toss-gray-100 active:scale-[0.98] transition-all">
                승인 취소
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete}
                className="px-5 py-3 bg-toss-red text-white rounded-xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                삭제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[12px] text-toss-gray-400">{label}</span>
      <p className="text-[14px] font-medium text-toss-gray-900">{value}</p>
    </div>
  );
}
