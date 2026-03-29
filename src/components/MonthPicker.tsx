"use client";

import { useState, useRef, useEffect } from "react";

interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => value ? parseInt(value.split("-")[0]) : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number | null>(() => value ? parseInt(value.split("-")[1]) : null);
  const ref = useRef<HTMLDivElement>(null);

  const selectedMonth = value ? parseInt(value.split("-")[1]) : null;
  const selectedYear = value ? parseInt(value.split("-")[0]) : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConfirm = () => {
    if (viewMonth) {
      onChange(`${year}-${String(viewMonth).padStart(2, "0")}`);
      setOpen(false);
    }
  };

  const displayValue = value && selectedYear && selectedMonth
    ? `${selectedYear}년 ${selectedMonth}월 1일 ~ ${getDaysInMonth(selectedYear, selectedMonth)}일`
    : "";

  return (
    <div ref={ref} className="relative">
      <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">정산월</label>
      <button type="button" onClick={() => { setOpen(!open); if (!open) setViewMonth(null); }}
        className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-left text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white">
        {displayValue || <span className="text-toss-gray-400">정산월을 선택하세요</span>}
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-toss-gray-200 rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => viewMonth ? setViewMonth(null) : setYear((y) => y - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-100 transition text-toss-gray-600 text-[16px]">
              ←
            </button>
            <span className="text-[15px] font-bold text-toss-gray-900 cursor-pointer" onClick={() => viewMonth && setViewMonth(null)}>
              {year}년{viewMonth ? ` ${viewMonth}월` : ""}
            </span>
            <button type="button" onClick={() => {
              if (viewMonth) { if (viewMonth < 12) setViewMonth(viewMonth + 1); else { setYear((y) => y + 1); setViewMonth(1); } }
              else setYear((y) => y + 1);
            }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-100 transition text-toss-gray-600 text-[16px]">
              →
            </button>
          </div>

          {viewMonth ? (
            <>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAY_LABELS.map((l) => (
                  <div key={l} className="text-center text-[12px] font-medium text-toss-gray-400 py-1">{l}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {(() => {
                  const days: (number | null)[] = [];
                  for (let i = 0; i < getFirstDayOfMonth(year, viewMonth); i++) days.push(null);
                  for (let d = 1; d <= getDaysInMonth(year, viewMonth); d++) days.push(d);
                  const today = new Date();
                  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === viewMonth;
                  return days.map((day, idx) => (
                    <div key={idx} className={`text-center py-1.5 text-[13px] rounded-lg ${
                      day === null ? "" : isCurrentMonth && day === today.getDate()
                        ? "bg-toss-blue text-white font-bold" : "text-toss-gray-700"
                    }`}>{day ?? ""}</div>
                  ));
                })()}
              </div>
              <button type="button" onClick={handleConfirm}
                className="w-full mt-4 py-3 bg-toss-blue text-white rounded-xl text-[14px] font-semibold hover:bg-toss-blue-hover active:scale-[0.98] transition-all">
                {year}년 {viewMonth}월 선택
              </button>
            </>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((m) => (
                <button key={m} type="button" onClick={() => setViewMonth(m)}
                  className={`py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                    selectedYear === year && selectedMonth === m
                      ? "bg-toss-blue text-white" : "hover:bg-toss-gray-100 text-toss-gray-700"
                  }`}>
                  {m}월
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
