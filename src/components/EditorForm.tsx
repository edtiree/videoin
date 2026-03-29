"use client";

import { useState, useEffect } from "react";
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
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [items, setItems] = useState<EditorLineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  // 임시저장 & 자동저장
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

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

        {items.map((item, index) => (
          <div key={index} className="bg-toss-gray-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-toss-blue">#{index + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)}
                  className="text-[13px] text-toss-gray-400 hover:text-toss-red transition">
                  삭제
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">출연자</label>
                <input type="text" value={item.performer}
                  onChange={(e) => updateItem(index, { performer: e.target.value })}
                  className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white placeholder:text-toss-gray-400"
                  placeholder="출연자 이름" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">최종본 영상 링크</label>
                <input type="url" value={item.videoLink}
                  onChange={(e) => updateItem(index, { videoLink: e.target.value })}
                  className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white placeholder:text-toss-gray-400"
                  placeholder="https://youtu.be/..." />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">영상 길이 (분)</label>
                  <input type="number" value={item.videoDuration || ""}
                    onChange={(e) => updateItem(index, { videoDuration: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white placeholder:text-toss-gray-400"
                    placeholder="분 단위" min="1" />
                </div>
                <div className="pb-1">
                  <p className="text-[14px] text-toss-gray-500">
                    금액 <span className="font-bold text-toss-gray-900 text-[16px] ml-1">{item.amount.toLocaleString()}원</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={addItem}
          className="w-full py-3.5 border-2 border-dashed border-toss-gray-200 rounded-2xl text-toss-gray-400 hover:border-toss-blue hover:text-toss-blue transition-all text-[14px] font-medium">
          + 편집 건 추가
        </button>
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
