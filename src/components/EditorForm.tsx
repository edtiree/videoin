"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Worker, EditorLineItem, SettlementSubmission } from "@/types";
import { calculateTax, EDITOR_RATE } from "@/lib/tax";
import MonthPicker from "./MonthPicker";
import SettlementSummary from "./SettlementSummary";
import ConfirmModal from "./ConfirmModal";

interface EditorFormProps {
  worker: Worker;
  onSubmitSuccess: () => void;
  onDraftSaved?: () => void;
  onDeleteDraft?: (draftId: string) => void;
  loadDraft?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialDraft?: any;
}

const emptyItem = (): EditorLineItem => ({
  performer: "", videoLink: "", videoDuration: 0, amount: 0,
});

export default function EditorForm({ worker, onSubmitSuccess, onDraftSaved, onDeleteDraft, loadDraft = true, initialDraft }: EditorFormProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const day = now.getDate() <= 10 ? 10 : 25;
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
  const [items, setItems] = useState<EditorLineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  // 임시저장 & 자동저장
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
    fetch(`/api/notifications?workerId=${worker.id}`)
      .then(r => r.json())
      .then(data => {
        const tasks = (data.notifications || [])
          .filter((n: TaskNotif) => n.type === "editing")
          .filter((n: TaskNotif) => {
            if (!n.deadlineDate) return true;
            const dd = new Date(n.deadlineDate); const now = new Date();
            return Math.round((new Date(dd.getFullYear(), dd.getMonth(), dd.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000) >= 0;
          });
        setTaskNotifs(tasks);
      })
      .catch(() => {});
  }, [worker.id]);

  // 마운트 시 임시저장 불러오기
  useEffect(() => {
    if (!loadDraft) return;
    if (initialDraft) {
      setDraftId(initialDraft.id);
      setMonth(initialDraft.settlement_month?.slice(0, 10) || initialDraft.month || "");
      setItems(initialDraft.items || []);
      return;
    }
    const loadSaved = async () => {
      try {
        const res = await fetch(`/api/draft/${worker.id}?role=편집비`);
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

  const updateItem = (index: number, updates: Partial<EditorLineItem>) => {
    setDirty(true);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...updates };
        // 분/초가 변경되면 반올림/반내림 적용
        if ("videoMinutes" in updates || "videoSeconds" in updates) {
          const mins = updated.videoMinutes ?? 0;
          const secs = updated.videoSeconds ?? 0;
          updated.videoDuration = mins + (secs >= 30 ? 1 : 0);
        }
        updated.amount = updated.videoDuration * EDITOR_RATE;
        return updated;
      })
    );
  };

  const handleMonthChange = (v: string) => { setDirty(true); setMonth(v); };

  const addItem = () => { setDirty(true); setItems((prev) => [...prev, emptyItem()]); };
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalWork = items.reduce((sum, item) => sum + item.amount, 0);
  const totalDuration = items.reduce((sum, item) => sum + item.videoDuration, 0);
  const taxResult = calculateTax(totalWork, worker.contractType);

  const hasContent = items.some((item) => item.performer.trim() || item.videoLink.trim() || item.videoDuration > 0);

  const validate = (): string | null => {
    if (!month) return "정산월을 선택해주세요.";
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.performer.trim()) return `${i + 1}번째 항목: 출연자명을 입력해주세요.`;
      if (!item.videoLink.trim()) return `${i + 1}번째 항목: 최종본 영상 링크를 입력해주세요.`;
      if (!item.videoDuration || item.videoDuration <= 0) return `${i + 1}번째 항목: 영상 길이를 입력해주세요.`;
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
          role: "편집비",
          contractType: worker.contractType,
          settlementMonth: month,
          items,
          totalAmount: totalWork,
          totalExpense: 0,
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
        totalAmount: totalWork, totalExpense: 0, tax: taxResult.tax, finalAmount: taxResult.finalAmount,
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
          <h3 className="text-[16px] font-bold text-toss-gray-900">편집 내역</h3>
          <span className="text-[13px] text-toss-gray-500">분당 {EDITOR_RATE.toLocaleString()}원</span>
        </div>

        {/* 요청된 작업 */}
        {taskNotifs.length > 0 ? (
          <>
            {taskNotifs.filter(t => !items.some(item => item.notificationId === t.id)).length > 0 && (
              <div className="space-y-1.5">
                {taskNotifs.filter(t => !items.some(item => item.notificationId === t.id)).map(task => (
                  <button key={task.id} type="button"
                    onClick={() => {
                      setDirty(true);
                      const newItem: EditorLineItem = { performer: task.title, videoLink: "", videoDuration: 0, amount: 0, notificationId: task.id };
                      setItems(prev => prev.length === 1 && !prev[0].performer ? [newItem] : [...prev, newItem]);
                    }}
                    className="w-full flex items-center gap-3 p-4 bg-toss-gray-50 rounded-2xl hover:bg-blue-50/30 active:scale-[0.98] transition-all text-left">
                    <span className="px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 bg-green-50 text-toss-green">편집</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-toss-gray-900">{task.title}</p>
                      <p className="text-[12px] text-toss-gray-400 mt-0.5">업로드 {task.deadlineDate ? new Date(task.deadlineDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "일정 미정"}</p>
                    </div>
                    <span className="text-[13px] text-toss-blue font-semibold shrink-0">+ 추가</span>
                  </button>
                ))}
              </div>
            )}

            {/* 추가된 작업 요청 항목 */}
            {items.filter(item => item.notificationId).map((item) => {
              const index = items.indexOf(item);
              const task = taskNotifs.find(t => t.id === item.notificationId);
              return (
                <div key={index} className="bg-blue-50/40 border border-toss-blue/20 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-green-50 text-toss-green">편집</span>
                      <p className="text-[15px] font-bold text-toss-gray-900">{item.performer}</p>
                    </div>
                    <button type="button" onClick={() => removeItem(index)} className="text-[13px] text-toss-gray-400 hover:text-toss-red transition">삭제</button>
                  </div>
                  <p className="text-[13px] text-toss-gray-500">업로드 {task?.deadlineDate ? new Date(task.deadlineDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "일정 미정"}</p>
                  <div>
                    <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">최종본 영상 링크</label>
                    <input type="url" value={item.videoLink} onChange={(e) => updateItem(index, { videoLink: e.target.value })}
                      className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white placeholder:text-toss-gray-400"
                      placeholder="https://youtu.be/..." />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">영상 길이</label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 flex items-center gap-1.5">
                        <input type="text" inputMode="numeric" value={item.videoMinutes ?? item.videoDuration ?? ""}
                          onChange={(e) => updateItem(index, { videoMinutes: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                          className="w-full rounded-xl border border-toss-gray-200 px-3 py-2 text-[14px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white text-center" placeholder="0" />
                        <span className="text-[14px] text-toss-gray-500 shrink-0">분</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1.5">
                        <input type="text" inputMode="numeric" value={item.videoSeconds ?? ""}
                          onChange={(e) => { let sec = Number(e.target.value.replace(/\D/g, "")) || 0; if (sec > 59) sec = 59; updateItem(index, { videoSeconds: sec }); }}
                          className="w-full rounded-xl border border-toss-gray-200 px-3 py-2 text-[14px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white text-center" placeholder="0" />
                        <span className="text-[14px] text-toss-gray-500 shrink-0">초</span>
                      </div>
                    </div>
                    {(item.videoSeconds ?? 0) > 0 && (
                      <p className="text-[12px] text-toss-gray-400 mt-1.5">{(item.videoSeconds ?? 0) >= 30 ? "반올림" : "반내림"} → 정산 <span className="font-bold text-toss-gray-700">{item.videoDuration}분</span></p>
                    )}
                  </div>
                  <p className="text-[14px] text-toss-gray-500">금액 <span className="font-bold text-toss-gray-900 text-[16px] ml-1">{item.amount.toLocaleString()}원</span></p>
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
        {items.filter(item => !item.notificationId && item.performer).map((item) => {
          const index = items.indexOf(item);
          return (
            <div key={`manual-${index}`} className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[11px] font-bold">수동</span>
                  <p className="text-[15px] font-bold text-toss-gray-900">{item.performer}</p>
                </div>
                <button type="button" onClick={() => removeItem(index)} className="text-[13px] text-toss-gray-400 hover:text-toss-red transition">삭제</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">출연자</label>
                  <input type="text" value={item.performer} onChange={(e) => updateItem(index, { performer: e.target.value })}
                    className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white placeholder:text-toss-gray-400" placeholder="출연자 이름" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">최종본 영상 링크</label>
                  <input type="url" value={item.videoLink} onChange={(e) => updateItem(index, { videoLink: e.target.value })}
                    className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white placeholder:text-toss-gray-400" placeholder="https://youtu.be/..." />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">영상 길이</label>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 flex items-center gap-1.5">
                      <input type="text" inputMode="numeric" value={item.videoMinutes ?? item.videoDuration ?? ""}
                        onChange={(e) => updateItem(index, { videoMinutes: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                        className="w-full rounded-xl border border-toss-gray-200 px-3 py-2 text-[14px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white text-center" placeholder="0" />
                      <span className="text-[14px] text-toss-gray-500 shrink-0">분</span>
                    </div>
                    <div className="flex-1 flex items-center gap-1.5">
                      <input type="text" inputMode="numeric" value={item.videoSeconds ?? ""}
                        onChange={(e) => { let sec = Number(e.target.value.replace(/\D/g, "")) || 0; if (sec > 59) sec = 59; updateItem(index, { videoSeconds: sec }); }}
                        className="w-full rounded-xl border border-toss-gray-200 px-3 py-2 text-[14px] text-toss-gray-900 focus:border-toss-blue outline-none bg-white text-center" placeholder="0" />
                      <span className="text-[14px] text-toss-gray-500 shrink-0">초</span>
                    </div>
                  </div>
                </div>
                <p className="text-[14px] text-toss-gray-500">금액 <span className="font-bold text-toss-gray-900 text-[16px] ml-1">{item.amount.toLocaleString()}원</span></p>
              </div>
            </div>
          );
        })}

        {/* 수동 추가 버튼 */}
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
        <SettlementSummary totalWork={totalWork} totalExpense={0}
          contractType={worker.contractType} itemCount={items.length} role="편집비" totalDuration={totalDuration} />
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
