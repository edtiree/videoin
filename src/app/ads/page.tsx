"use client";

import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";

interface Ad {
  id: string;
  youtube_channel: string;
  performer: string;
  platform: string;
  filming_date: string;
  upload_date: string;
  progress: string;
  filming_fee_status: string;
  ad_fee: number;
  supply_amount: number;
  vat_method: string;
  vat_amount: number;
  total_amount: number;
  tax_invoice: string;
  rs_rate: number;
  rs_cost: number;
  rs_settlement: string;
}

const CHANNELS = ["돈벌쥐", "잡터뷰", "머니월드", "부업백과", "전국부업자랑"];
const PLATFORMS = ["N잡연구소","타이탄클래스","아이비클래스","코주부클래스","시스템노바","핏크닉","부자꿈틀","인베이더","하버드","웰스클래스","하이퍼스쿨","사이클해커스","인생2막클래스","뒤쳐지는마케팅","손우성메이커스","머니루트","돈클","프레스런","디하클","플랜비스쿨","리치픽스","피터팬클래스","보다플레이","부학당"];
const PROGRESS = ["촬영중", "편집중", "완료"];
const FEE_STATUS = ["정산 전", "정산 완료"];
const VAT_METHODS = ["부가세 별도", "부가세 포함"];
const TAX_INVOICE = ["발행 전", "발행 완료"];
const RS_SETTLEMENT = ["시작 전", "정산 완료"];

const ADMIN_PIN = "0123";

