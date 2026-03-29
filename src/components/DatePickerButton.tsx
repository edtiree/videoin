"use client";

import { useState } from "react";

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
  const [pickedDay, setPickedDay] = useState<number | null>(selectedDay);
  const [showYearMonth, setShowYearMonth] = useState(false);

  const handleOpen = () => {
    setViewYear(selectedYear);
    setViewMonth(selectedMonth);
    setPickedDay(selectedDay);
    setShowYearMonth(false);
    setOpen(true);
  };

  const handleConfirm = () => {
    if (!pickedDay) return;
    onChange(`${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(pickedDay).padStart(2, "0")}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
    setPickedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
    setPickedDay(null);
  };

  const displayValue = value && selectedDay
    ? `${selectedYear}년 ${selectedMonth}월 ${selectedDay}일`
    : "";

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth && today.getDate() === d;

  const days: (number | null)[] = [];
  for (let i = 0; i < getFirstDayOfMonth(viewYear, viewMonth); i++) days.push(null);
  for (let d = 1; d <= getDaysInMonth(viewYear, viewMonth); d++) days.push(d);

  return (
    <>
      <button type="button" onClick={handleOpen}
        className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-left text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white">
        {displayValue || <span className="text-toss-gray-400">{placeholder}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h3 className="text-[18px] font-bold text-toss-gray-900">날짜 선택</h3>
              <button type="button" onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-gray-400 text-[20px]">
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between px-6 mb-4">
              <button type="button" onClick={() => setShowYearMonth(!showYearMonth)}
                className="text-[17px] font-bold text-toss-blue flex items-center gap-1">
                {viewYear}년 {viewMonth}월
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${showYearMonth ? "rotate-180" : ""}`}>
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {!showYearMonth && (
                <div className="flex gap-2">
                  <button type="button" onClick={prevMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-blue text-[16px] font-bold">‹</button>
                  <button type="button" onClick={nextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 transition text-toss-blue text-[16px] font-bold">›</button>
                </div>
              )}
            </div>

            <div className="px-6">
              {showYearMonth ? (
                <div className="flex justify-center gap-6 py-4">
                  <div className="h-[200px] overflow-y-auto snap-y snap-mandatory scrollbar-hide text-center w-24">
                    {Array.from({ length: 20 }, (_, i) => 2020 + i).map((y) => (
                      <button key={y} type="button"
                        onClick={() => { setViewYear(y); setPickedDay(null); }}
                        className={`w-full py-3 text-[16px] snap-center transition-all ${
                          y === viewYear ? "text-toss-gray-900 font-bold text-[20px] bg-toss-gray-100 rounded-xl" : "text-toss-gray-300"
                        }`}>{y}년</button>
                    ))}
                  </div>
                  <div className="h-[200px] overflow-y-auto snap-y snap-mandatory scrollbar-hide text-center w-16">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <button key={m} type="button"
                        onClick={() => { setViewMonth(m); setPickedDay(null); setShowYearMonth(false); }}
                        className={`w-full py-3 text-[16px] snap-center transition-all ${
                          m === viewMonth ? "text-toss-gray-900 font-bold text-[20px] bg-toss-gray-100 rounded-xl" : "text-toss-gray-300"
                        }`}>{m}월</button>
                    ))}
                  </div>
                </div>
              ) : (
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
                        <button key={idx} type="button" onClick={() => setPickedDay(day)}
                          className="flex items-center justify-center py-2">
                          <span className={`w-10 h-10 flex items-center justify-center rounded-full text-[16px] transition-all ${
                            pickedDay === day
                              ? "bg-toss-blue text-white font-bold"
                              : isToday(day)
                              ? "bg-blue-50 text-toss-blue font-bold"
                              : "text-toss-gray-800 hover:bg-toss-gray-100"
                          }`}>{day}</span>
                        </button>
                      )
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="px-6 pt-6 pb-8">
              <button type="button" onClick={handleConfirm} disabled={!pickedDay}
                className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover disabled:bg-toss-gray-200 disabled:text-toss-gray-400 active:scale-[0.98] transition-all text-[16px]">
                {pickedDay
                  ? `${viewYear}년 ${String(viewMonth).padStart(2, "0")}월 ${String(pickedDay).padStart(2, "0")}일 선택`
                  : "날짜를 선택하세요"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
