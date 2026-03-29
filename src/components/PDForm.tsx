"use client";

import { useState, useEffect, useRef } from "react";
import { Worker, PDLineItem, SettlementSubmission } from "@/types";
import { calculateTax, PD_RATE } from "@/lib/tax";
import MonthPicker from "./MonthPicker";
import FileUpload from "./FileUpload";
import SettlementSummary from "./SettlementSummary";

interface PDFormProps {
  worker: Worker;
  onSubmitSuccess: () => void;
  onDraftSaved?: () => void;
}

const emptyItem = (): PDLineItem => ({
  performer: "",
  filmingDate: "",
  expense: 0,
  receiptUrls: [],
  amount: PD_RATE,
});

export default function PDForm({ worker, onSubmitSuccess, onDraftSaved }: PDFormProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [items, setItems] = useState<PDLineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  // 임시저장 & 자동저장
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const readyRef = useRef(false);
  const monthRef = useRef(month);
  const itemsRef = useRef(items);
  monthRef.current = month;
  itemsRef.current = items;

  const autoSaveKey = `autosave_pd_${worker.id}`;

  // 마운트 시 저장된 데이터 불러오기
  useEffect(() => {
    const loadSaved = async () => {
      let restoredFromLocal = false;

      // localStorage 먼저 확인
      try {
        const raw = localStorage.getItem(autoSaveKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.month && saved.items?.length) {
            setMonth(saved.month);
            setItems(saved.items);
            restoredFromLocal = true;
          }
        }
      } catch {}

      // Supabase 임시저장 확인
      try {
        const res = await fetch(`/api/draft/${worker.id}?role=촬영PD`);
        if (res.ok) {
          const draft = await res.json();
          if (draft) {
            setDraftId(draft.id);
            if (!restoredFromLocal) {
              setMonth(draft.month);
              setItems(draft.items);
              setBanner("임시저장된 정산서를 불러왔어요");
            } else {
              setBanner("이전에 작성 중이던 내용이 복원되었어요");
            }
          } else if (restoredFromLocal) {
            setBanner("이전에 작성 중이던 내용이 복원되었어요");
          }
        } else if (restoredFromLocal) {
          setBanner("이전에 작성 중이던 내용이 복원되었어요");
        }
      } catch {
        if (restoredFromLocal) {
          setBanner("이전에 작성 중이던 내용이 복원되었어요");
        }
      }

      setTimeout(() => {
        readyRef.current = true;
      }, 500);
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

  // localStorage 자동저장 (3초 디바운스)
  useEffect(() => {
    if (!readyRef.current) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          autoSaveKey,
          JSON.stringify({ month, items, savedAt: new Date().toISOString() })
        );
        setAutoSavedAt(new Date());
      } catch {}
    }, 3000);
    return () => clearTimeout(timer);
  }, [month, items, autoSaveKey]);

  // 페이지 이탈 시 즉시 저장
  useEffect(() => {
    const handler = () => {
      if (!readyRef.current) return;
      try {
        localStorage.setItem(
          autoSaveKey,
          JSON.stringify({
            month: monthRef.current,
            items: itemsRef.current,
            savedAt: new Date().toISOString(),
          })
        );
      } catch {}
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [autoSaveKey]);

  const updateItem = (index: number, updates: Partial<PDLineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalWork = items.length * PD_RATE;
  const totalExpense = items.reduce((sum, item) => sum + (item.expense || 0), 0);
  const grandTotal = totalWork + totalExpense;
  const taxResult = calculateTax(grandTotal, worker.contractType);

  const validate = (): string | null => {
    if (!month) return "정산월을 선택해주세요.";
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.performer.trim()) return `${i + 1}번째 항목: 출연자명을 입력해주세요.`;
      if (!item.filmingDate) return `${i + 1}번째 항목: 촬영일을 선택해주세요.`;
      if (item.expense > 0 && item.receiptUrls.length === 0) return `${i + 1}번째 항목: 경비가 있으면 영수증을 첨부해주세요.`;
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
          role: "촬영PD",
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
      localStorage.removeItem(autoSaveKey);
      if (onDraftSaved) {
        onDraftSaved();
        return;
      }
      setBanner("임시저장되었어요");
    } catch {
      alert("임시저장에 실패했습니다.");
    } finally {
      setSavingDraft(false);
    }
  };

  // 제출
  const handleSubmit = async () => {
    const error = validate();
    if (error) { alert(error); return; }
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
      localStorage.removeItem(autoSaveKey);
      onSubmitSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      {banner && (
        <div className="flex items-center justify-between bg-blue-50 text-toss-blue px-4 py-3 rounded-2xl text-[14px]">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} className="text-toss-blue/50 hover:text-toss-blue ml-2 text-[18px] leading-none">&times;</button>
        </div>
      )}

      <MonthPicker value={month} onChange={setMonth} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-toss-gray-900">촬영 내역</h3>
          <span className="text-[13px] text-toss-gray-500">건당 {PD_RATE.toLocaleString()}원</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">출연자</label>
                <input type="text" value={item.performer}
                  onChange={(e) => updateItem(index, { performer: e.target.value })}
                  className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white placeholder:text-toss-gray-400"
                  placeholder="출연자 이름" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">날짜</label>
                <input type="date" value={item.filmingDate}
                  onChange={(e) => updateItem(index, { filmingDate: e.target.value })}
                  className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">경비 (원)</label>
                <input type="number" value={item.expense || ""}
                  onChange={(e) => updateItem(index, { expense: Number(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white placeholder:text-toss-gray-400"
                  placeholder="없으면 비워두세요" min="0" />
              </div>
              <div className="flex items-end pb-1">
                <p className="text-[14px] text-toss-gray-500">
                  금액 <span className="font-bold text-toss-gray-900 text-[16px] ml-1">{PD_RATE.toLocaleString()}원</span>
                </p>
              </div>
            </div>

            {item.expense > 0 && (
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">
                  영수증 첨부 <span className="text-toss-red">*</span>
                </label>
                <FileUpload currentUrls={item.receiptUrls}
                  onUpload={(urls) => updateItem(index, { receiptUrls: urls })} />
              </div>
            )}
          </div>
        ))}

        <button type="button" onClick={addItem}
          className="w-full py-3.5 border-2 border-dashed border-toss-gray-200 rounded-2xl text-toss-gray-400 hover:border-toss-blue hover:text-toss-blue transition-all text-[14px] font-medium">
          + 촬영 건 추가
        </button>
      </div>

      <SettlementSummary totalWork={totalWork} totalExpense={totalExpense}
        contractType={worker.contractType} itemCount={items.length} role="촬영PD" />

      {autoSavedAt && (
        <p className="text-[12px] text-toss-gray-400 text-center">
          자동 저장됨 {autoSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={handleSaveDraft} disabled={savingDraft}
          className="flex-1 py-4 bg-toss-gray-100 text-toss-gray-700 font-semibold rounded-2xl hover:bg-toss-gray-200 disabled:opacity-50 active:scale-[0.98] transition-all text-[16px]">
          {savingDraft ? "저장 중..." : "임시저장"}
        </button>
        <button type="button" onClick={handleSubmit} disabled={submitting}
          className="flex-1 py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover disabled:bg-toss-gray-300 active:scale-[0.98] transition-all text-[16px]">
          {submitting ? "제출 중..." : "정산서 제출"}
        </button>
      </div>
    </div>
  );
}
