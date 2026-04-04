"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Worker, PDLineItem, SettlementSubmission } from "@/types";
import { calculateTax, PD_RATE } from "@/lib/tax";
import MonthPicker from "./MonthPicker";
import FileUpload from "./FileUpload";
import DatePickerButton from "./DatePickerButton";
import SettlementSummary from "./SettlementSummary";
import ConfirmModal from "./ConfirmModal";

interface PDFormProps {
  worker: Worker;
  onSubmitSuccess: () => void;
  onDraftSaved?: () => void;
  onDeleteDraft?: (draftId: string) => void;
  loadDraft?: boolean;
  rate?: number;
  roleName?: string;
  formTitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialDraft?: any;
}

export default function PDForm({ worker, onSubmitSuccess, onDraftSaved, onDeleteDraft, loadDraft = true, rate = PD_RATE, roleName = "촬영비", formTitle = "촬영 내역", initialDraft }: PDFormProps) {
  const isFilming = roleName === "촬영비";
  const emptyItem = (): PDLineItem => ({
    performer: "", filmingDate: "", expense: 0, receiptUrls: [], amount: rate,
    ...(isFilming ? {} : { quantity: 1 }),
  });
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const day = now.getDate() <= 10 ? 10 : 25;
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
  const [items, setItems] = useState<PDLineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  // 임시저장
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);

  // 작업 요청 목록
  interface TaskNotif { id: string; title: string; deadlineDate: string | null; type: string; }
  const [taskNotifs, setTaskNotifs] = useState<TaskNotif[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  useEffect(() => {
    const notifType = roleName === "촬영비" ? "filming" : roleName === "숏폼" ? "shorts" : roleName === "카드뉴스" ? "cardnews" : "editing";
    fetch(`/api/notifications?workerId=${worker.id}`)
      .then(r => r.json())
      .then(data => {
        const tasks = (data.notifications || [])
          .filter((n: TaskNotif) => n.type === notifType)
          .filter((n: TaskNotif) => {
            if (!n.deadlineDate) return true;
            const dd = new Date(n.deadlineDate); const now = new Date();
            return Math.round((new Date(dd.getFullYear(), dd.getMonth(), dd.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000) >= 0;
          });
        setTaskNotifs(tasks);
      })
      .catch(() => {});
  }, [worker.id, isFilming]);

  // 마운트 시 임시저장 불러오기
  useEffect(() => {
    if (!loadDraft) return;
    // 캐시된 데이터가 있으면 즉시 사용
    if (initialDraft) {
      setDraftId(initialDraft.id);
      setMonth(initialDraft.settlement_month?.slice(0, 10) || initialDraft.month || "");
      setItems(initialDraft.items || []);
      return;
    }
    // 없으면 API 호출
    const loadSaved = async () => {
      try {
        const res = await fetch(`/api/draft/${worker.id}?role=${encodeURIComponent(roleName)}`);
        if (res.ok) {
          const draft = await res.json();
          if (draft) { setDraftId(draft.id); setMonth(draft.month); setItems(draft.items); }
        }
      } catch {}
    };
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 배너 자동 닫기
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(timer);
  }, [banner]);

  const updateItem = (index: number, updates: Partial<PDLineItem>) => {
    setDirty(true);
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleMonthChange = (v: string) => { setDirty(true); setMonth(v); };

  const addItem = () => { setDirty(true); setItems((prev) => [...prev, emptyItem()]); };
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalWork = isFilming
    ? items.length * rate
    : items.reduce((sum, item) => sum + (item.quantity || 1) * rate, 0);
  const totalExpense = isFilming ? items.reduce((sum, item) => sum + (item.expense || 0), 0) : 0;
  const grandTotal = totalWork + totalExpense;
  const taxResult = calculateTax(grandTotal, worker.contractType);

  const hasContent = items.some((item) => item.performer.trim() || item.filmingDate);

  const validate = (): string | null => {
    if (!month) return "정산월을 선택해주세요.";
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.performer.trim()) return `${i + 1}번째 항목: 출연자명을 입력해주세요.`;
      if (isFilming && !item.filmingDate) return `${i + 1}번째 항목: 촬영일을 선택해주세요.`;
      if (isFilming && item.expense > 0 && item.receiptUrls.length === 0) return `${i + 1}번째 항목: 경비가 있으면 영수증을 첨부해주세요.`;
      if (!isFilming && (!item.quantity || item.quantity < 1)) return `${i + 1}번째 항목: 편수를 입력해주세요.`;
    }
    return null;
  };

  // 임시저장
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          workerId: worker.id,
          workerName: worker.name,
          role: roleName,
          contractType: worker.contractType,
          settlementMonth: month,
          items,
          totalAmount: grandTotal,
          totalExpense,
          tax: taxResult.tax,
          finalAmount: taxResult.finalAmount,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDraftId(data.id);
      setDirty(false);
      if (onDraftSaved) {
        onDraftSaved();
        return;
      }
      setBanner("임시저장되었어요");
    } catch {
      setAlertMsg("임시저장에 실패했습니다.");
    } finally {
      setSavingDraft(false);
    }
  };

  // 제출
  const handleSubmit = async () => {
    const error = validate();
    if (error) { setAlertMsg(error); return; }
    setSubmitting(true);
    try {
      const submission: SettlementSubmission & { draftId?: string | null } = {
        workerId: worker.id, workerName: worker.name, role: worker.role,
        contractType: worker.contractType, settlementMonth: month, items,
        totalAmount: grandTotal, totalExpense, tax: taxResult.tax, finalAmount: taxResult.finalAmount,
        draftId,
      };
      const res = await fetch("/api/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "제출 실패"); }
      onSubmitSuccess();
    } catch (err) {
      setAlertMsg(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6" data-dirty={dirty ? "true" : "false"}>
      {banner && (
        <div className="flex items-center justify-between bg-blue-50 text-toss-blue px-4 py-3 rounded-2xl text-[14px]">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} className="text-toss-blue/50 hover:text-toss-blue ml-2 text-[18px] leading-none">&times;</button>
        </div>
      )}

      <MonthPicker value={month} onChange={handleMonthChange} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-toss-gray-900">{formTitle}</h3>
          <span className="text-[13px] text-toss-gray-500">{isFilming ? "건당" : "편당"} {rate.toLocaleString()}원</span>
        </div>

        {/* 요청된 작업 목록 */}
        {taskNotifs.length > 0 ? (
          <>
            {/* 미추가 작업 */}
            {taskNotifs.filter(t => !items.some(item => item.notificationId === t.id)).length > 0 && (
              <div className="space-y-1.5">
                {taskNotifs.filter(t => !items.some(item => item.notificationId === t.id)).map(task => (
                  <button key={task.id} type="button"
                    onClick={() => {
                      setDirty(true);
                      const newItem: PDLineItem = {
                        performer: task.title,
                        filmingDate: isFilming ? (task.deadlineDate || "") : "",
                        expense: 0, receiptUrls: [], amount: rate,
                        notificationId: task.id,
                        ...(isFilming ? {} : { quantity: 1 }),
                      };
                      setItems(prev => prev.length === 1 && !prev[0].performer ? [newItem] : [...prev, newItem]);
                    }}
                    className="w-full flex items-center gap-3 p-4 bg-toss-gray-50 rounded-2xl hover:bg-blue-50/30 active:scale-[0.98] transition-all text-left">
                    <span className={`px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 ${
                      task.type === "filming" ? "bg-blue-50 text-toss-blue" : task.type === "editing" ? "bg-green-50 text-toss-green" : task.type === "shorts" ? "bg-amber-50 text-amber-600" : "bg-pink-50 text-pink-600"
                    }`}>{task.type === "filming" ? "촬영" : task.type === "editing" ? "편집" : task.type === "shorts" ? "쇼츠" : "카드뉴스"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-toss-gray-900">{task.title}</p>
                      <p className="text-[12px] text-toss-gray-400 mt-0.5">업로드 {task.deadlineDate ? new Date(task.deadlineDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "일정 미정"}</p>
                    </div>
                    <span className="text-[13px] text-toss-blue font-semibold shrink-0">+ 추가</span>
                  </button>
                ))}
              </div>
            )}

            {/* 추가된 항목 — 작업 요청 건 */}
            {items.filter(item => item.notificationId).map((item, _idx) => {
              const index = items.indexOf(item);
              const task = taskNotifs.find(t => t.id === item.notificationId);
              return (
                <div key={index} className="bg-blue-50/40 border border-toss-blue/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                        task?.type === "filming" ? "bg-blue-50 text-toss-blue" : task?.type === "editing" ? "bg-green-50 text-toss-green" : task?.type === "shorts" ? "bg-amber-50 text-amber-600" : "bg-pink-50 text-pink-600"
                      }`}>{task?.type === "filming" ? "촬영" : task?.type === "editing" ? "편집" : task?.type === "shorts" ? "쇼츠" : "카드뉴스"}</span>
                      <p className="text-[15px] font-bold text-toss-gray-900">{item.performer}</p>
                    </div>
                    <button type="button" onClick={() => removeItem(index)}
                      className="text-[13px] text-toss-gray-400 hover:text-toss-red transition">삭제</button>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-toss-gray-500">업로드 {task?.deadlineDate ? new Date(task.deadlineDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "일정 미정"}</span>
                    <span className="font-bold text-toss-gray-900">{isFilming ? rate.toLocaleString() : ((item.quantity || 1) * rate).toLocaleString()}원</span>
                  </div>
                  {/* 경비 — 촬영만 */}
                  {isFilming && (
                    <div className="flex items-center gap-3">
                      <label className="text-[13px] text-toss-gray-500 shrink-0">경비</label>
                      <input type="text" inputMode="numeric" value={item.expense ? item.expense.toLocaleString() : ""}
                        onChange={(e) => updateItem(index, { expense: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                        className="flex-1 rounded-xl border border-toss-gray-200 px-3 py-2 text-[14px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white placeholder:text-toss-gray-400"
                        placeholder="0원" />
                    </div>
                  )}
                  {isFilming && item.expense > 0 && (
                    <div>
                      <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">영수증 첨부 <span className="text-toss-red">*</span></label>
                      <FileUpload currentUrls={item.receiptUrls} onUpload={(urls) => updateItem(index, { receiptUrls: urls })} />
                    </div>
                  )}
                  {/* 편수 — 쇼츠/카드뉴스만 */}
                  {!isFilming && (
                    <div className="flex items-center gap-3">
                      <label className="text-[13px] text-toss-gray-500 shrink-0">편수</label>
                      <input type="text" inputMode="numeric" value={item.quantity || ""}
                        onChange={(e) => { const qty = Number(e.target.value.replace(/\D/g, "")) || 0; updateItem(index, { quantity: qty, amount: qty * rate }); }}
                        className="w-20 rounded-xl border border-toss-gray-200 px-3 py-2 text-[14px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white text-center"
                        placeholder="1" />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <div className="text-center py-8 bg-toss-gray-50 rounded-2xl">
            <p className="text-[14px] text-toss-gray-500">정산할 내역이 없습니다</p>
            <p className="text-[12px] text-toss-gray-400 mt-1">관리자가 작업을 요청하면 여기에 표시됩니다</p>
          </div>
        )}

        {/* 수동 추가 항목 */}
        {items.filter(item => !item.notificationId && item.performer).map((item, _idx) => {
          const index = items.indexOf(item);
          return (
            <div key={`manual-${index}`} className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[11px] font-bold">수동</span>
                  <p className="text-[15px] font-bold text-toss-gray-900">{item.performer}</p>
                </div>
                <button type="button" onClick={() => removeItem(index)}
                  className="text-[13px] text-toss-gray-400 hover:text-toss-red transition">삭제</button>
              </div>
              {isFilming ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">출연자</label>
                      <input type="text" value={item.performer} onChange={(e) => updateItem(index, { performer: e.target.value })}
                        className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white placeholder:text-toss-gray-400"
                        placeholder="출연자 이름" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">촬영 일정</label>
                      <DatePickerButton value={item.filmingDate} placeholder="촬영일 선택" onChange={(v) => updateItem(index, { filmingDate: v })} />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">경비 (원)</label>
                      <input type="text" inputMode="numeric" value={item.expense ? item.expense.toLocaleString() : ""}
                        onChange={(e) => updateItem(index, { expense: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                        className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white placeholder:text-toss-gray-400"
                        placeholder="0" />
                    </div>
                    <div className="flex items-end pb-1">
                      <p className="text-[14px] text-toss-gray-500">금액 <span className="font-bold text-toss-gray-900 text-[16px] ml-1">{rate.toLocaleString()}원</span></p>
                    </div>
                  </div>
                  {item.expense > 0 && (
                    <div>
                      <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">영수증 첨부 <span className="text-toss-red">*</span></label>
                      <FileUpload currentUrls={item.receiptUrls} onUpload={(urls) => updateItem(index, { receiptUrls: urls })} />
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">출연자</label>
                    <input type="text" value={item.performer} onChange={(e) => updateItem(index, { performer: e.target.value })}
                      className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white placeholder:text-toss-gray-400"
                      placeholder="출연자 이름" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">편수</label>
                    <input type="text" inputMode="numeric" value={item.quantity || ""}
                      onChange={(e) => { const qty = Number(e.target.value.replace(/\D/g, "")) || 0; updateItem(index, { quantity: qty, amount: qty * rate }); }}
                      className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white placeholder:text-toss-gray-400"
                      placeholder="1" />
                  </div>
                  <div className="flex items-end pb-1">
                    <p className="text-[14px] text-toss-gray-500">금액 <span className="font-bold text-toss-gray-900 text-[16px] ml-1">{((item.quantity || 1) * rate).toLocaleString()}원</span></p>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 수동 추가 버튼 — 접힌 상태로 */}
        {!showManualAdd ? (
          <button type="button" onClick={() => setShowManualAdd(true)}
            className="w-full py-3 text-[13px] text-toss-gray-400 hover:text-amber-600 transition">
            수동으로 추가하기
          </button>
        ) : (
          <div className="space-y-2">
            <button type="button" onClick={() => { addItem(); setShowManualAdd(false); }}
              className="w-full py-3.5 border-2 border-dashed border-amber-300 rounded-2xl text-amber-600 hover:bg-amber-50/30 transition-all text-[14px] font-medium">
              + 수동 추가
            </button>
            <button type="button" onClick={() => setShowManualAdd(false)}
              className="w-full py-2 text-[12px] text-toss-gray-400">닫기</button>
          </div>
        )}
      </div>

      {hasContent && (
        <SettlementSummary totalWork={totalWork} totalExpense={totalExpense}
          contractType={worker.contractType}
          itemCount={isFilming ? items.length : items.reduce((sum, item) => sum + (item.quantity || 1), 0)}
          role={roleName} />
      )}

      <div className="space-y-3">
        <div className="flex gap-3">
          <button id="btn-draft-save" type="button" onClick={handleSaveDraft} disabled={savingDraft || !hasContent}
            className="flex-1 py-4 bg-toss-gray-100 text-toss-gray-700 font-semibold rounded-2xl hover:bg-toss-gray-200 disabled:opacity-50 active:scale-[0.98] transition-all text-[16px]">
            {savingDraft ? "저장 중..." : "임시저장"}
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting || !hasContent}
            className="flex-1 py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover disabled:bg-toss-gray-300 active:scale-[0.98] transition-all text-[16px]">
            {submitting ? "제출 중..." : "정산서 제출"}
          </button>
        </div>
        {draftId && onDeleteDraft && (
          <button type="button" onClick={() => onDeleteDraft(draftId)}
            className="w-full py-4 bg-red-50 text-toss-red font-semibold rounded-2xl hover:bg-red-100 active:scale-[0.98] transition-all text-[16px]">
            임시저장 삭제
          </button>
        )}
      </div>

      {alertMsg && (
        <ConfirmModal title="알림" message={alertMsg} confirmText="확인" onConfirm={() => setAlertMsg(null)} />
      )}

    </div>
  );
}
