"use client";

import { useState, useEffect, useRef } from "react";
import { Worker } from "@/types";
import PDForm from "@/components/PDForm";
import EditorForm from "@/components/EditorForm";
import SettlementHistory from "@/components/SettlementHistory";
import RegisterForm from "@/components/RegisterForm";
import { getRoleLabel } from "@/lib/tax";
import ConfirmModal from "@/components/ConfirmModal";

type Page = "login" | "pin" | "register" | "register-done" | "main";
type Tab = "write" | "history";
type Category = "촬영비" | "숏폼" | "카드뉴스" | "편집비" | null;

export default function Home() {
  const [page, setPage] = useState<Page>("login");
  const [worker, setWorker] = useState<Worker | null>(null);
  const [tab, setTab] = useState<Tab>("write");
  const [category, setCategory] = useState<Category>(null);
  const [loadDraft, setLoadDraft] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showBackModal, setShowBackModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [showPinChange, setShowPinChange] = useState(false);
  const [pinForm, setPinForm] = useState({ current: "", newPin: "", confirm: "" });
  const [pinError, setPinError] = useState("");
  const [pinChanging, setPinChanging] = useState(false);

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  interface Draft { id: string; month: string; role: string; itemCount: number; final_amount: number; created_at: string; }
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsKey, setDraftsKey] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cachedSettlements, setCachedSettlements] = useState<any[] | null>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (page === "pin") {
      setTimeout(() => pinRef.current?.focus(), 50);
    }
  }, [page]);

  const fetchAllSettlements = async (wId: string) => {
    try {
      const res = await fetch(`/api/settlements/${wId}`);
      if (!res.ok) return;
      const all = await res.json();
      // 임시저장 목록
      const draftList = (all || [])
        .filter((s: { status: string }) => s.status === "임시저장")
        .map((s: { id: string; settlement_month: string; role: string; items: unknown[]; final_amount: number; created_at: string }) => ({
          id: s.id,
          month: s.settlement_month.slice(0, 10),
          role: s.role,
          itemCount: s.items?.length || 0,
          final_amount: s.final_amount,
          created_at: s.created_at,
        }));
      setDrafts(draftList);
      // 제출 이력 캐시
      setCachedSettlements((all || []).filter((s: { status: string }) => s.status !== "임시저장"));
    } catch {}
  };

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (saved) {
      try {
        const w = JSON.parse(saved);
        setWorker(w);
        setPage("main");
        fetchAllSettlements(w.id);
        // 최신 카테고리 반영
        fetch(`/api/worker/${w.id}`).then(r => r.ok ? r.json() : null).then(data => {
          if (data?.categories) {
            const updated = { ...w, categories: data.categories };
            setWorker(updated);
            localStorage.setItem("worker", JSON.stringify(updated));
          }
        }).catch(() => {});
      } catch {
        localStorage.removeItem("worker");
      }
    }
  }, []);

  const formatPhone = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const doLogin = async (pinVal: string) => {
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ""), pin: pinVal }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error); setPin(""); return; }
      if (!data.worker.approved) { setLoginError("관리자 승인 대기 중입니다."); setPin(""); return; }
      const w: Worker = {
        id: data.worker.id, name: data.worker.name, email: data.worker.phone,
        role: data.worker.role, contractType: data.worker.contractType,
        categories: data.worker.categories || ["촬영비", "숏폼", "카드뉴스", "편집비"],
      };
      localStorage.setItem("worker", JSON.stringify(w));
      setWorker(w);
      setPage("main");
      fetchAllSettlements(w.id);
    } catch { setLoginError("서버 연결에 실패했습니다."); setPin(""); }
    finally { setLoggingIn(false); }
  };

  // draftsKey 변경 시 전체 새로고침
  useEffect(() => {
    if (draftsKey === 0 || !worker) return;
    fetchAllSettlements(worker.id);
  }, [draftsKey, worker]);

  const handleLogout = () => {
    localStorage.removeItem("worker");
    setWorker(null); setPhone(""); setPin("");
    setPage("login"); setTab("write"); setSubmitted(false);
  };

  const handleSubmitSuccess = () => {
    setSubmitted(true);
    setCategory(null);
    setRefreshKey((k) => k + 1);
    if (worker) fetchAllSettlements(worker.id);
  };

  const handleDeleteDraft = (draftId: string) => {
    setDeleteTarget(draftId);
  };

  const confirmDeleteDraft = async () => {
    if (!deleteTarget || !worker) return;
    try {
      const res = await fetch("/api/settlements/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: deleteTarget, workerId: worker.id }),
      });
      if (!res.ok) throw new Error();
      setDrafts((prev) => prev.filter((d) => d.id !== deleteTarget));
      setCategory(null);
    } catch {
      setAlertMsg("삭제에 실패했습니다.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDraftSaved = () => {
    setCategory(null);
    setLoadDraft(false);
    setDraftsKey((k) => k + 1);
  };

  const handleChangePin = async () => {
    if (!worker) return;
    if (!pinForm.current) { setPinError("현재 PIN을 입력해주세요."); return; }
    if (pinForm.newPin.length !== 4 || !/^\d{4}$/.test(pinForm.newPin)) { setPinError("새 PIN은 4자리 숫자로 입력해주세요."); return; }
    if (pinForm.newPin !== pinForm.confirm) { setPinError("새 PIN이 일치하지 않습니다."); return; }
    setPinChanging(true); setPinError("");
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.id, currentPin: pinForm.current, newPin: pinForm.newPin }),
      });
      const data = await res.json();
      if (!res.ok) { setPinError(data.error); return; }
      setShowPinChange(false);
      setPinForm({ current: "", newPin: "", confirm: "" });
      setAlertMsg("PIN이 변경되었습니다.");
    } catch { setPinError("서버 연결에 실패했습니다."); }
    finally { setPinChanging(false); }
  };

  const handleResumeDraft = (role: string) => {
    setTab("write");
    setLoadDraft(true);
    setCategory(role as Category);
    setDraftsKey((k) => k + 1);
  };

  // ─── 로그인 1단계: 폰번호 ───
  if (page === "login") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-[26px] font-bold text-toss-gray-900 text-center leading-tight mb-2">
            영상 제작팀<br />정산 관리
          </h1>
          <p className="text-toss-gray-500 text-[15px] text-center mb-10">
            휴대폰번호로 접속해 주세요
          </p>

          {loginError && (
            <div className="mb-5 px-4 py-3 bg-red-50 text-toss-red rounded-2xl text-[14px]">
              {loginError}
            </div>
          )}

          <div className="flex items-center bg-white border border-toss-gray-200 rounded-2xl overflow-hidden mb-4 focus-within:border-toss-blue focus-within:ring-1 focus-within:ring-toss-blue/30 transition-all">
            <div className="flex items-center gap-1.5 px-4 py-4 text-toss-gray-600 shrink-0 select-none">
              <span className="text-[18px]">&#x1F1F0;&#x1F1F7;</span>
              <span className="text-[14px] font-medium">+82</span>
            </div>
            <div className="w-px h-6 bg-toss-gray-200" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                setPhone(formatted);
                if (formatted.replace(/\D/g, "").length >= 11) {
                  setTimeout(() => { setLoginError(""); setPage("pin"); }, 200);
                }
              }}
              className="flex-1 px-4 py-4 text-[16px] text-toss-gray-900 outline-none placeholder:text-toss-gray-400 bg-transparent"
              placeholder="휴대폰번호 입력"
              inputMode="numeric"
              onKeyDown={(e) => {
                if (e.key === "Enter" && phone.replace(/\D/g, "").length >= 10) {
                  setLoginError(""); setPage("pin");
                }
              }}
            />
          </div>

          <button
            onClick={() => {
              if (!phone || phone.replace(/\D/g, "").length < 10) {
                setLoginError("휴대폰 번호를 정확히 입력해주세요.");
                return;
              }
              setLoginError(""); setPage("pin");
            }}
            className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all text-[16px]"
          >
            다음
          </button>

          <button
            onClick={() => setPage("register")}
            className="w-full mt-5 text-[14px] text-toss-gray-500 hover:text-toss-gray-700 transition"
          >
            처음이신가요? <span className="text-toss-blue font-semibold">회원가입</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── 로그인 2단계: PIN ───
  if (page === "pin") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        onClick={() => pinRef.current?.focus()}
      >
        <div className="w-full max-w-sm text-center">
          <h2 className="text-[22px] font-bold text-toss-gray-900 mb-2">비밀번호 입력</h2>
          <p className="text-toss-gray-500 text-[15px] mb-10">{phone}</p>

          {loginError && (
            <div className="mb-5 px-4 py-3 bg-red-50 text-toss-red rounded-2xl text-[14px]">
              {loginError}
            </div>
          )}

          <div className="relative flex justify-center gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-xl transition-all duration-200 ${
                  pin.length > i
                    ? "bg-toss-blue text-white scale-105"
                    : pin.length === i
                    ? "bg-white border-2 border-toss-blue"
                    : "bg-toss-gray-100 border border-toss-gray-200"
                }`}
              >
                {pin[i] ? "●" : ""}
              </div>
            ))}
            <input
              ref={pinRef}
              type="tel"
              value={pin}
              autoFocus
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(val);
                if (val.length === 4) setTimeout(() => doLogin(val), 150);
              }}
              className="absolute inset-0 opacity-0 w-full h-full caret-transparent"
              inputMode="numeric"
            />
          </div>

          {loggingIn && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-5 h-5 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {loginError && (
            <button
              onClick={() => { setPin(""); setLoginError(""); setPage("register"); }}
              className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all text-[16px] mb-4"
            >
              회원가입
            </button>
          )}

          <button
            onClick={() => { setPin(""); setLoginError(""); setPage("login"); }}
            className="text-[14px] text-toss-gray-500 hover:text-toss-gray-700 transition"
          >
            ← 번호 다시 입력
          </button>
        </div>
      </div>
    );
  }

  // ─── 회원가입 ───
  if (page === "register") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10">
        <RegisterForm onSuccess={() => setPage("register-done")} onBack={() => setPage("login")} />
      </div>
    );
  }

  // ─── 가입 완료 ───
  if (page === "register-done") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#30b06e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-toss-gray-900 mb-2">가입이 완료되었어요</h2>
          <p className="text-toss-gray-500 text-[15px] mb-8 leading-relaxed">
            관리자 승인 후 이용할 수 있어요.<br />잠시만 기다려주세요.
          </p>
          <button
            onClick={() => setPage("login")}
            className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all text-[16px]"
          >
            로그인 화면으로
          </button>
        </div>
      </div>
    );
  }

  // ─── 제출 완료 ───
  if (submitted && worker) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3182f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-toss-gray-900 mb-2">정산서를 제출했어요</h2>
          <p className="text-toss-gray-500 text-[15px] mb-8">
            {worker.name}님의 정산서가 저장되었습니다.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSubmitted(false)}
              className="w-full py-4 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover active:scale-[0.98] transition-all text-[16px]"
            >
              새 정산서 작성
            </button>
            <button
              onClick={() => { setSubmitted(false); setTab("history"); }}
              className="w-full py-4 bg-toss-gray-100 text-toss-gray-700 font-semibold rounded-2xl hover:bg-toss-gray-200 active:scale-[0.98] transition-all text-[16px]"
            >
              제출 이력 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!worker) return null;

  // ─── 메인 화면 ───
  return (
    <div className="min-h-screen pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-toss-gray-100">
        <div className="max-w-lg mx-auto px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-bold text-toss-gray-900">{worker.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold ${
                  worker.contractType === "프리랜서"
                    ? "bg-orange-50 text-toss-orange"
                    : "bg-green-50 text-toss-green"
                }`}>
                  {worker.contractType}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setShowPinChange(true); setPinForm({ current: "", newPin: "", confirm: "" }); setPinError(""); }}
                className="text-[13px] text-toss-gray-400 hover:text-toss-gray-600 transition px-2 py-2">
                PIN변경
              </button>
              <span className="text-toss-gray-200">|</span>
              <button onClick={handleLogout}
                className="text-[13px] text-toss-gray-400 hover:text-toss-gray-600 transition px-2 py-2">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 mt-6">
        {/* 탭 */}
        <div className="flex bg-toss-gray-100 rounded-2xl p-1 mb-6">
          {[
            { key: "write" as Tab, label: "정산서 작성" },
            { key: "history" as Tab, label: "제출 이력" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-[14px] font-semibold rounded-xl transition-all ${
                tab === t.key
                  ? "bg-white text-toss-gray-900 shadow-sm"
                  : "text-toss-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "write" ? (
          category === null ? (
            <div className="space-y-3">
              {drafts.length > 0 && (
                <div className="mb-4">
                  <p className="text-[15px] font-bold text-toss-gray-900 mb-3">작성 중인 정산서</p>
                  <div className="space-y-2">
                    {drafts.map((d) => {
                      const monthParts = d.month.split("-");
                      const monthLabel = monthParts.length >= 3
                        ? `${monthParts[0]}년 ${parseInt(monthParts[1])}월 ${parseInt(monthParts[2])}일`
                        : `${monthParts[0]}년 ${parseInt(monthParts[1])}월`;
                      return (
                        <button key={d.id} onClick={() => { setLoadDraft(true); setCategory(d.role as Category); }}
                          className="w-full flex items-center justify-between bg-white rounded-2xl border border-amber-200 bg-amber-50/50 p-4 hover:border-toss-blue hover:bg-blue-50/30 active:scale-[0.98] transition-all text-left shadow-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-[22px]">{{ "촬영비": "🎬", "숏폼": "📱", "카드뉴스": "📰", "편집비": "🎞️" }[d.role] || "📋"}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[15px] font-bold text-toss-gray-900">
                                  {monthLabel} {getRoleLabel(d.role)}
                                </p>
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[11px] font-bold">임시저장</span>
                              </div>
                              <p className="text-[13px] text-toss-gray-500">{d.itemCount}건</p>
                            </div>
                          </div>
                          <span className="text-[14px] font-bold text-toss-blue">{d.final_amount.toLocaleString()}원</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <p className="text-[15px] text-toss-gray-600 mb-2">정산 카테고리를 선택하세요</p>
              {[
                { key: "촬영비" as Category, icon: "📹", label: "유튜브 촬영", desc: "건당 200,000원" },
                { key: "편집비" as Category, icon: "🎬", label: "유튜브 롱폼 편집", desc: "분당 10,000원" },
                { key: "숏폼" as Category, icon: "🎞️", label: "쇼츠·릴스 편집", desc: "건당 10,000원" },
                { key: "카드뉴스" as Category, icon: "📰", label: "인스타 카드뉴스", desc: "건당 10,000원" },
              ].filter((c) => (worker.categories || ["촬영비", "숏폼", "카드뉴스", "편집비"]).includes(c.key!)).map((c) => (
                <button key={c.key} onClick={() => { setLoadDraft(false); setCategory(c.key); }}
                  className="w-full flex items-center gap-4 bg-white rounded-2xl border border-toss-gray-100 p-5 hover:border-toss-blue hover:bg-blue-50/30 active:scale-[0.98] transition-all text-left shadow-sm">
                  <span className="text-[28px]">{c.icon}</span>
                  <div>
                    <p className="text-[16px] font-bold text-toss-gray-900">{c.label}</p>
                    <p className="text-[13px] text-toss-gray-500">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button onClick={() => {
                  const formEl = document.querySelector("[data-dirty]");
                  const isDirty = formEl?.getAttribute("data-dirty") === "true";
                  if (!isDirty) { setCategory(null); return; }
                  setShowBackModal(true);
                }}
                className="text-[13px] text-toss-gray-500 hover:text-toss-gray-700 transition mb-4 flex items-center gap-1">
                ← 카테고리 다시 선택
              </button>
              <div className="bg-white rounded-3xl shadow-sm border border-toss-gray-100 p-6">
                {category === "촬영비" ? (
                  <PDForm worker={worker} onSubmitSuccess={handleSubmitSuccess} onDraftSaved={handleDraftSaved} onDeleteDraft={handleDeleteDraft} loadDraft={loadDraft} />
                ) : category === "숏폼" ? (
                  <PDForm worker={worker} onSubmitSuccess={handleSubmitSuccess} onDraftSaved={handleDraftSaved} onDeleteDraft={handleDeleteDraft} loadDraft={loadDraft} rate={10000} roleName="숏폼" formTitle="숏폼 내역" />
                ) : category === "카드뉴스" ? (
                  <PDForm worker={worker} onSubmitSuccess={handleSubmitSuccess} onDraftSaved={handleDraftSaved} onDeleteDraft={handleDeleteDraft} loadDraft={loadDraft} rate={10000} roleName="카드뉴스" formTitle="카드뉴스 내역" />
                ) : (
                  <EditorForm worker={worker} onSubmitSuccess={handleSubmitSuccess} onDraftSaved={handleDraftSaved} onDeleteDraft={handleDeleteDraft} loadDraft={loadDraft} />
                )}
              </div>
            </div>
          )
        ) : (
          <SettlementHistory
            workerId={worker.id}
            role={"all"}
            contractType={worker.contractType}
            refreshKey={refreshKey}
            onResumeDraft={handleResumeDraft}
            initialData={cachedSettlements}
          />
        )}
      </div>

      {alertMsg && (
        <ConfirmModal title="알림" message={alertMsg} confirmText="확인" onConfirm={() => setAlertMsg(null)} />
      )}

      {showPinChange && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => setShowPinChange(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-toss-gray-900 mb-6">PIN 변경</h3>
            {pinError && <div className="mb-4 px-4 py-3 bg-red-50 text-toss-red rounded-2xl text-[14px]">{pinError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">현재 PIN</label>
                <input type="password" value={pinForm.current} inputMode="numeric"
                  onChange={(e) => setPinForm({ ...pinForm, current: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white"
                  placeholder="현재 4자리" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">새 PIN</label>
                <input type="password" value={pinForm.newPin} inputMode="numeric"
                  onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white"
                  placeholder="새 4자리" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-toss-gray-600 mb-1.5">새 PIN 확인</label>
                <input type="password" value={pinForm.confirm} inputMode="numeric"
                  onChange={(e) => setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] text-toss-gray-900 focus:border-toss-blue focus:ring-1 focus:ring-toss-blue/30 outline-none transition-all bg-white"
                  placeholder="다시 입력" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPinChange(false)}
                className="flex-1 py-3.5 bg-toss-gray-100 text-toss-gray-700 font-semibold rounded-2xl hover:bg-toss-gray-200 active:scale-[0.98] transition-all text-[15px]">
                취소
              </button>
              <button onClick={handleChangePin} disabled={pinChanging}
                className="flex-1 py-3.5 bg-toss-blue text-white font-semibold rounded-2xl hover:bg-toss-blue-hover disabled:opacity-50 active:scale-[0.98] transition-all text-[15px]">
                {pinChanging ? "변경 중..." : "변경"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackModal && (
        <ConfirmModal
          title="저장하지 않은 내용이 있어요"
          message="임시저장하지 않으면 작성한 내용이 사라져요."
          confirmText="저장"
          cancelText="저장 안 함"
          onConfirm={() => { setShowBackModal(false); document.getElementById("btn-draft-save")?.click(); }}
          onCancel={() => { setShowBackModal(false); setCategory(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="임시저장을 삭제할까요?"
          message="삭제하면 복구할 수 없습니다."
          confirmText="삭제"
          cancelText="취소"
          confirmColor="red"
          onConfirm={confirmDeleteDraft}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
