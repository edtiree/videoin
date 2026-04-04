"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";

const REASONS = [
  "허위/사기 공고",
  "부적절한 내용",
  "스팸/광고",
  "개인정보 노출",
  "기타",
];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: "job" | "profile" | "review" | "message";
  targetId: string;
}

export default function ReportModal({ open, onClose, targetType, targetId }: ReportModalProps) {
  const { profile } = useAuth();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reason || !profile) return;
    setSaving(true);

    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter_id: profile.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim() || null,
      }),
    });

    setSaving(false);
    setDone(true);
    setTimeout(() => { onClose(); setDone(false); setReason(""); setDescription(""); }, 1500);
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[var(--surface)] w-full md:w-[400px] md:rounded-2xl rounded-t-2xl p-6 pb-[env(safe-area-inset-bottom,24px)] animate-slide-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-toss-gray-400 p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {done ? (
          <div className="text-center py-8">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-green mx-auto mb-3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            <p className="text-[16px] font-semibold text-toss-gray-900">신고가 접수되었습니다</p>
          </div>
        ) : (
          <>
            <h2 className="text-[18px] font-bold text-toss-gray-900 mb-4 mt-1">신고하기</h2>
            <div className="space-y-2 mb-4">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[14px] transition ${
                    reason === r ? "bg-toss-blue text-white" : "bg-toss-gray-50 text-toss-gray-700 hover:bg-toss-gray-100"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="상세 내용 (선택)"
              rows={3}
              className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[14px] mb-4 resize-none focus:outline-none focus:border-toss-blue"
            />
            <button
              onClick={handleSubmit}
              disabled={!reason || saving}
              className="w-full h-[48px] rounded-xl bg-toss-red text-white font-semibold text-[14px] disabled:opacity-50 transition"
            >
              {saving ? "접수 중..." : "신고 접수"}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modal, document.body) : null;
}
