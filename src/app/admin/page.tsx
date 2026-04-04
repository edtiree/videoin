"use client";

import { useEffect, useState, useRef } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { getRoleLabel } from "@/lib/tax";
import TopNav from "@/components/TopNav";

interface WorkerData {
  id: string; name: string; phone: string; role: string; contract_type: string;
  bank_name: string | null; bank_account: string | null; account_holder: string | null;
  business_registration_url: string | null; approved: boolean; created_at: string;
  categories: string[] | null;
  is_admin?: boolean;
  allowed_services?: string[];
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

type Tab = "dashboard" | "settlements" | "workers" | "notifications" | "tasks";
const SERVICE_OPTIONS = [
  { key: "settlement", label: "정산 관리" },
  { key: "calendar", label: "촬영 일정" },
  { key: "review", label: "영상 피드백" },
  { key: "instagram-card", label: "카드뉴스 메이커" },
  { key: "youtube-title", label: "제목 생성기" },
  { key: "youtube-shorts", label: "쇼츠 제작기" },
  { key: "screen-material", label: "화면자료 제작기" },
];

interface SettlementData {
  id: string; worker_id: string; worker_name: string; role: string;
  contract_type: string; settlement_month: string; total_amount: number;
  total_expense: number; tax: number; final_amount: number; status: string;
  created_at: string; tax_invoice_issued?: boolean;
  items: { performer: string; filmingDate?: string; expense?: number;
    receiptUrls?: string[]; videoLink?: string; videoDuration?: number; amount: number; }[];
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [adminMode, setAdminMode] = useState<"menu" | "staff" | "ads">("staff");
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

