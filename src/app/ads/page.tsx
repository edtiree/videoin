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
  const [filter, setFilter] = useState({ channel: "", progress: "", month: "" });
  const [editAd, setEditAd] = useState<Partial<Ad> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await fetch("/api/ads", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget }) });
    setAds(prev => prev.filter(a => a.id !== deleteTarget));
    setDeleteTarget(null);
  };

  const filtered = ads.filter(a => {
    if (filter.channel && a.youtube_channel !== filter.channel) return false;
    if (filter.progress && a.progress !== filter.progress) return false;
    if (filter.month && !a.filming_date?.startsWith(filter.month)) return false;
    return true;
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
            <input id="ads-pin" type="tel" value={pin} autoFocus
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
          <h1 className="text-[20px] font-bold text-toss-gray-900">광고 DB</h1>
          <button onClick={() => setEditAd({ youtube_channel: "돈벌쥐", progress: "완료", filming_fee_status: "정산 전", vat_method: "부가세 별도", tax_invoice: "발행 전", rs_settlement: "시작 전", ad_fee: 0, supply_amount: 0, vat_amount: 0, total_amount: 0, rs_rate: 0, rs_cost: 0 })}
            className="px-4 py-2 bg-toss-blue text-white text-[14px] font-semibold rounded-xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all">
            + 새 광고
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 mt-4">
        {/* 필터 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={filter.channel} onChange={e => setFilter({...filter, channel: e.target.value})}
            className="rounded-xl border border-toss-gray-200 px-3 py-2 text-[13px] bg-white">
            <option value="">전체 채널</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filter.progress} onChange={e => setFilter({...filter, progress: e.target.value})}
            className="rounded-xl border border-toss-gray-200 px-3 py-2 text-[13px] bg-white">
            <option value="">전체 상태</option>
            {PROGRESS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="month" value={filter.month} onChange={e => setFilter({...filter, month: e.target.value})}
            className="rounded-xl border border-toss-gray-200 px-3 py-2 text-[13px] bg-white" />
          <span className="flex items-center text-[13px] text-toss-gray-500 ml-2">
            {filtered.length}건 · 광고비 {totalAdFee.toLocaleString()}원 · 총액 {totalTotal.toLocaleString()}원
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-toss-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-toss-gray-100">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-toss-gray-50 text-toss-gray-600 text-left">
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">채널</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">출연자</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">플랫폼</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">촬영일</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">업로드일</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">상태</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">촬영비</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">광고비</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">총액</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">세금계산서</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">RS</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-t border-toss-gray-50 hover:bg-toss-gray-50 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap">{a.youtube_channel}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-toss-gray-900">{a.performer}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{a.platform}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(a.filming_date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(a.upload_date)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        a.progress === "완료" ? "bg-green-50 text-green-600" :
                        a.progress === "편집중" ? "bg-amber-50 text-amber-600" :
                        "bg-red-50 text-red-600"
                      }`}>{a.progress}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        a.filming_fee_status === "정산 완료" ? "bg-green-50 text-green-600" : "bg-toss-gray-100 text-toss-gray-500"
                      }`}>{a.filming_fee_status}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right">{a.ad_fee ? `${a.ad_fee.toLocaleString()}` : "-"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold">{a.total_amount ? `${a.total_amount.toLocaleString()}` : "-"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        a.tax_invoice === "발행 완료" ? "bg-green-50 text-green-600" : "bg-toss-gray-100 text-toss-gray-500"
                      }`}>{a.tax_invoice}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{a.rs_rate}%</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button onClick={() => setEditAd(a)} className="text-toss-blue text-[12px] font-semibold mr-2">수정</button>
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
      </div>

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

      {deleteTarget && (
        <ConfirmModal title="광고를 삭제할까요?" message="삭제하면 복구할 수 없습니다." confirmText="삭제" cancelText="취소" confirmColor="red" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      {alertMsg && (
        <ConfirmModal title="알림" message={alertMsg} confirmText="확인" onConfirm={() => setAlertMsg(null)} />
      )}
    </div>
  );
}
