"use client";

import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface DatePickerButtonProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function DatePickerButton({ value, onChange, placeholder = "날짜를 선택하세요" }: DatePickerButtonProps) {
  const [open, setOpen] = useState(false);

  const now = new Date();
  const parts = value ? value.split("-") : [];
  const selectedYear = parts.length >= 1 ? parseInt(parts[0]) : now.getFullYear();
  const selectedMonth = parts.length >= 2 ? parseInt(parts[1]) : now.getMonth() + 1;
  const selectedDay = parts.length >= 3 ? parseInt(parts[2]) : null;

  const [viewYear, setViewYear] = useState(selectedYear);
  const [viewMonth, setViewMonth] = useState(selectedMonth);
  const [showYearMonth, setShowYearMonth] = useState(false);
  const [tempDay, setTempDay] = useState<number | null>(null);
  const [pickerYear, setPickerYear] = useState(selectedYear);
  const [pickerMonth, setPickerMonth] = useState(selectedMonth);
  const yearScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const monthScrollTimer = useRef<NodeJS.Timeout | null>(null);

  const ITEM_H = 44;
  const YEARS = Array.from({ length: 20 }, (_, i) => 2020 + i);
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

  const haptic = useCallback(() => {
    try {
      if (navigator.vibrate) { navigator.vibrate(1); return; }
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.01;
      osc.frequency.value = 1000;
      osc.start();
      osc.stop(ctx.currentTime + 0.003);
    } catch {}
  }, []);

  const handleYearScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.target as HTMLDivElement;
    const idx = Math.round(el.scrollTop / ITEM_H);
    if (idx >= 0 && idx < YEARS.length) {
      setPickerYear(prev => { if (prev !== YEARS[idx]) haptic(); return YEARS[idx]; });
    }
  }, [haptic]);

  const handleMonthScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.target as HTMLDivElement;
    const idx = Math.round(el.scrollTop / ITEM_H);
    if (idx >= 0 && idx < MONTHS.length) {
      setPickerMonth(prev => { if (prev !== MONTHS[idx]) haptic(); return MONTHS[idx]; });
    }
  }, [haptic]);

  const handleOpen = () => {
    setViewYear(selectedYear);
    setViewMonth(selectedMonth);
    setShowYearMonth(false);
    setTempDay(selectedDay);
    setOpen(true);
  };

  const handleConfirm = () => {
    if (tempDay) {
      onChange(`${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(tempDay).padStart(2, "0")}`);
    }
    setOpen(false);
  };

  const prevMonth = () => {
    setTempDay(null);
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    setTempDay(null);
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  };

  const displayValue = value && selectedDay
    ? `${selectedYear}년 ${selectedMonth}월 ${selectedDay}일`
    : "";

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth && today.getDate() === d;
  const isTempSelected = (d: number) => tempDay === d;
  const isOriginalSelected = (d: number) => selectedDay === d && selectedYear === viewYear && selectedMonth === viewMonth && tempDay === null;

  const days: (number | null)[] = [];
  for (let i = 0; i < getFirstDayOfMonth(viewYear, viewMonth); i++) days.push(null);
  for (let d = 1; d <= getDaysInMonth(viewYear, viewMonth); d++) days.push(d);

  return (
    <>
      <button type="button" onClick={handleOpen}
        className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-left text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white flex items-center justify-between">
        <span>{displayValue || <span className="text-toss-gray-400">{placeholder}</span>}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-toss-gray-400 shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-xl animate-slide-up pb-[env(safe-area-inset-bottom,0px)] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h3 className="text-[18px] font-bold text-toss-gray-900">날짜 선택</h3>
              <button type="button" onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-gray-400 text-[20px]">
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between px-6 mb-4 shrink-0">
              <button type="button" onClick={() => { setPickerYear(viewYear); setPickerMonth(viewMonth); setShowYearMonth(true); }}
                className="text-[17px] font-bold text-toss-blue flex items-center gap-1">
                {viewYear}년 {viewMonth}월
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-blue text-[16px] font-bold">‹</button>
                <button type="button" onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-blue text-[16px] font-bold">›</button>
              </div>
            </div>

            <div className="px-6 overflow-y-auto flex-1 min-h-0">
                <>
                  <div className="grid grid-cols-7 mb-2">
                    {DAY_LABELS.map((l, i) => (
                      <div key={l} className={`text-center text-[13px] font-medium py-2 ${
                        i === 0 ? "text-toss-red" : i === 6 ? "text-toss-blue" : "text-toss-gray-400"
                      }`}>{l}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {days.map((day, idx) => (
                      day === null ? <div key={idx} /> : (
                        <button key={idx} type="button" onClick={() => setTempDay(day)}
                          className="flex items-center justify-center py-2">
                          <span className={`w-10 h-10 flex items-center justify-center rounded-full text-[16px] transition-all ${
                            isTempSelected(day)
                              ? "bg-toss-blue text-white font-bold"
                              : isOriginalSelected(day)
                              ? "bg-toss-blue/20 text-toss-blue font-bold"
                              : isToday(day)
                              ? "bg-blue-50 text-toss-blue font-bold"
                              : "text-toss-gray-800 hover:bg-toss-gray-100 active:bg-toss-blue active:text-white"
                          }`}>{day}</span>
                        </button>
                      )
                    ))}
                  </div>
                </>
            </div>

            <div className="px-6 pt-4 pb-6 shrink-0">
              <button type="button" onClick={handleConfirm}
                disabled={!tempDay}
                className={`w-full py-4 rounded-2xl text-[16px] font-semibold transition-all ${
                  tempDay
                    ? "bg-toss-blue text-white active:scale-[0.98]"
                    : "bg-toss-gray-200 text-toss-gray-400"
                }`}>
                {tempDay
                  ? `${viewYear}년 ${viewMonth}월 ${tempDay}일 선택 완료`
                  : "날짜를 선택해주세요"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showYearMonth && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-end justify-center" onClick={() => setShowYearMonth(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-xl animate-slide-up pb-[env(safe-area-inset-bottom,0px)]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h3 className="text-[18px] font-bold text-toss-gray-900">년/월 선택</h3>
              <button type="button" onClick={() => setShowYearMonth(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-gray-400 text-[20px]">✕</button>
            </div>
            <div className="px-4 py-4">
              <div className="relative h-[220px]">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-toss-gray-100 rounded-xl pointer-events-none" style={{ height: ITEM_H }} />
                <div className="flex h-full">
                  <div className="flex-1 h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
                    style={{ paddingTop: `${(220 - ITEM_H) / 2}px`, paddingBottom: `${(220 - ITEM_H) / 2}px` }}
                    onScroll={handleYearScroll}
                    ref={(el) => { if (el) { const idx = YEARS.indexOf(pickerYear); if (idx >= 0) el.scrollTop = idx * ITEM_H; } }}>
                    {YEARS.map((y) => (
                      <div key={y} style={{ height: ITEM_H }}
                        className={`flex items-center justify-end pr-3 snap-center transition-all ${
                          y === pickerYear ? "text-toss-gray-900 font-bold text-[20px]" : "text-toss-gray-400 text-[16px]"
                        }`}>{y}년</div>
                    ))}
                  </div>
                  <div className="flex-1 h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
                    style={{ paddingTop: `${(220 - ITEM_H) / 2}px`, paddingBottom: `${(220 - ITEM_H) / 2}px` }}
                    onScroll={handleMonthScroll}
                    ref={(el) => { if (el) { const idx = pickerMonth - 1; if (idx >= 0) el.scrollTop = idx * ITEM_H; } }}>
                    {MONTHS.map((m) => (
                      <div key={m} style={{ height: ITEM_H }}
                        className={`flex items-center justify-start pl-3 snap-center transition-all ${
                          m === pickerMonth ? "text-toss-gray-900 font-bold text-[20px]" : "text-toss-gray-400 text-[16px]"
                        }`}>{m}월</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button type="button" onClick={() => { setViewYear(pickerYear); setViewMonth(pickerMonth); setTempDay(null); setShowYearMonth(false); }}
                className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl text-[16px] active:scale-[0.98] transition">
                {pickerYear}년 {pickerMonth}월 선택
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
