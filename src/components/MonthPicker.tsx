"use client";

import { useState, useRef, useEffect } from "react";

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
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

export default function MonthPicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => value ? parseInt(value.split("-")[0]) : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number | null>(() => value ? parseInt(value.split("-")[1]) : null);
  const ref = useRef<HTMLDivElement>(null);

  const parts = value ? value.split("-") : [];
  const selectedYear = parts.length >= 1 ? parseInt(parts[0]) : null;
  const selectedMonth = parts.length >= 2 ? parseInt(parts[1]) : null;
  const selectedDay = parts.length >= 3 ? parseInt(parts[2]) : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDayClick = (day: number) => {
    if (!viewMonth) return;
    const val = `${year}-${String(viewMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(val);
    setOpen(false);
  };

  const displayValue = value && selectedYear && selectedMonth && selectedDay
    ? `${selectedYear}년 ${selectedMonth}월 ${selectedDay}일`
    : "";

  return (
    <div ref={ref} className="relative">
      <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">정산일정</label>
      <button type="button" onClick={() => { setOpen(!open); if (!open) setViewMonth(null); }}
        className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-left text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white">
        {displayValue || <span className="text-toss-gray-400">정산일정을 선택하세요</span>}
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
                  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() + 1 === viewMonth && today.getDate() === d;
                  const isSelected = (d: number) => selectedYear === year && selectedMonth === viewMonth && selectedDay === d;
                  return days.map((day, idx) => (
                    day === null ? (
                      <div key={idx} />
                    ) : (
                      <button key={idx} type="button" onClick={() => handleDayClick(day)}
                        className={`text-center py-1.5 text-[13px] rounded-lg transition-all ${
                          isSelected(day)
                            ? "bg-toss-blue text-white font-bold"
                            : isToday(day)
                            ? "bg-blue-50 text-toss-blue font-bold"
                            : "text-toss-gray-700 hover:bg-toss-gray-100"
                        }`}>
                        {day}
                      </button>
                    )
                  ));
                })()}
              </div>
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
