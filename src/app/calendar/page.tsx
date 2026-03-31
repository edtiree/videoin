"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";

interface Ad {
  id: string;
  youtube_channel: string;
  performer: string;
  platform: string;
  filming_date: string;
  upload_date: string;
  progress: string;
}

const CHANNELS = ["돈벌쥐", "잡터뷰", "머니월드", "부업백과", "전국부업자랑"];

export default function CalendarPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() + 1 }; });
  const [calFilter, setCalFilter] = useState<"all" | "filming" | "upload">("all");
  const [calChannels, setCalChannels] = useState<string[]>([...CHANNELS]);
  const [detail, setDetail] = useState<Ad | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/ads").then(r => r.json()).then((data) => {
      setAds(data.map((a: Ad) => ({ id: a.id, youtube_channel: a.youtube_channel, performer: a.performer, platform: a.platform, filming_date: a.filming_date, upload_date: a.upload_date, progress: a.progress })));
    }).finally(() => setLoading(false));
  }, []);

  const y = calMonth.year, m = calMonth.month;
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDay = new Date(y, m - 1, 1).getDay();
  const calDays: { day: number; current: boolean }[] = [];
  const prevMonthDays = new Date(y, m - 1, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) calDays.push({ day: prevMonthDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) calDays.push({ day: d, current: true });
  const remaining = 7 - (calDays.length % 7);
  if (remaining < 7) for (let d = 1; d <= remaining; d++) calDays.push({ day: d, current: false });

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;

  const makeDateStr = (yr: number, mo: number, d: number) => `${yr}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const getDateStr = (cell: { day: number; current: boolean }, idx: number) => {
    if (cell.current) return makeDateStr(y, m, cell.day);
    if (idx < 7) { const pm = m === 1 ? 12 : m - 1; const py = m === 1 ? y - 1 : y; return makeDateStr(py, pm, cell.day); }
    const nm = m === 12 ? 1 : m + 1; const ny = m === 12 ? y + 1 : y; return makeDateStr(ny, nm, cell.day);
  };

  const channelFilter = (a: Ad) => calChannels.includes(a.youtube_channel);
  const getFilming = (dateStr: string) => ads.filter(a => a.filming_date === dateStr && channelFilter(a));
  const getUpload = (dateStr: string) => ads.filter(a => a.upload_date?.startsWith(dateStr) && channelFilter(a));

  const prevMo = () => setCalMonth(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 });
  const nextMo = () => setCalMonth(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 });
  const goToday = () => { const n = new Date(); setCalMonth({ year: n.getFullYear(), month: n.getMonth() + 1 }); };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-toss-gray-400">불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <TopNav title="촬영 일정" backHref="/" rightContent={
        <button onClick={goToday} className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all">
          오늘
        </button>
      } />

      <div className="max-w-6xl mx-auto px-5 mt-4 space-y-3">
        {/* 필터 */}
        <div className="flex flex-wrap gap-2">
          {([["all","전체"],["filming","촬영만"],["upload","업로드만"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setCalFilter(k)}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${calFilter === k ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-200 text-toss-gray-600"}`}>
              {l}
            </button>
          ))}
          <span className="w-px bg-toss-gray-200 mx-1"></span>
          {CHANNELS.map(ch => (
            <button key={ch} onClick={() => setCalChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])}
              className={`px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${calChannels.includes(ch) ? "bg-toss-gray-900 text-white" : "bg-white border border-toss-gray-200 text-toss-gray-400"}`}>
              {ch}
            </button>
          ))}
        </div>

        {/* 캘린더 */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={prevMo} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 text-toss-blue font-bold text-[18px]">‹</button>
            <h2 className="text-[17px] font-bold text-toss-gray-900">{y}년 {m}월</h2>
            <button onClick={nextMo} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 text-toss-blue font-bold text-[18px]">›</button>
          </div>
          <div className="grid grid-cols-7 border-t border-toss-gray-100">
            {["일","월","화","수","목","금","토"].map((l, i) => (
              <div key={l} className={`text-center py-2 text-[12px] font-semibold border-b border-toss-gray-100 ${i === 0 ? "text-toss-red" : i === 6 ? "text-toss-blue" : "text-toss-gray-400"}`}>{l}</div>
            ))}
            {calDays.map((cell, idx) => {
              const dateStr = getDateStr(cell, idx);
              const filming = calFilter !== "upload" ? getFilming(dateStr) : [];
              const upload = calFilter !== "filming" ? getUpload(dateStr) : [];
              const allEvents = [...filming.map(e => ({...e, type: "filming" as const})), ...upload.map(e => ({...e, type: "upload" as const}))];
              return (
                <div key={idx} className={`min-h-[60px] md:min-h-[100px] border-b border-r border-toss-gray-50 p-1 ${!cell.current ? "opacity-40" : ""} ${cell.current && isToday(cell.day) ? "bg-blue-50/60 ring-2 ring-toss-blue ring-inset" : ""}`}>
                  <span className={`text-[12px] font-medium ${cell.current && isToday(cell.day) ? "bg-toss-blue text-white rounded-full w-5 h-5 inline-flex items-center justify-center" : idx % 7 === 0 ? "text-toss-red" : idx % 7 === 6 ? "text-toss-blue" : "text-toss-gray-600"}`}>{cell.day}</span>
                  <div className="space-y-0.5 mt-0.5">
                    {allEvents.slice(0, 4).map((ev, i) => (
                      <div key={i} onClick={() => setDetail(ev)}
                        className={`text-[10px] rounded-lg px-1.5 py-1 cursor-pointer hover:opacity-80 border ${
                          ev.type === "filming" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        }`}>
                        <div className="font-bold text-toss-gray-900 text-[11px] truncate">{ev.performer}</div>
                        <div className="hidden md:flex items-center gap-1 mt-0.5">
                          <span className="text-toss-gray-400 truncate">{ev.youtube_channel}</span>
                          <span className={`px-1 py-0 rounded text-[9px] font-bold shrink-0 ${
                            ev.progress === "완료" ? "bg-green-100 text-green-600" : ev.progress === "편집중" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                          }`}>{ev.progress}</span>
                        </div>
                      </div>
                    ))}
                    {allEvents.length > 4 && <div className="text-[10px] text-toss-gray-400">+{allEvents.length - 4}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 flex gap-4 text-[12px] text-toss-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded"></span> 촬영</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded"></span> 업로드</span>
          </div>
        </div>
      </div>

      {/* 상세 모달 (금액 제외) */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold text-toss-gray-900">{detail.performer}</h3>
              <button onClick={() => setDetail(null)} className="text-toss-gray-400 text-[20px]">✕</button>
            </div>
            <div className="space-y-2.5 text-[14px]">
              <div className="flex justify-between"><span className="text-toss-gray-500">채널</span><span className="font-semibold">{detail.youtube_channel}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">플랫폼</span><span className="font-semibold">{detail.platform}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">촬영일</span><span className="font-semibold">{detail.filming_date}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">업로드일</span><span className="font-semibold">{detail.upload_date}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">상태</span><span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${detail.progress === "완료" ? "bg-green-50 text-green-600" : detail.progress === "편집중" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>{detail.progress}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