export default function AdsPage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ channel: "", progress: "", month: "", platform: "", filming_fee_status: "", tax_invoice: "", rs_settlement: "" });
  const [sort, setSort] = useState<{ key: string; asc: boolean }>({ key: "filming_date", asc: false });
  const [editAd, setEditAd] = useState<Partial<Ad> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"dashboard" | "db" | "calendar">("dashboard");
  const [calMonth, setCalMonth] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() + 1 }; });
  const [calFilter, setCalFilter] = useState<"all" | "filming" | "upload">("all");
  const [calDetail, setCalDetail] = useState<Ad | null>(null);
  const [picker, setPicker] = useState<{ id: string; field: string; title: string; options?: string[]; type: "select" | "text" | "date"; value: string } | null>(null);

  const handleAuth = (v?: string) => {
    if ((v || pin) === ADMIN_PIN) { setAuthed(true); }
    else { setLoginError("PIN이 일치하지 않습니다."); setPin(""); }
  };

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch("/api/ads").then(r => r.json()).then(setAds).finally(() => setLoading(false));
  }, [authed]);

  const handleSave = async () => {
    if (!editAd) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editAd),
      });
      if (!res.ok) throw new Error();
      if (editAd.id) {
        setAds(prev => prev.map(a => a.id === editAd.id ? { ...a, ...editAd } as Ad : a));
      } else {
        const data = await res.json();
        setAds(prev => [data, ...prev]);
      }
      setEditAd(null);
      setAlertMsg(editAd.id ? "수정되었습니다." : "추가되었습니다.");
    } catch { setAlertMsg("저장에 실패했습니다."); }
    finally { setSaving(false); }
  };

  const inlineUpdate = async (id: string, field: string, value: string | number) => {
    setAds(prev => prev.map(a => a.id === id ? { ...a, [field]: value } as Ad : a));
    await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, [field]: value }) });
  };

  const cycleValue = (id: string, field: string, current: string, options: string[]) => {
    const idx = options.indexOf(current);
    const next = options[(idx + 1) % options.length];
    inlineUpdate(id, field, next);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch("/api/ads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget }) });
    setAds(prev => prev.filter(a => a.id !== deleteTarget));
    setDeleteTarget(null);
  };

  const toggleSort = (key: string) => {
    setSort(prev => prev.key === key ? { key, asc: !prev.asc } : { key, asc: true });
  };

  const filtered = ads.filter(a => {
    if (filter.channel && a.youtube_channel !== filter.channel) return false;
    if (filter.progress && a.progress !== filter.progress) return false;
    if (filter.month && !a.filming_date?.startsWith(filter.month)) return false;
    if (filter.platform && a.platform !== filter.platform) return false;
    if (filter.filming_fee_status && a.filming_fee_status !== filter.filming_fee_status) return false;
    if (filter.tax_invoice && a.tax_invoice !== filter.tax_invoice) return false;
    if (filter.rs_settlement && a.rs_settlement !== filter.rs_settlement) return false;
    return true;
  }).sort((a, b) => {
    const key = sort.key as keyof Ad;
    const av = a[key] ?? "";
    const bv = b[key] ?? "";
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sort.asc ? cmp : -cmp;
  });

  const totalAdFee = filtered.reduce((s, a) => s + (a.ad_fee || 0), 0);
  const totalSupply = filtered.reduce((s, a) => s + (a.supply_amount || 0), 0);
  const totalVat = filtered.reduce((s, a) => s + (a.vat_amount || 0), 0);
  const totalTotal = filtered.reduce((s, a) => s + (a.total_amount || 0), 0);
  const totalRsCost = filtered.reduce((s, a) => s + (a.rs_cost || 0), 0);

  const formatDate = (d: string) => {
    if (!d) return "-";
    const p = d.split("-");
    if (p.length >= 3) return `${p[0].slice(2)}.${p[1]}.${p[2].split(" ")[0]}`;
    return d;
  };

  const inputCls = "w-full rounded-xl border border-toss-gray-200 px-3 py-2.5 text-[14px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none bg-white";
  const selectCls = inputCls;

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" onClick={() => document.getElementById("ads-pin")?.focus()}>
        <div className="w-full max-w-sm text-center">
          <h2 className="text-[22px] font-bold text-toss-gray-900 mb-2">광고 DB</h2>
          <p className="text-toss-gray-500 text-[15px] mb-10">관리자 PIN을 입력하세요</p>
          {loginError && <div className="mb-5 px-4 py-3 bg-red-50 text-toss-red rounded-2xl text-[14px]">{loginError}</div>}
          <div className="relative flex justify-center gap-4 mb-8">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-xl transition-all duration-200 ${
                pin.length > i ? "bg-toss-blue text-white scale-105" : pin.length === i ? "bg-white border-2 border-toss-blue" : "bg-toss-gray-100 border border-toss-gray-200"
              }`}>{pin[i] ? "●" : ""}</div>
            ))}
            <input id="ads-pin" type="tel" value={pin} autoFocus autoComplete="off"
              onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,4); setPin(v); if (v.length===4) setTimeout(()=>handleAuth(v),150); }}
              className="absolute inset-0 opacity-0 w-full h-full caret-transparent" inputMode="numeric" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b border-toss-gray-100">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-toss-gray-900">광고 관리</h1>
          {tab === "db" && (
            <button onClick={() => setEditAd({ youtube_channel: "돈벌쥐", progress: "완료", filming_fee_status: "정산 전", vat_method: "부가세 별도", tax_invoice: "발행 전", rs_settlement: "시작 전", ad_fee: 0, supply_amount: 0, vat_amount: 0, total_amount: 0, rs_rate: 0, rs_cost: 0 })}
              className="px-4 py-2 bg-toss-blue text-white text-[14px] font-semibold rounded-xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all">
              + 새 광고
            </button>
          )}
        </div>
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex gap-1 bg-toss-gray-100 rounded-xl p-1">
            {([["dashboard","정산현황"],["db","광고 DB"],["calendar","캘린더"]] as const).map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`flex-1 py-2.5 text-[14px] font-semibold rounded-lg transition-all ${tab === k ? "bg-white text-toss-gray-900 shadow-sm" : "text-toss-gray-500"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 mt-4">

      {/* ─── 대시보드 ─── */}
      {tab === "dashboard" && (() => {
        const unsettledFee = ads.filter(a => a.filming_fee_status === "정산 전");
        const unsettledRS = ads.filter(a => a.rs_rate > 0 && a.rs_settlement === "시작 전");
        const unpaidInvoice = ads.filter(a => a.tax_invoice === "발행 전" && a.ad_fee > 0);
        const inProgress = ads.filter(a => a.progress !== "완료");
        return (
          <div className="space-y-4">
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "전체 광고", value: `${ads.length}건`, color: "text-toss-blue" },
                { label: "촬영비 미정산", value: `${unsettledFee.length}건`, color: unsettledFee.length > 0 ? "text-toss-red" : "text-toss-green" },
                { label: "RS 미정산", value: `${unsettledRS.length}건`, color: unsettledRS.length > 0 ? "text-toss-red" : "text-toss-green" },
                { label: "세금계산서 미발행", value: `${unpaidInvoice.length}건`, color: unpaidInvoice.length > 0 ? "text-amber-600" : "text-toss-green" },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-toss-gray-100 p-4 shadow-sm">
                  <p className="text-[13px] text-toss-gray-500">{c.label}</p>
                  <p className={`text-[22px] font-bold mt-1 ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* 촬영비 미정산 */}
            {unsettledFee.length > 0 && (
              <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
                <h3 className="text-[16px] font-bold text-toss-gray-900 mb-3">촬영비 미정산 ({unsettledFee.length}건)</h3>
                <div className="space-y-2">
                  {unsettledFee.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-toss-gray-50 last:border-0">
                      <div>
                        <span className="text-[14px] font-semibold text-toss-gray-900">{a.performer}</span>
                        <span className="text-[12px] text-toss-gray-400 ml-2">{a.platform} · {formatDate(a.filming_date)}</span>
                      </div>
                      <span className="text-[13px] font-bold text-toss-red">{a.ad_fee ? `${a.ad_fee.toLocaleString()}원` : "미정"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RS 미정산 */}
            {unsettledRS.length > 0 && (
              <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
                <h3 className="text-[16px] font-bold text-toss-gray-900 mb-3">RS 미정산 ({unsettledRS.length}건)</h3>
                <div className="space-y-2">
                  {unsettledRS.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-toss-gray-50 last:border-0">
                      <div>
                        <span className="text-[14px] font-semibold text-toss-gray-900">{a.performer}</span>
                        <span className="text-[12px] text-toss-gray-400 ml-2">{a.platform} · RS {a.rs_rate}%</span>
                      </div>
                      <span className="text-[13px] font-bold text-amber-600">{a.rs_cost ? `${a.rs_cost.toLocaleString()}원` : "미산정"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 진행 중 */}
            {inProgress.length > 0 && (
              <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
                <h3 className="text-[16px] font-bold text-toss-gray-900 mb-3">진행 중 ({inProgress.length}건)</h3>
                <div className="space-y-2">
                  {inProgress.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-toss-gray-50 last:border-0">
                      <div>
                        <span className="text-[14px] font-semibold text-toss-gray-900">{a.performer}</span>
                        <span className="text-[12px] text-toss-gray-400 ml-2">{a.youtube_channel} · {a.platform}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${a.progress === "편집중" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>{a.progress}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 세금계산서 미발행 */}
            {unpaidInvoice.length > 0 && (
              <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
                <h3 className="text-[16px] font-bold text-toss-gray-900 mb-3">세금계산서 미발행 ({unpaidInvoice.length}건)</h3>
                <div className="space-y-2">
                  {unpaidInvoice.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-toss-gray-50 last:border-0">
                      <div>
                        <span className="text-[14px] font-semibold text-toss-gray-900">{a.performer}</span>
                        <span className="text-[12px] text-toss-gray-400 ml-2">{a.platform} · {a.total_amount.toLocaleString()}원</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── 캘린더 ─── */}
      {tab === "calendar" && (() => {
        const y = calMonth.year, m = calMonth.month;
        const daysInMonth = new Date(y, m, 0).getDate();
        const firstDay = new Date(y, m - 1, 1).getDay();
        const calDays: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) calDays.push(null);
        for (let d = 1; d <= daysInMonth; d++) calDays.push(d);
        const today = new Date();
        const isToday = (d: number) => today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;

        const makeDateStr = (d: number) => `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

        const getFilming = (day: number) => ads.filter(a => a.filming_date === makeDateStr(day));
        const getUpload = (day: number) => ads.filter(a => a.upload_date?.startsWith(makeDateStr(day)));

        const prevMo = () => setCalMonth(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 });
        const nextMo = () => setCalMonth(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 });

        const handleDrop = async (adId: string, field: "filming_date" | "upload_date", newDate: string) => {
          setAds(prev => prev.map(a => a.id === adId ? { ...a, [field]: newDate } as Ad : a));
          await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: adId, [field]: newDate }) });
        };

        return (
          <div className="space-y-3">
            {/* 필터 */}
            <div className="flex gap-2">
              {([["all","전체"],["filming","촬영만"],["upload","업로드만"]] as const).map(([k,l]) => (
                <button key={k} onClick={() => setCalFilter(k)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${calFilter === k ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-200 text-toss-gray-600"}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-toss-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <button onClick={prevMo} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 text-toss-blue font-bold">‹</button>
                <h2 className="text-[17px] font-bold text-toss-gray-900">{y}년 {m}월</h2>
                <button onClick={nextMo} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-toss-gray-100 text-toss-blue font-bold">›</button>
              </div>
              <div className="grid grid-cols-7 border-t border-toss-gray-100">
                {["일","월","화","수","목","금","토"].map((l, i) => (
                  <div key={l} className={`text-center py-2 text-[12px] font-semibold border-b border-toss-gray-100 ${i === 0 ? "text-toss-red" : i === 6 ? "text-toss-blue" : "text-toss-gray-400"}`}>{l}</div>
                ))}
                {calDays.map((day, idx) => {
                  const filming = day && calFilter !== "upload" ? getFilming(day) : [];
                  const upload = day && calFilter !== "filming" ? getUpload(day) : [];
                  const allEvents = [...filming.map(e => ({...e, type: "filming" as const})), ...upload.map(e => ({...e, type: "upload" as const}))];
                  return (
                    <div key={idx}
                      onDragOver={e => { if (day) e.preventDefault(); }}
                      onDrop={e => {
                        if (!day) return;
                        const data = e.dataTransfer.getData("text/plain");
                        if (!data) return;
                        const { id, field } = JSON.parse(data);
                        handleDrop(id, field, makeDateStr(day));
                      }}
                      className={`min-h-[80px] border-b border-r border-toss-gray-50 p-1 ${!day ? "bg-toss-gray-50/50" : ""} ${day && isToday(day) ? "bg-blue-50/60 ring-2 ring-toss-blue ring-inset" : ""}`}>
                      {day && (
                        <>
                          <span className={`text-[12px] font-medium ${isToday(day) ? "bg-toss-blue text-white rounded-full w-5 h-5 inline-flex items-center justify-center" : idx % 7 === 0 ? "text-toss-red" : idx % 7 === 6 ? "text-toss-blue" : "text-toss-gray-600"}`}>{day}</span>
                          <div className="space-y-0.5 mt-0.5">
                            {allEvents.slice(0, 3).map((ev, i) => (
                              <div key={i}
                                draggable
                                onDragStart={e => e.dataTransfer.setData("text/plain", JSON.stringify({ id: ev.id, field: ev.type === "filming" ? "filming_date" : "upload_date" }))}
                                onClick={() => setCalDetail(ev)}
                                className={`text-[10px] rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80 ${
                                  ev.type === "filming" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                }`}>
                                {ev.type === "filming" ? "🎬" : "📤"} {ev.performer}
                              </div>
                            ))}
                            {allEvents.length > 3 && <div className="text-[10px] text-toss-gray-400">+{allEvents.length - 3}</div>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3 flex gap-4 text-[12px] text-toss-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded"></span> 촬영</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded"></span> 업로드</span>
                <span className="text-toss-gray-300 ml-2">일정을 드래그하여 날짜를 이동할 수 있습니다</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 캘린더 상세 모달 */}
      {calDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setCalDetail(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-bold text-toss-gray-900">{calDetail.performer}</h3>
              <button onClick={() => setCalDetail(null)} className="text-toss-gray-400 text-[20px]">✕</button>
            </div>
            <div className="space-y-2.5 text-[14px]">
              <div className="flex justify-between"><span className="text-toss-gray-500">채널</span><span className="font-semibold">{calDetail.youtube_channel}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">플랫폼</span><span className="font-semibold">{calDetail.platform}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">촬영일</span><span className="font-semibold">{formatDate(calDetail.filming_date)}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">업로드일</span><span className="font-semibold">{formatDate(calDetail.upload_date)}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">상태</span><span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${calDetail.progress === "완료" ? "bg-green-50 text-green-600" : calDetail.progress === "편집중" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>{calDetail.progress}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">광고비</span><span className="font-semibold">{calDetail.ad_fee ? `${calDetail.ad_fee.toLocaleString()}원` : "-"}</span></div>
              <div className="flex justify-between"><span className="text-toss-gray-500">총액</span><span className="font-bold text-toss-blue">{calDetail.total_amount ? `${calDetail.total_amount.toLocaleString()}원` : "-"}</span></div>
            </div>
            <button onClick={() => { setEditAd(calDetail); setCalDetail(null); }}
              className="w-full mt-5 py-3.5 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all text-[15px]">
              수정
            </button>
          </div>
        </div>
      )}

      {/* ─── 광고 DB ─── */}
      {tab === "db" && (<>
        {/* 필터 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "channel", label: "채널", options: CHANNELS, value: filter.channel },
            { key: "platform", label: "플랫폼", options: PLATFORMS, value: filter.platform },
            { key: "progress", label: "진행상황", options: PROGRESS, value: filter.progress },
            { key: "filming_fee_status", label: "촬영비정산", options: FEE_STATUS, value: filter.filming_fee_status },
            { key: "tax_invoice", label: "세금계산서", options: TAX_INVOICE, value: filter.tax_invoice },
            { key: "rs_settlement", label: "RS정산", options: RS_SETTLEMENT, value: filter.rs_settlement },
          ].map(f => (
            <select key={f.key} value={f.value} onChange={e => setFilter({...filter, [f.key]: e.target.value})}
              className={`rounded-xl border px-3 py-2 text-[13px] bg-white ${f.value ? "border-toss-blue text-toss-blue font-semibold" : "border-toss-gray-200"}`}>
              <option value="">{f.label}</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
          <input type="month" value={filter.month} onChange={e => setFilter({...filter, month: e.target.value})}
            className={`rounded-xl border px-3 py-2 text-[13px] bg-white ${filter.month ? "border-toss-blue text-toss-blue font-semibold" : "border-toss-gray-200"}`} />
          {Object.values(filter).some(v => v) && (
            <button onClick={() => setFilter({ channel: "", progress: "", month: "", platform: "", filming_fee_status: "", tax_invoice: "", rs_settlement: "" })}
              className="rounded-xl border border-toss-gray-200 px-3 py-2 text-[13px] text-toss-red hover:bg-red-50">초기화</button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-toss-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-toss-gray-100">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-toss-gray-50 text-toss-gray-600 text-left">
                  {[
                    { key: "youtube_channel", label: "채널" },
                    { key: "performer", label: "출연자" },
                    { key: "platform", label: "플랫폼" },
                    { key: "filming_date", label: "촬영일" },
                    { key: "upload_date", label: "업로드일" },
                    { key: "progress", label: "상태" },
                    { key: "filming_fee_status", label: "촬영비" },
                    { key: "ad_fee", label: "광고비" },
                    { key: "total_amount", label: "총액" },
                    { key: "tax_invoice", label: "세금계산서" },
                    { key: "rs_rate", label: "RS" },
                  ].map(h => (
                    <th key={h.key} className="px-3 py-3 font-semibold whitespace-nowrap cursor-pointer hover:text-toss-blue transition select-none"
                      onClick={() => toggleSort(h.key)}>
                      {h.label}{sort.key === h.key ? (sort.asc ? " ↑" : " ↓") : ""}
                    </th>
                  ))}
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-t border-toss-gray-50 hover:bg-toss-gray-50 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:text-toss-blue" onClick={() => setPicker({ id: a.id, field: "youtube_channel", title: "유튜브 채널", options: CHANNELS, type: "select", value: a.youtube_channel })}>{a.youtube_channel}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-toss-gray-900 cursor-pointer hover:text-toss-blue" onClick={() => setPicker({ id: a.id, field: "performer", title: "출연자명", type: "text", value: a.performer })}>{a.performer}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:text-toss-blue" onClick={() => setPicker({ id: a.id, field: "platform", title: "플랫폼", options: PLATFORMS, type: "select", value: a.platform })}>{a.platform}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:text-toss-blue" onClick={() => setPicker({ id: a.id, field: "filming_date", title: "촬영 일정", type: "date", value: a.filming_date })}>{formatDate(a.filming_date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:text-toss-blue" onClick={() => setPicker({ id: a.id, field: "upload_date", title: "업로드 일정", type: "date", value: a.upload_date?.split(" ")[0] || "" })}>{formatDate(a.upload_date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer" onClick={() => setPicker({ id: a.id, field: "progress", title: "진행 상황", options: PROGRESS, type: "select", value: a.progress })}>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        a.progress === "완료" ? "bg-green-50 text-green-600" : a.progress === "편집중" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                      }`}>{a.progress}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer" onClick={() => setPicker({ id: a.id, field: "filming_fee_status", title: "촬영비 정산", options: FEE_STATUS, type: "select", value: a.filming_fee_status })}>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        a.filming_fee_status === "정산 완료" ? "bg-green-50 text-green-600" : "bg-toss-gray-100 text-toss-gray-500"
                      }`}>{a.filming_fee_status}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right cursor-pointer hover:text-toss-blue" onClick={() => setPicker({ id: a.id, field: "ad_fee", title: "광고비", type: "number" as "text", value: String(a.ad_fee || "") })}>{a.ad_fee ? `${a.ad_fee.toLocaleString()}` : "-"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold cursor-pointer hover:text-toss-blue" onClick={() => setPicker({ id: a.id, field: "total_amount", title: "총액", type: "number" as "text", value: String(a.total_amount || "") })}>{a.total_amount ? `${a.total_amount.toLocaleString()}` : "-"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer" onClick={() => setPicker({ id: a.id, field: "tax_invoice", title: "세금 계산서", options: TAX_INVOICE, type: "select", value: a.tax_invoice })}>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        a.tax_invoice === "발행 완료" ? "bg-green-50 text-green-600" : "bg-toss-gray-100 text-toss-gray-500"
                      }`}>{a.tax_invoice}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:text-toss-blue" onClick={() => setPicker({ id: a.id, field: "rs_rate", title: "RS 비율 (%)", type: "number" as "text", value: String(a.rs_rate || "") })}>{a.rs_rate}%</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button onClick={() => setDeleteTarget(a.id)} className="text-toss-red text-[12px] font-semibold">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-toss-gray-50 border-t-2 border-toss-gray-200 text-[13px] font-bold text-toss-gray-900">
                  <td className="px-3 py-3" colSpan={2}>개수 {filtered.length}</td>
                  <td className="px-3 py-3" colSpan={5}></td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">합계 {totalAdFee.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">합계 {totalTotal.toLocaleString()}</td>
                  <td className="px-3 py-3" colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </>)}

      {/* 수정/추가 모달 */}
      {editAd && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setEditAd(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 sticky top-0 bg-white">
              <h3 className="text-[18px] font-bold text-toss-gray-900">{editAd.id ? "광고 수정" : "새 광고"}</h3>
              <button onClick={() => setEditAd(null)} className="text-toss-gray-400 text-[20px]">✕</button>
            </div>
            <div className="px-6 space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">유튜브 채널</label>
                  <select value={editAd.youtube_channel||""} onChange={e=>setEditAd({...editAd,youtube_channel:e.target.value})} className={selectCls}>
                    {CHANNELS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">플랫폼</label>
                  <select value={editAd.platform||""} onChange={e=>setEditAd({...editAd,platform:e.target.value})} className={selectCls}>
                    <option value="">선택</option>
                    {PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-toss-gray-500 mb-1">출연자명</label>
                <input value={editAd.performer||""} onChange={e=>setEditAd({...editAd,performer:e.target.value})} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">촬영 일정</label>
                  <input type="date" value={editAd.filming_date||""} onChange={e=>setEditAd({...editAd,filming_date:e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">업로드 일정</label>
                  <input type="date" value={editAd.upload_date?.split(" ")[0]||""} onChange={e=>setEditAd({...editAd,upload_date:e.target.value})} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">진행 상황</label>
                  <select value={editAd.progress||""} onChange={e=>setEditAd({...editAd,progress:e.target.value})} className={selectCls}>
                    {PROGRESS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">촬영비 정산</label>
                  <select value={editAd.filming_fee_status||""} onChange={e=>setEditAd({...editAd,filming_fee_status:e.target.value})} className={selectCls}>
                    {FEE_STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">부가세 방식</label>
                  <select value={editAd.vat_method||""} onChange={e=>setEditAd({...editAd,vat_method:e.target.value})} className={selectCls}>
                    <option value="">선택</option>
                    {VAT_METHODS.map(v=><option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">광고비</label>
                  <input type="text" inputMode="numeric" value={editAd.ad_fee||""} onChange={e=>setEditAd({...editAd,ad_fee:Number(e.target.value.replace(/\D/g,""))||0})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">공급가액</label>
                  <input type="text" inputMode="numeric" value={editAd.supply_amount||""} onChange={e=>setEditAd({...editAd,supply_amount:Number(e.target.value.replace(/\D/g,""))||0})} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">세액(VAT)</label>
                  <input type="text" inputMode="numeric" value={editAd.vat_amount||""} onChange={e=>setEditAd({...editAd,vat_amount:Number(e.target.value.replace(/\D/g,""))||0})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">총액</label>
                  <input type="text" inputMode="numeric" value={editAd.total_amount||""} onChange={e=>setEditAd({...editAd,total_amount:Number(e.target.value.replace(/\D/g,""))||0})} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">세금계산서</label>
                  <select value={editAd.tax_invoice||""} onChange={e=>setEditAd({...editAd,tax_invoice:e.target.value})} className={selectCls}>
                    {TAX_INVOICE.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">RS 비율(%)</label>
                  <input type="text" inputMode="numeric" value={editAd.rs_rate||""} onChange={e=>setEditAd({...editAd,rs_rate:Number(e.target.value.replace(/\D/g,""))||0})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[12px] text-toss-gray-500 mb-1">RS비 정산</label>
                  <select value={editAd.rs_settlement||""} onChange={e=>setEditAd({...editAd,rs_settlement:e.target.value})} className={selectCls}>
                    {RS_SETTLEMENT.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 pb-8 pt-2">
              <button onClick={handleSave} disabled={saving || !editAd.performer}
                className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover disabled:bg-toss-gray-200 active:scale-[0.98] transition-all text-[16px]">
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 인라인 편집 모달 */}
      {picker && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setPicker(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h3 className="text-[18px] font-bold text-toss-gray-900">{picker.title}</h3>
              <button onClick={() => setPicker(null)} className="text-toss-gray-400 text-[20px]">✕</button>
            </div>
            <div className="px-6 pb-8">
              {picker.type === "select" && picker.options && (
                <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                  {picker.options.map(o => (
                    <button key={o} onClick={() => { inlineUpdate(picker.id, picker.field, o); setPicker(null); }}
                      className={`w-full text-left px-4 py-3.5 rounded-xl text-[15px] transition-all ${
                        o === picker.value ? "bg-toss-blue text-white font-semibold" : "hover:bg-toss-gray-100 text-toss-gray-900"
                      }`}>{o}</button>
                  ))}
                </div>
              )}
              {picker.type === "text" && (
                <div>
                  <input autoFocus value={picker.value}
                    inputMode={["ad_fee","total_amount","supply_amount","vat_amount","rs_rate","rs_cost"].includes(picker.field) ? "numeric" : "text"}
                    onChange={e => {
                      const isNum = ["ad_fee","total_amount","supply_amount","vat_amount","rs_rate","rs_cost"].includes(picker.field);
                      setPicker({ ...picker, value: isNum ? e.target.value.replace(/\D/g, "") : e.target.value });
                    }}
                    className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none bg-white mb-4" />
                  <button onClick={() => {
                    const isNum = ["ad_fee","total_amount","supply_amount","vat_amount","rs_rate","rs_cost"].includes(picker.field);
                    inlineUpdate(picker.id, picker.field, isNum ? Number(picker.value) || 0 : picker.value); setPicker(null);
                  }}
                    className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all text-[16px]">확인</button>
                </div>
              )}
              {picker.type === "date" && (
                <div>
                  <input type="date" autoFocus value={picker.value} onChange={e => setPicker({ ...picker, value: e.target.value })}
                    className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none bg-white mb-4" />
                  <button onClick={() => { inlineUpdate(picker.id, picker.field, picker.value); setPicker(null); }}
                    className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all text-[16px]">확인</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal title="광고를 삭제할까요?" message="삭제하면 복구할 수 없습니다." confirmText="삭제" cancelText="취소" confirmColor="red" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      {alertMsg && (
        <ConfirmModal title="알림" message={alertMsg} confirmText="확인" onConfirm={() => setAlertMsg(null)} />
      )}
      </div>
    </div>
  );
}
