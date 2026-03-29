"use client";

import { useEffect, useState } from "react";
import { getRoleLabel } from "@/lib/tax";
import ConfirmModal from "./ConfirmModal";

interface SettlementRecord {
  id: string;
  settlement_month: string;
  role: string;
  contract_type: string;
  total_amount: number;
  total_expense: number;
  tax: number;
  final_amount: number;
  status: string;
  created_at: string;
  items: SettlementItem[];
  tax_invoice_issued?: boolean;
}

interface SettlementItem {
  performer: string;
  youtubeChannel?: string;
  filmingDate?: string;
  expense?: number;
  receiptUrls?: string[];
  videoLink?: string;
  videoDuration?: number;
  amount: number;
}

interface SettlementHistoryProps {
  workerId: string;
  role: string;
  contractType: string;
  refreshKey: number;
  onResumeDraft?: (role: string) => void;
  initialData?: SettlementRecord[] | null;
}

export default function SettlementHistory({ workerId, role, contractType, refreshKey, onResumeDraft, initialData }: SettlementHistoryProps) {
  const [settlements, setSettlements] = useState<SettlementRecord[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setSettlements(initialData);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/settlements/${workerId}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data: SettlementRecord[]) => setSettlements(data.filter((s) => s.status !== "임시저장")))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workerId, refreshKey, initialData]);

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}.${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const statusStyle: Record<string, string> = {
    "임시저장": "bg-toss-gray-100 text-toss-gray-500",
    "제출됨": "bg-amber-50 text-amber-600",
    "확인됨": "bg-blue-50 text-toss-blue",
    "정산완료": "bg-green-50 text-toss-green",
  };

  const handleCancel = async (settlementId: string) => {
    setCancellingId(settlementId);
    try {
      const res = await fetch("/api/settlements/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId, workerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "취소 실패");
      }
      setSettlements((prev) => prev.filter((s) => s.id !== settlementId));
      setExpandedId(null);
    } catch (err) {
      setAlertMsg(err instanceof Error ? err.message : "취소 중 오류가 발생했습니다.");
    } finally {
      setCancellingId(null);
    }
  };

  const isFreelancer = contractType === "프리랜서";

  if (loading) {
    return <div className="text-center py-12 text-toss-gray-400 text-[14px]">불러오는 중...</div>;
  }
  if (settlements.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-toss-gray-300 text-4xl mb-3">📋</div>
        <p className="text-toss-gray-400 text-[14px]">제출된 정산서가 없어요</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((s) => {
        const isExpanded = expandedId === s.id;
        return (
          <div key={s.id} className="bg-white border border-toss-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <button onClick={() => setExpandedId(isExpanded ? null : s.id)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-toss-gray-50 transition">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-bold text-toss-gray-900">{formatMonth(s.settlement_month)}</span>
                <span className="px-1.5 py-0.5 bg-toss-gray-100 text-toss-gray-600 rounded text-[11px] font-bold">
                  {getRoleLabel(s.role)}
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${statusStyle[s.status] || "bg-toss-gray-100 text-toss-gray-600"}`}>
                  {s.status}
                </span>
                {s.contract_type === "사업자" && s.status !== "임시저장" && (
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${s.tax_invoice_issued ? "bg-green-50 text-green-600" : "bg-red-50 text-toss-red"}`}>
                    {s.tax_invoice_issued ? "계산서 ✓" : "계산서 ✗"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {s.status === "임시저장" && onResumeDraft && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onResumeDraft(s.role); }}
                    className="px-3 py-1.5 bg-toss-blue text-white text-[12px] font-semibold rounded-lg hover:bg-toss-blue-hover transition">
                    이어 작성
                  </button>
                )}
                <span className="text-[16px] font-bold text-toss-blue">{s.final_amount.toLocaleString()}원</span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-toss-gray-100 px-5 py-5 bg-toss-gray-50 space-y-4">
                <div className="space-y-2.5 text-[14px]">
                  <SummaryRow label={getRoleLabel(s.role)} value={`${(s.total_amount - s.total_expense).toLocaleString()}원`} />
                  {s.total_expense > 0 && <SummaryRow label="경비" value={`${s.total_expense.toLocaleString()}원`} />}
                  <SummaryRow label="총액" value={`${s.total_amount.toLocaleString()}원`} />
                  <SummaryRow label={isFreelancer ? "원천징수(3.3%)" : "부가세(10%)"}
                    value={`${isFreelancer ? "-" : "+"}${s.tax.toLocaleString()}원`}
                    valueColor={isFreelancer ? "text-toss-red" : "text-toss-blue"} />
                  <div className="border-t border-toss-gray-200 pt-2.5 flex justify-between">
                    <span className="font-bold text-toss-gray-900">{isFreelancer ? "실수령액" : "총 청구액"}</span>
                    <span className="font-bold text-toss-blue text-[16px]">{s.final_amount.toLocaleString()}원</span>
                  </div>
                </div>

                {s.contract_type === "사업자" && s.status !== "임시저장" && (
                  <div className="flex items-center justify-between bg-white rounded-xl p-3.5 border border-toss-gray-100">
                    <div>
                      <span className="text-[14px] font-semibold text-toss-gray-900">세금계산서</span>
                      <span className="text-[12px] text-toss-gray-400 ml-2">{s.tax_invoice_issued ? "발행 완료" : "미발행"}</span>
                    </div>
                    <button onClick={async () => {
                      const next = !s.tax_invoice_issued;
                      setSettlements(prev => prev.map(x => x.id === s.id ? { ...x, tax_invoice_issued: next } : x));
                      await fetch("/api/settlements/tax-invoice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settlementId: s.id, issued: next }) });
                    }}
                      className={`w-11 h-6 rounded-full transition-all relative ${s.tax_invoice_issued ? "bg-toss-blue" : "bg-toss-gray-200"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${s.tax_invoice_issued ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-[12px] font-bold text-toss-gray-400 uppercase tracking-wider">상세 내역</h4>
                  {s.items.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3.5 border border-toss-gray-100">
                      <div className="flex justify-between items-start">
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
                          {item.videoLink && (
                            <> · <a href={item.videoLink} target="_blank" rel="noopener noreferrer" className="text-toss-blue hover:underline">영상 링크</a></>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  {s.status === "제출됨" && (
                    <button
                      onClick={() => setCancelTarget(s.id)}
                      disabled={cancellingId === s.id}
                      className="px-4 py-2 text-[13px] font-semibold text-toss-red bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50 transition">
                      {cancellingId === s.id ? "취소 중..." : "제출 취소"}
                    </button>
                  )}
                  <p className="text-[12px] text-toss-gray-400 text-right flex-1">제출 {formatDate(s.created_at)}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {alertMsg && (
        <ConfirmModal title="알림" message={alertMsg} confirmText="확인" onConfirm={() => setAlertMsg(null)} />
      )}

      {cancelTarget && (
        <ConfirmModal
          title="정산서를 취소할까요?"
          message="취소하면 삭제되며 복구할 수 없습니다."
          confirmText="취소하기"
          cancelText="돌아가기"
          confirmColor="red"
          onConfirm={() => { handleCancel(cancelTarget); setCancelTarget(null); }}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-toss-gray-600">{label}</span>
      <span className={`font-semibold ${valueColor || "text-toss-gray-900"}`}>{value}</span>
    </div>
  );
}
