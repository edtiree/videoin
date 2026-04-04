"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";


interface Worker {
  id: string;
  name: string;
  phone: string;
  role: string;
  contractType: string;
  isAdmin?: boolean;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const [worker, setWorker] = useState<Worker | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try { setWorker(JSON.parse(saved)); } catch { router.push("/"); }
  }, [router]);

  const handleLogout = () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    localStorage.removeItem("worker");
    router.push("/");
  };

  if (!worker) return <div className="min-h-full bg-gray-50" />;

  return (
    <div className="min-h-full bg-gray-50 pb-10">
      <div className="max-w-3xl md:max-w-4xl mx-auto px-5 md:px-8 mt-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 bg-toss-blue rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">{worker.name[0]}</span>
            </div>
            <div>
              <p className="text-[18px] font-bold text-toss-gray-900">{worker.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {worker.isAdmin && (
                  <span className="text-[10px] font-bold bg-toss-blue text-white px-2 py-0.5 rounded-md">관리자</span>
                )}
                <span className="text-[12px] text-toss-gray-400">{worker.contractType}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-toss-gray-50">
              <span className="text-[13px] text-toss-gray-500">전화번호</span>
              <span className="text-[13px] font-semibold text-toss-gray-900">{worker.phone}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-toss-gray-50">
              <span className="text-[13px] text-toss-gray-500">계약유형</span>
              <span className="text-[13px] font-semibold text-toss-gray-900">{worker.contractType}</span>
            </div>
            {worker.bankName && (
              <div className="flex justify-between items-center py-2 border-b border-toss-gray-50">
                <span className="text-[13px] text-toss-gray-500">은행</span>
                <span className="text-[13px] font-semibold text-toss-gray-900">{worker.bankName}</span>
              </div>
            )}
            {worker.bankAccount && (
              <div className="flex justify-between items-center py-2 border-b border-toss-gray-50">
                <span className="text-[13px] text-toss-gray-500">계좌번호</span>
                <span className="text-[13px] font-semibold text-toss-gray-900">{worker.bankAccount}</span>
              </div>
            )}
            {worker.accountHolder && (
              <div className="flex justify-between items-center py-2">
                <span className="text-[13px] text-toss-gray-500">예금주</span>
                <span className="text-[13px] font-semibold text-toss-gray-900">{worker.accountHolder}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => router.push("/settlement")}
            className="w-full flex items-center justify-between p-4 border-b border-toss-gray-50 hover:bg-toss-gray-50 transition"
          >
            <span className="text-[14px] text-toss-gray-900">정산 관리</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-4 border-b border-toss-gray-50 hover:bg-toss-gray-50 transition"
          >
            <span className="text-[14px] text-toss-gray-900">다크 모드</span>
            <div className={`w-11 h-6 rounded-full relative transition-colors ${theme === "dark" ? "bg-toss-blue" : "bg-toss-gray-300"}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-[22px]" : "translate-x-0.5"}`} />
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition"
          >
            <span className="text-[14px] text-toss-red">로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  );
}
