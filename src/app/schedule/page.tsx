"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

interface Schedule {
  id: string;
  type: string;
  title: string;
  date: string;
  time: string | null;
  memo: string | null;
}

type ViewMode = "list" | "week" | "month";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function SchedulePage() {
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => {
    if (!isLoggedIn) openLoginModal();
  }, [isLoggedIn, openLoginModal]);

  const fetchSchedules = useCallback(async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/schedule?user_id=${profile.id}&month=${monthStr}`);
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch { /* empty */ }
    setLoading(false);
  }, [profile, monthStr]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const handleDelete = async (id: string) => {
    if (!confirm("일정을 삭제하시겠습니까?")) return;
    await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
    fetchSchedules();
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const getSchedulesForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return schedules.filter((s) => s.date === dateStr);
  };

  const todaySchedules = schedules.filter((s) => s.date === todayStr);
  const selectedSchedules = selectedDate ? schedules.filter((s) => s.date === selectedDate) : [];

  if (!isLoggedIn) return null;

  return (
    <>
      <TopNav title="일정 관리" backHref="/profile" rightContent={
        <button onClick={() => router.push("/schedule/new")} className="text-[14px] font-semibold text-toss-blue">+ 일정 등록</button>
      } />

      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-5">
        {/* 안내 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-5 flex items-center gap-3">
          <span className="text-[20px]">📅</span>
          <div>
            <p className="text-[14px] font-semibold text-toss-gray-900">일정을 등록하여 나만의 스케줄을 관리해 보세요.</p>
            <p className="text-[12px] text-toss-gray-500">의뢰인과의 거래에도 일정을 등록할 수 있어요.</p>
          </div>
        </div>

        {/* 뷰 모드 선택 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1 text-toss-gray-400 hover:text-toss-gray-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h2 className="text-[18px] font-bold text-toss-gray-900">{year}년 {month + 1}월</h2>
            <button onClick={nextMonth} className="p-1 text-toss-gray-400 hover:text-toss-gray-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <div className="flex gap-1 bg-toss-gray-50 rounded-lg p-1">
            {(["list", "week", "month"] as ViewMode[]).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition ${viewMode === m ? "bg-white shadow-sm text-toss-gray-900" : "text-toss-gray-400"}`}>
                {m === "list" ? "목록" : m === "week" ? "주간" : "월간"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* 월간 달력 */}
            {viewMode === "month" && (
              <div className="bg-white rounded-2xl border border-toss-gray-100 p-4 md:p-6 mb-5">
                <div className="grid grid-cols-7 mb-2">
                  {DAYS.map((d, i) => (
                    <div key={d} className={`text-center text-[12px] font-semibold py-2 ${i === 0 ? "text-toss-red" : i === 6 ? "text-toss-blue" : "text-toss-gray-400"}`}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {calendarDays.map((day, i) => {
                    if (!day) return <div key={`e${i}`} className="aspect-square" />;
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const daySchedules = getSchedulesForDate(day);
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;
                    return (
                      <button key={day} onClick={() => setSelectedDate(dateStr)}
                        className={`aspect-square flex flex-col items-center justify-start pt-1 rounded-lg transition text-[13px] ${
                          isSelected ? "bg-toss-blue text-white" : isToday ? "bg-blue-50" : "hover:bg-toss-gray-50"
                        }`}>
                        <span className={`font-semibold ${isSelected ? "text-white" : isToday ? "text-toss-blue" : ""}`}>{day}</span>
                        {daySchedules.length > 0 && (
                          <div className="flex gap-0.5 mt-1">
                            {daySchedules.slice(0, 3).map((s) => (
                              <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? "bg-white" : s.type === "work" ? "bg-toss-blue" : "bg-toss-orange"
                              }`} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 선택된 날짜 일정 */}
            {viewMode === "month" && selectedDate && (
              <div className="mb-5">
                <h3 className="text-[15px] font-bold text-toss-gray-900 mb-3">
                  {new Date(selectedDate).getMonth() + 1}월 {new Date(selectedDate).getDate()}일 ({DAYS[new Date(selectedDate).getDay()]})
                </h3>
                {selectedSchedules.length === 0 ? (
                  <p className="text-[13px] text-toss-gray-400 py-4">등록된 일정이 없어요.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedSchedules.map((s) => (
                      <ScheduleCard key={s.id} schedule={s} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 목록/주간 뷰 */}
            {(viewMode === "list" || viewMode === "week") && (
              <div>
                {/* 오늘 일정 */}
                <h3 className="text-[15px] font-bold text-toss-gray-900 mb-3">
                  {now.getMonth() + 1}월 {now.getDate()}일 {DAYS[now.getDay()]}요일
                </h3>
                {todaySchedules.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-toss-gray-100 p-8 text-center mb-5">
                    <p className="text-[14px] text-toss-gray-400 mb-4">등록된 일정이 없어요.<br />잊고 계신 일정이 있다면 등록해 주세요.</p>
                    <div className="grid grid-cols-2 gap-3 max-w-[400px] mx-auto">
                      <button onClick={() => router.push("/schedule/new?type=work")}
                        className="bg-white border border-toss-gray-100 rounded-xl p-4 text-left hover:border-toss-gray-200 transition">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-blue"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        </div>
                        <p className="text-[13px] font-semibold text-toss-gray-900">거래 일정</p>
                        <p className="text-[11px] text-toss-gray-400">의뢰인과 약속한 일정</p>
                      </button>
                      <button onClick={() => router.push("/schedule/new?type=personal")}
                        className="bg-white border border-toss-gray-100 rounded-xl p-4 text-left hover:border-toss-gray-200 transition">
                        <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center mb-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-orange"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        </div>
                        <p className="text-[13px] font-semibold text-toss-gray-900">개인 일정</p>
                        <p className="text-[11px] text-toss-gray-400">개인 스케줄 관리</p>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 mb-5">
                    {todaySchedules.map((s) => (
                      <ScheduleCard key={s.id} schedule={s} onDelete={handleDelete} showDday />
                    ))}
                  </div>
                )}

                {/* 전체 일정 */}
                <h3 className="text-[15px] font-bold text-toss-gray-900 mb-3 mt-6">이번 달 전체 일정</h3>
                {schedules.length === 0 ? (
                  <p className="text-[13px] text-toss-gray-400 py-4">등록된 일정이 없어요.</p>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((s) => (
                      <ScheduleCard key={s.id} schedule={s} onDelete={handleDelete} showDate />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ScheduleCard({ schedule, onDelete, showDday, showDate }: {
  schedule: Schedule;
  onDelete: (id: string) => void;
  showDday?: boolean;
  showDate?: boolean;
}) {
  const isWork = schedule.type === "work";
  const now = new Date();
  const schedDate = new Date(schedule.date);
  const diffDays = Math.ceil((schedDate.getTime() - now.getTime()) / 86400000);
  const ddayText = diffDays === 0 ? "D-day" : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`;

  return (
    <div className="bg-white rounded-xl border border-toss-gray-100 p-4 flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isWork ? "bg-toss-blue" : "bg-toss-orange"}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {schedule.time && <span className="text-[13px] font-semibold text-toss-gray-900">{schedule.time}</span>}
          {isWork && <span className="text-[10px] font-bold text-toss-blue bg-blue-50 px-1.5 py-0.5 rounded">거래 일정</span>}
          {showDday && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${diffDays <= 0 ? "bg-red-50 text-toss-red" : "bg-toss-gray-50 text-toss-gray-500"}`}>{ddayText}</span>}
        </div>
        <p className="text-[14px] text-toss-gray-700">{schedule.title}</p>
        {schedule.memo && <p className="text-[12px] text-toss-gray-400 mt-0.5">{schedule.memo}</p>}
        {showDate && <p className="text-[11px] text-toss-gray-300 mt-1">{schedule.date}</p>}
      </div>
      <button onClick={() => onDelete(schedule.id)} className="text-toss-gray-300 hover:text-toss-red p-1 flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}