  // localStorage에서 관리자 확인
  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (saved) {
      try {
        const w = JSON.parse(saved);
        if (w.isAdmin) {
          setAuthed(true);
          sessionStorage.setItem("ads_authed", "1");
          fetchAll();
        }
      } catch {}
    }
  }, []);

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

  const handleServiceToggle = async (workerId: string, service: string) => {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;
    const current = worker.allowed_services || ["settlement"];
    const updated = current.includes(service)
      ? current.filter((s) => s !== service)
      : [...current, service];
    const res = await fetch("/api/admin/update-services", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId, allowedServices: updated }),
    });
    if (res.ok) setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, allowed_services: updated } : w));
  };

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

  // ─── 접근 권한 확인 ───
  if (!authed) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-[22px] font-bold text-toss-gray-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-toss-gray-500 text-[14px] mb-6">관리자만 접근할 수 있는 페이지입니다.</p>
          <a href="/" className="px-6 py-3 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover transition inline-block">홈으로</a>
        </div>
      </div>
    );
  }

  const pendingWorkers = workers.filter((w) => !w.approved);
  const approvedWorkers = workers.filter((w) => w.approved);


  // 광고 관리 → /ads로 이동 (PIN 없이)
  if (adminMode === "ads") {
    if (typeof window !== "undefined") window.location.href = "/ads?authed=1";
    return <div className="min-h-full flex items-center justify-center text-toss-gray-400">이동 중...</div>;
  }

  return (
    <div className="min-h-full pb-10">
      <TopNav title="직원·정산 관리" backHref="/" rightContent={
        <button
          onClick={() => {
            const url = `${window.location.origin}`;
            navigator.clipboard.writeText(url);
            setAlertMsg("가입 링크가 복사되었습니다!\n직원에게 공유해주세요.");
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-toss-blue text-white rounded-xl text-[13px] font-semibold hover:bg-toss-blue-hover active:scale-[0.98] transition-all"
        >
          가입 링크 복사
        </button>
      } />

      <div className="max-w-3xl md:max-w-5xl mx-auto px-5 md:px-8 mt-6">
        {/* 탭 */}
        <div className="flex bg-toss-gray-100 rounded-2xl p-1 mb-6">
          {[
            { key: "dashboard" as Tab, label: "대시보드" },
            { key: "settlements" as Tab, label: `정산서${settlements.filter(s => s.status === "제출됨").length > 0 ? ` (${settlements.filter(s => s.status === "제출됨").length})` : ""}` },
            { key: "workers" as Tab, label: `직원${pendingWorkers.length > 0 ? ` (${pendingWorkers.length})` : ""}` },
            { key: "notifications" as Tab, label: "알림" },
            { key: "tasks" as Tab, label: "작업 현황" },
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
            onTaxInvoiceToggle={async (id, issued) => {
              setSettlements(prev => prev.map(x => x.id === id ? { ...x, tax_invoice_issued: issued } : x));
              await fetch("/api/settlements/tax-invoice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settlementId: id, issued }) });
            }}
            formatMonth={formatMonth}
            formatDate={formatDate}
          />
        ) : tab === "workers" ? (
          <WorkersView
            pendingWorkers={pendingWorkers}
            approvedWorkers={approvedWorkers}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            handleApprove={handleApprove}
            handleReject={handleReject}
            handleCategoryToggle={handleCategoryToggle}
            handleServiceToggle={handleServiceToggle}
            formatPhone={formatPhone}
            formatDate={formatDate}
          />
        ) : tab === "notifications" ? (
          <NotificationSender approvedWorkers={approvedWorkers} />
        ) : (
          <TaskStatusView approvedWorkers={approvedWorkers} />
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
function SettlementsView({ settlements, selectedMonth, onMonthChange, onStatusChange, onTaxInvoiceToggle, formatMonth, formatDate }: {
  settlements: SettlementData[]; selectedMonth: string;
  onMonthChange: (m: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onTaxInvoiceToggle: (id: string, issued: boolean) => void;
  formatMonth: (d: string) => string; formatDate: (d: string) => string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("전체");
  const [nameSearch, setNameSearch] = useState("");

  const [y, m] = selectedMonth.split("-").map(Number);
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  const filtered = (filter === "전체" ? settlements : settlements.filter((s) => s.status === filter))
    .filter(s => !nameSearch || s.worker_name.includes(nameSearch));

  const statusStyle: Record<string, string> = {
    "제출됨": "bg-amber-50 text-amber-600",
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
      <div className="flex gap-2 items-center flex-wrap">
        {["전체", "제출됨", "정산완료"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-xl text-[13px] font-semibold transition-all ${
              filter === f ? "bg-toss-gray-900 text-white" : "bg-toss-gray-100 text-toss-gray-500 hover:bg-toss-gray-200"
            }`}>{f}</button>
        ))}
        <input value={nameSearch} onChange={e => setNameSearch(e.target.value)}
          className="rounded-xl border border-toss-gray-200 px-3 py-1.5 text-[13px] bg-white outline-none focus:border-toss-blue w-32 placeholder:text-toss-gray-400"
          placeholder="이름 검색" />
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
                        {getRoleLabel(s.role)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${statusStyle[s.status] || ""}`}>
                        {s.status}
                      </span>
                      {s.contract_type === "사업자" && (
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${s.tax_invoice_issued ? "bg-green-50 text-green-600" : "bg-red-50 text-toss-red"}`}>
                          {s.tax_invoice_issued ? "계산서 ✓" : "계산서 ✗"}
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] text-toss-gray-400">{formatMonth(s.settlement_month)}</span>
                  </div>
                  <span className="text-[16px] font-bold text-toss-blue">{s.final_amount.toLocaleString()}원</span>
                </button>

                {isExpanded && (
                  <div className="border-t border-toss-gray-100 px-5 py-5 bg-toss-gray-50 space-y-4">
                    <div className="space-y-2.5 text-[14px]">
                      <SRow label={getRoleLabel(s.role)} value={`${(s.total_amount - s.total_expense).toLocaleString()}원`} />
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

                    {s.contract_type === "사업자" && (
                      <div className="flex items-center justify-between bg-white rounded-xl p-3.5 border border-toss-gray-100">
                        <div>
                          <span className="text-[14px] font-semibold text-toss-gray-900">세금계산서</span>
                          <span className="text-[12px] text-toss-gray-400 ml-2">{s.tax_invoice_issued ? "발행 완료" : "미발행"}</span>
                        </div>
                        <button onClick={() => onTaxInvoiceToggle(s.id, !s.tax_invoice_issued)}
                          className={`w-11 h-6 rounded-full transition-all relative ${s.tax_invoice_issued ? "bg-toss-blue" : "bg-toss-gray-200"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${s.tax_invoice_issued ? "left-[22px]" : "left-0.5"}`} />
                        </button>
                      </div>
                    )}

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
                        {formatMonth(s.settlementMonth)} · {getRoleLabel(s.role)}
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
function WorkersView({ pendingWorkers, approvedWorkers, expandedId, setExpandedId, handleApprove, handleReject, handleCategoryToggle, handleServiceToggle, formatPhone, formatDate }: {
  pendingWorkers: WorkerData[]; approvedWorkers: WorkerData[];
  expandedId: string | null; setExpandedId: (id: string | null) => void;
  handleApprove: (id: string, approved: boolean) => void;
  handleReject: (id: string) => void;
  handleCategoryToggle: (workerId: string, category: string) => void;
  handleServiceToggle: (workerId: string, service: string) => void;
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
                onServiceToggle={(svc) => handleServiceToggle(w.id, svc)}
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
                onServiceToggle={(svc) => handleServiceToggle(w.id, svc)}
                formatPhone={formatPhone} formatDate={formatDate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkerCard({ worker, expanded, onToggle, onApprove, onReject, onRevoke, onDelete, onCategoryToggle, onServiceToggle, formatPhone, formatDate }: {
  worker: WorkerData; expanded: boolean; onToggle: () => void;
  onApprove?: () => void; onReject?: () => void; onRevoke?: () => void; onDelete?: () => void;
  onCategoryToggle?: (category: string) => void;
  onServiceToggle?: (service: string) => void;
  formatPhone: (p: string) => string; formatDate: (d: string) => string;
}) {
  const categories = worker.categories || ["촬영비", "숏폼", "카드뉴스", "편집비"];
  return (
    <div className="bg-white border border-toss-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <button onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-toss-gray-50 transition">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-bold text-toss-gray-900">{worker.name}</span>
          {worker.is_admin ? (
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-600">관리자</span>
          ) : (
            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
              worker.contract_type === "프리랜서" ? "bg-orange-50 text-toss-orange" : "bg-green-50 text-toss-green"
            }`}>{worker.contract_type}</span>
          )}
          {!worker.approved && (
            <span className="px-2 py-0.5 bg-red-50 text-toss-red rounded-lg text-[11px] font-bold">대기</span>
          )}
        </div>
        <span className="text-toss-gray-400 text-[12px]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-toss-gray-100 px-5 py-5 bg-toss-gray-50 space-y-4">
          {worker.is_admin ? (
            <div className="text-[14px]">
              <InfoField label="휴대폰" value={formatPhone(worker.phone)} />
              <p className="text-[13px] text-toss-gray-400 mt-3">관리자는 모든 서비스에 접근할 수 있습니다.</p>
            </div>
          ) : (<>
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
          {onCategoryToggle && !worker.is_admin && (
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

          {onServiceToggle && worker.approved && !worker.is_admin && (
            <div>
              <span className="text-[12px] text-toss-gray-400 block mb-2">사용 가능 서비스</span>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((s) => {
                  const allowed = (worker as WorkerData & { allowed_services?: string[] }).allowed_services || ["settlement"];
                  return (
                    <button key={s.key} onClick={() => onServiceToggle(s.key)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                        allowed.includes(s.key) ? "bg-toss-green text-white" : "bg-toss-gray-100 text-toss-gray-400"
                      }`}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!worker.is_admin && (
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
          )}
          </>)}
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

// ─── 알림 보내기 ───

const NOTIF_TYPES = [
  { key: "filming", label: "촬영", icon: "🎬" },
  { key: "editing", label: "편집", icon: "✂️" },
  { key: "shorts", label: "쇼츠·릴스", icon: "🎞️" },
  { key: "cardnews", label: "카드뉴스", icon: "📰" },
  { key: "announcement", label: "공지사항", icon: "📢" },
];
const WORK_TYPES = NOTIF_TYPES.filter(t => t.key !== "announcement");

function NotificationSender({ approvedWorkers }: { approvedWorkers: WorkerData[] }) {
  const [type, setType] = useState("filming");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(["filming"]));
  const [target, setTarget] = useState<"all" | "select">("all");
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // 광고DB 연동
  interface AdItem { id: string; performer: string; youtube_channel: string; upload_date: string; filming_date: string; }
  const [adList, setAdList] = useState<AdItem[]>([]);
  const [adSearch, setAdSearch] = useState("");
  const [showAdResults, setShowAdResults] = useState(false);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  interface SentNotif { id: string; type: string; title: string; message: string; target_worker_id: string | null; targetWorkerId: string | null; created_at: string; }
  const [history, setHistory] = useState<SentNotif[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [selectedNotifs, setSelectedNotifs] = useState<Set<string>>(new Set());

  const [adminId, setAdminId] = useState("");

  const refreshHistory = () => {
    const saved = localStorage.getItem("worker");
    if (!saved) return;
    const w = JSON.parse(saved);
    setAdminId(w.id);
    fetch(`/api/notifications?workerId=${w.id}&adminSent=true`)
      .then(r => r.json())
      .then(data => setHistory(data.notifications || []))
      .catch(() => {});
  };

  useEffect(() => {
    refreshHistory();
    fetch("/api/ads")
      .then(r => r.json())
      .then(data => setAdList(data || []))
      .catch(() => {});
  }, [sent]);

  // 작업 현황에서 알림 보냈을 때도 새로고침
  useEffect(() => {
    const handler = () => refreshHistory();
    window.addEventListener("notification-sent", handler);
    return () => window.removeEventListener("notification-sent", handler);
  }, []);

  const toggleWorker = (id: string) => {
    setSelectedWorkers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!title.trim()) { alert("제목을 입력하세요"); return; }
    if (type === "announcement" && !message.trim()) { alert("내용을 입력하세요"); return; }
    if (type !== "announcement" && selectedTypes.size === 0) { alert("요청할 작업을 선택하세요"); return; }
    if (target === "select" && selectedWorkers.size === 0) { alert("대상 직원을 선택하세요"); return; }

    setSending(true);
    const saved = localStorage.getItem("worker");
    const adminId = saved ? JSON.parse(saved).id : null;

    try {
      if (type === "announcement") {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "announcement", title: title.trim(), message: message.trim(),
            link: link.trim() || undefined,
            targetWorkerIds: target === "select" ? Array.from(selectedWorkers) : undefined,
            createdBy: adminId,
          }),
        });
        if (!res.ok) throw new Error();
      } else {
        // 선택된 작업 유형별로 각각 알림 전송
        for (const wType of selectedTypes) {
          const res = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: wType, title: title.trim(), message: title.trim(),
              deadlineDate: deadlineDate || undefined,
              targetWorkerIds: target === "select" ? Array.from(selectedWorkers) : undefined,
              createdBy: adminId,
            }),
          });
          if (!res.ok) throw new Error();
        }
      }
      setTitle(""); setMessage(""); setLink(""); setDeadlineDate(""); setSelectedWorkers(new Set()); setSelectedAdId(null); setSelectedTypes(new Set(["filming"]));
      setSent(s => !s);
      alert("알림을 보냈습니다!");
    } catch {
      alert("알림 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 알림 보내기 폼 */}
      <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
        <h3 className="text-[16px] font-bold text-toss-gray-900 mb-4">알림 보내기</h3>

        {/* 모드 선택 */}
        <div className="mb-4">
          <label className="text-[13px] font-semibold text-toss-gray-700 mb-2 block">알림 유형</label>
          <div className="flex gap-2 mb-3">
            <button onClick={() => { setType("filming"); setSelectedTypes(new Set(["filming"])); }}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${type !== "announcement" ? "bg-toss-blue text-white" : "bg-toss-gray-50 text-toss-gray-600"}`}>
              작업 요청
            </button>
            <button onClick={() => { setType("announcement"); setSelectedTypes(new Set()); }}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${type === "announcement" ? "bg-toss-blue text-white" : "bg-toss-gray-50 text-toss-gray-600"}`}>
              📢 공지사항
            </button>
          </div>
          {type !== "announcement" && (
            <div>
              <p className="text-[12px] text-toss-gray-400 mb-2">요청할 작업 (복수 선택 가능)</p>
              <div className="flex flex-wrap gap-2">
                {WORK_TYPES.map(t => {
                  const selected = selectedTypes.has(t.key);
                  return (
                    <button key={t.key} onClick={() => {
                      setSelectedTypes(prev => {
                        const next = new Set(prev);
                        if (next.has(t.key)) next.delete(t.key); else next.add(t.key);
                        return next;
                      });
                    }}
                      className={`px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                        selected ? "bg-toss-blue text-white" : "bg-toss-gray-50 text-toss-gray-600"
                      }`}>
                      {t.icon} {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 광고DB 출연자 검색 — 작업 요청만 */}
        {type !== "announcement" && (
          <div className="mb-4">
            <label className="text-[13px] font-semibold text-toss-gray-700 mb-1.5 block">광고DB에서 출연자 선택 <span className="text-toss-gray-400 font-normal">(선택)</span></label>
            <div className="relative">
              <input value={adSearch}
                onChange={e => { setAdSearch(e.target.value); setShowAdResults(true); }}
                onFocus={() => setShowAdResults(true)}
                className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue"
                placeholder="출연자명 검색..." />
              {showAdResults && adSearch.trim() && (() => {
                const results = adList.filter(a => a.performer.toLowerCase().includes(adSearch.toLowerCase())).slice(0, 8);
                if (results.length === 0) return null;
                return (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-toss-gray-200 rounded-xl shadow-lg z-10 max-h-[200px] overflow-y-auto">
                    {results.map(ad => (
                      <button key={ad.id} type="button"
                        onClick={() => {
                          setTitle(ad.performer);
                          setMessage(ad.performer);
                          if (ad.upload_date) setDeadlineDate(ad.upload_date.split(" ")[0]);
                          setSelectedAdId(ad.id);
                          setAdSearch("");
                          setShowAdResults(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-toss-gray-50 transition border-b border-toss-gray-50 last:border-0">
                        <p className="text-[13px] font-semibold text-toss-gray-900">{ad.performer}</p>
                        <p className="text-[11px] text-toss-gray-400">{ad.youtube_channel} · 업로드 {ad.upload_date || "미정"}</p>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 대상 선택 */}
        <div className="mb-4">
          <label className="text-[13px] font-semibold text-toss-gray-700 mb-2 block">대상</label>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setTarget("all")}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                target === "all" ? "bg-toss-gray-900 text-white" : "bg-toss-gray-50 text-toss-gray-600"
              }`}>전체 직원</button>
            <button onClick={() => setTarget("select")}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                target === "select" ? "bg-toss-gray-900 text-white" : "bg-toss-gray-50 text-toss-gray-600"
              }`}>직원 선택</button>
          </div>
          {target === "select" && (
            <div className="flex flex-wrap gap-2 mt-2">
              {approvedWorkers.filter(w => !w.is_admin).map(w => (
                <button key={w.id} onClick={() => toggleWorker(w.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                    selectedWorkers.has(w.id) ? "bg-toss-blue text-white" : "bg-toss-gray-100 text-toss-gray-700"
                  }`}>{w.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* 출연자명/제목 */}
        <div className="mb-3">
          <label className="text-[13px] font-semibold text-toss-gray-700 mb-1.5 block">
            {type === "announcement" ? "제목" : "출연자명"} {selectedAdId && type !== "announcement" && <span className="text-toss-gray-400 font-normal">(광고DB 연동)</span>}
          </label>
          <input value={title}
            onChange={type === "announcement" ? (e) => setTitle(e.target.value) : selectedAdId ? undefined : (e) => { setTitle(e.target.value); setMessage(e.target.value); }}
            readOnly={type !== "announcement" && !!selectedAdId}
            className={`w-full px-4 py-3 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue ${type !== "announcement" && selectedAdId ? "bg-toss-gray-50 text-toss-gray-500 cursor-not-allowed" : ""}`}
            placeholder={type === "announcement" ? "공지사항 제목" : "출연자명 입력"} />
        </div>

        {/* 내용 — 공지사항만 표시 */}
        {type === "announcement" && (
          <div className="mb-3">
            <label className="text-[13px] font-semibold text-toss-gray-700 mb-1.5 block">내용</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue resize-none"
              placeholder="공지사항 내용을 입력하세요" />
          </div>
        )}

        {/* 업로드 일정 — 작업 요청만 표시 */}
        {type !== "announcement" && (
          <div className="mb-3">
            <label className="text-[13px] font-semibold text-toss-gray-700 mb-1.5 block">
              업로드 일정 {selectedAdId ? <span className="text-toss-gray-400 font-normal">(광고DB 연동)</span> : <span className="text-toss-gray-400 font-normal">(선택)</span>}
            </label>
            <input type="date" value={deadlineDate}
              onChange={selectedAdId ? undefined : (e) => setDeadlineDate(e.target.value)}
              readOnly={!!selectedAdId}
              className={`w-full px-4 py-3 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue ${selectedAdId ? "bg-toss-gray-50 text-toss-gray-500 cursor-not-allowed" : ""}`} />
            {selectedAdId && <p className="text-[11px] text-toss-gray-400 mt-1">광고DB에서 가져온 일정입니다. 변경은 광고 관리에서 해주세요.</p>}
          </div>
        )}

        {/* 링크 (선택) */}
        <div className="mb-5">
          <label className="text-[13px] font-semibold text-toss-gray-700 mb-1.5 block">링크 <span className="text-toss-gray-400 font-normal">(선택)</span></label>
          <input value={link} onChange={e => setLink(e.target.value)}
            className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue"
            placeholder="/settlement" />
        </div>

        <button onClick={handleSend} disabled={sending}
          className="w-full py-3.5 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover disabled:opacity-50 transition text-[15px]">
          {sending ? "전송 중..." : "알림 보내기"}
        </button>
      </div>

      {/* 보낸 이력 */}
      {history.length > 0 && (() => {
        const workerIds = [...new Set(history.map(n => n.target_worker_id || n.targetWorkerId).filter(Boolean))];
        const workerNames: Record<string, string> = {};
        approvedWorkers.forEach(w => { workerNames[w.id] = w.name; });
        const filtered = historyFilter === "all" ? history
          : historyFilter === "broadcast" ? history.filter(n => !n.target_worker_id && !n.targetWorkerId)
          : history.filter(n => (n.target_worker_id || n.targetWorkerId) === historyFilter);

        return (
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-bold text-toss-gray-900">최근 보낸 알림</h3>
            {selectedNotifs.size > 0 && (
              <button onClick={async () => {
                if (!confirm(`선택한 ${selectedNotifs.size}개 알림을 삭제하시겠습니까?`)) return;
                for (const nid of selectedNotifs) {
                  await fetch(`/api/notifications?id=${nid}&adminId=${adminId}`, { method: "DELETE" }).catch(() => {});
                }
                setHistory(prev => prev.filter(h => !selectedNotifs.has(h.id)));
                setSelectedNotifs(new Set());
              }}
                className="px-3 py-1.5 text-[12px] font-semibold text-toss-red bg-red-50 rounded-lg hover:bg-red-100 transition">
                {selectedNotifs.size}개 삭제
              </button>
            )}
          </div>

          {/* 직원별 필터 */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button onClick={() => { setHistoryFilter("all"); setSelectedNotifs(new Set()); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${historyFilter === "all" ? "bg-toss-gray-900 text-white" : "bg-toss-gray-100 text-toss-gray-500"}`}>전체</button>
            <button onClick={() => { setHistoryFilter("broadcast"); setSelectedNotifs(new Set()); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${historyFilter === "broadcast" ? "bg-toss-gray-900 text-white" : "bg-toss-gray-100 text-toss-gray-500"}`}>전체발송</button>
            {workerIds.map(wid => (
              <button key={wid} onClick={() => { setHistoryFilter(wid as string); setSelectedNotifs(new Set()); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${historyFilter === wid ? "bg-toss-gray-900 text-white" : "bg-toss-gray-100 text-toss-gray-500"}`}>
                {workerNames[wid as string] || "알 수 없음"}
              </button>
            ))}
          </div>

          {/* 전체 선택 */}
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => {
              if (selectedNotifs.size === filtered.length) setSelectedNotifs(new Set());
              else setSelectedNotifs(new Set(filtered.map(n => n.id)));
            }}
              className="flex items-center gap-1.5 text-[12px] text-toss-gray-500 hover:text-toss-gray-700 transition">
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedNotifs.size === filtered.length && filtered.length > 0 ? "border-toss-blue bg-toss-blue" : "border-toss-gray-300"}`}>
                {selectedNotifs.size === filtered.length && filtered.length > 0 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
              </span>
              전체 선택
            </button>
          </div>

          <div className="space-y-1">
            {filtered.slice(0, 30).map((n: SentNotif) => {
              const wid = n.target_worker_id || n.targetWorkerId;
              const isSelected = selectedNotifs.has(n.id);
              return (
              <div key={n.id} className={`flex items-start gap-2.5 py-2.5 border-b border-toss-gray-50 last:border-0 ${isSelected ? "bg-blue-50/30 -mx-2 px-2 rounded-lg" : ""}`}>
                <button onClick={() => setSelectedNotifs(prev => { const next = new Set(prev); if (next.has(n.id)) next.delete(n.id); else next.add(n.id); return next; })}
                  className={`w-4 h-4 shrink-0 mt-1 rounded border-2 flex items-center justify-center transition ${isSelected ? "border-toss-blue bg-toss-blue" : "border-toss-gray-300"}`}>
                  {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
                <span className="text-[16px] shrink-0 mt-0.5">{NOTIF_TYPES.find(t => t.key === n.type)?.icon || "📢"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-toss-gray-900 truncate">{n.title}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-toss-gray-100 text-toss-gray-500 shrink-0">
                      {wid ? workerNames[wid] || "개별" : "전체"}
                    </span>
                  </div>
                  <p className="text-[11px] text-toss-gray-400 mt-0.5">
                    {new Date(n.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

// ─── 작업 현황 ───

interface TaskAd {
  id: string; performer: string; youtube_channel: string;
  filming_date: string; upload_date: string; progress: string;
}

interface TaskNotifItem {
  id: string; type: string; title: string; deadlineDate: string | null;
  targetWorkerId: string | null; createdAt: string;
}

function TaskStatusView({ approvedWorkers }: { approvedWorkers: WorkerData[] }) {
  void approvedWorkers;
  const [ads, setAds] = useState<TaskAd[]>([]);
  const [notifs, setNotifs] = useState<TaskNotifItem[]>([]);
  const [settlePerformers, setSettlePerformers] = useState<{performer: string; role: string; status: string; workerName: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    const saved = localStorage.getItem("worker");
    const adminId = saved ? JSON.parse(saved).id : null;
    return Promise.all([
      fetch("/api/ads").then(r => r.json()),
      adminId ? fetch(`/api/notifications?workerId=${adminId}&adminSent=true`).then(r => r.json()) : Promise.resolve({ notifications: [] }),
      fetch("/api/admin/settlements").then(r => r.json()).catch(() => []),
    ]).then(([adsData, notifsData, settleData]) => {
      setAds(adsData || []);
      setNotifs(notifsData.notifications || []);
      const items: {performer: string; role: string; status: string; workerName: string}[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (settleData || []).forEach((s: any) => {
        (s.items || []).forEach((item: {performer: string}) => {
          items.push({ performer: item.performer, role: s.role, status: s.status, workerName: s.worker_name || "" });
        });
      });
      setSettlePerformers(items);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const TASK_DEFS = [
    { type: "filming", label: "촬영", icon: "🎬" },
    { type: "editing", label: "편집", icon: "✂️" },
    { type: "shorts", label: "쇼츠", icon: "🎞️" },
    { type: "cardnews", label: "카드뉴스", icon: "📰" },
  ];
  const typeToRole: Record<string, string> = { filming: "촬영비", editing: "편집비", shorts: "숏폼", cardnews: "카드뉴스" };

  const getStatus = (performer: string, type: string) => {
    const requested = notifs.some(n => n.type === type && n.title === performer);
    if (!requested) return "요청 전";
    const role = typeToRole[type];
    const done = settlePerformers.some(s => s.performer === performer && s.role === role && s.status === "정산완료");
    if (done) return "정산 완료";
    const submitted = settlePerformers.some(s => s.performer === performer && s.role === role && s.status === "제출됨");
    if (submitted) return "정산 대기";
    return "요청됨";
  };

  const getWorker = (performer: string, type: string) => {
    const role = typeToRole[type];
    const match = settlePerformers.find(s => s.performer === performer && s.role === role);
    return match?.workerName || null;
  };

  const badge = (s: string) => s === "요청 전" ? "bg-toss-gray-100 text-toss-gray-500" : s === "요청됨" ? "bg-blue-50 text-toss-blue" : s === "정산 대기" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-toss-green";

  const [requestPopup, setRequestPopup] = useState<{ performer: string; type: string; uploadDate: string } | null>(null);
  const [requestTarget, setRequestTarget] = useState<string>("all");

  const handleRequestSend = async () => {
    if (!requestPopup) return;
    const saved = localStorage.getItem("worker");
    if (!saved) return;
    const adminId = JSON.parse(saved).id;
    const { performer, type, uploadDate } = requestPopup;
    const typeLabel = TASK_DEFS.find(t => t.type === type)?.label || type;
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, title: performer, message: performer,
          deadlineDate: uploadDate?.split(" ")[0] || undefined,
          targetWorkerIds: requestTarget !== "all" ? [requestTarget] : undefined,
          createdBy: adminId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "전송 실패");
      }
      await fetchData();
      window.dispatchEvent(new Event("notification-sent"));
      setRequestPopup(null);
      setRequestTarget("all");
      alert(`${performer} ${typeLabel} 요청 완료!`);
    } catch (e) { alert(`요청 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`); }
  };

  const filtered = ads.filter(ad => !search || ad.performer.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="text-center py-12 text-toss-gray-400">불러오는 중...</div>;

  // 통계
  const totalAds = ads.length;
  const statsByType = TASK_DEFS.map(td => ({
    ...td,
    done: ads.filter(ad => getStatus(ad.performer, td.type) === "정산 완료").length,
  }));

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-3 text-center shadow-sm">
          <p className="text-[11px] text-toss-gray-500 mb-0.5">전체</p>
          <p className="text-[18px] font-bold text-toss-gray-900">{totalAds}</p>
        </div>
        {statsByType.map(s => (
          <div key={s.type} className="bg-white rounded-2xl border border-toss-gray-100 p-3 text-center shadow-sm">
            <p className="text-[11px] text-toss-gray-500 mb-0.5">{s.icon}{s.label}</p>
            <p className="text-[18px] font-bold text-toss-blue">{s.done}<span className="text-[12px] text-toss-gray-400">/{totalAds}</span></p>
          </div>
        ))}
      </div>

      {/* 검색 */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue bg-white"
        placeholder="출연자명 검색..." />

      {/* 출연자 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-toss-gray-400 text-[14px]">검색 결과가 없습니다</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ad => {
            const statuses = TASK_DEFS.map(td => ({ ...td, status: getStatus(ad.performer, td.type), worker: getWorker(ad.performer, td.type) }));
            const allDone = statuses.every(s => s.status === "정산 완료");
            const isExpanded = expandedId === ad.id;

            return (
              <div key={ad.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${allDone ? "border-green-200" : "border-toss-gray-100"}`}>
                <button onClick={() => setExpandedId(isExpanded ? null : ad.id)}
                  className="w-full px-4 py-4 text-left hover:bg-toss-gray-50 transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[15px] font-bold text-toss-gray-900">{ad.performer}</p>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-toss-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {statuses.map(s => (
                      <span key={s.type} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge(s.status)}`}>{s.label} {s.status === "정산 완료" ? "✓" : s.status === "정산 대기" ? "⏳" : s.status === "요청됨" ? "→" : "·"}</span>
                    ))}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-toss-gray-100 px-4 py-4 bg-toss-gray-50 space-y-2.5">
                    {statuses.map(task => (
                      <div key={task.type} className="flex items-center justify-between bg-white rounded-xl p-3.5 border border-toss-gray-100">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[18px]">{task.icon}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[14px] font-semibold text-toss-gray-900">{task.label}</p>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge(task.status)}`}>{task.status}</span>
                            </div>
                            {task.worker && (
                              <p className="text-[11px] text-toss-gray-400 mt-0.5">담당: {task.worker}</p>
                            )}
                          </div>
                        </div>
                        {task.status === "요청 전" && (
                          <button onClick={() => setRequestPopup({ performer: ad.performer, type: task.type, uploadDate: ad.upload_date })}
                            className="px-3 py-1.5 bg-toss-blue text-white text-[12px] font-semibold rounded-lg hover:bg-toss-blue-hover transition active:scale-[0.98]">
                            요청
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="bg-white rounded-xl p-3.5 border border-toss-gray-100 text-[13px] text-toss-gray-500 space-y-1">
                      <div className="flex justify-between"><span>채널</span><span className="font-semibold text-toss-gray-900">{ad.youtube_channel}</span></div>
                      <div className="flex justify-between"><span>촬영일</span><span className="font-semibold text-toss-gray-900">{ad.filming_date || "미정"}</span></div>
                      <div className="flex justify-between"><span>업로드</span><span className="font-semibold text-toss-gray-900">{ad.upload_date || "미정"}</span></div>
                      <div className="flex justify-between"><span>진행</span><span className="font-semibold text-toss-gray-900">{ad.progress}</span></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 요청 보내기 팝업 */}
      {requestPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => { setRequestPopup(null); setRequestTarget("all"); }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-toss-gray-900 mb-1">{requestPopup.performer}</h3>
            <p className="text-[13px] text-toss-gray-500 mb-4">{TASK_DEFS.find(t => t.type === requestPopup.type)?.icon} {TASK_DEFS.find(t => t.type === requestPopup.type)?.label} 요청</p>

            <label className="text-[13px] font-semibold text-toss-gray-700 mb-2 block">담당 직원 선택</label>
            <div className="flex flex-wrap gap-2 mb-5">
              <button onClick={() => setRequestTarget("all")}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${requestTarget === "all" ? "bg-toss-gray-900 text-white" : "bg-toss-gray-100 text-toss-gray-600"}`}>
                전체
              </button>
              {approvedWorkers.filter(w => !w.is_admin).map(w => (
                <button key={w.id} onClick={() => setRequestTarget(w.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${requestTarget === w.id ? "bg-toss-blue text-white" : "bg-toss-gray-100 text-toss-gray-600"}`}>
                  {w.name}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setRequestPopup(null); setRequestTarget("all"); }}
                className="flex-1 py-3 bg-toss-gray-100 text-toss-gray-700 font-semibold rounded-2xl text-[15px]">취소</button>
              <button onClick={handleRequestSend}
                className="flex-1 py-3 bg-toss-blue text-white font-semibold rounded-2xl text-[15px] active:scale-[0.98] transition">요청 보내기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
