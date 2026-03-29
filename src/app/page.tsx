"use client";

import Link from "next/link";

const MENUS = [
  { href: "/settlement", icon: "💰", title: "정산 관리", desc: "촬영비·편집비 정산서 작성 및 제출" },
  { href: "/ads", icon: "📺", title: "광고 관리", desc: "광고 DB, 정산현황, 캘린더" },
  { href: "/admin", icon: "⚙️", title: "관리자", desc: "직원 관리, 정산 승인, 대시보드" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-[28px] font-bold text-toss-gray-900 leading-tight mb-2">
            영상 제작팀<br />내부 시스템
          </h1>
          <p className="text-toss-gray-500 text-[15px]">사용할 서비스를 선택하세요</p>
        </div>

        <div className="space-y-3">
          {MENUS.map((m) => (
            <Link key={m.href} href={m.href}
              className="w-full flex items-center gap-4 bg-white rounded-2xl border border-toss-gray-100 p-5 hover:border-toss-blue hover:bg-blue-50/30 active:scale-[0.98] transition-all text-left shadow-sm">
              <span className="text-[32px]">{m.icon}</span>
              <div>
                <p className="text-[17px] font-bold text-toss-gray-900">{m.title}</p>
                <p className="text-[13px] text-toss-gray-500 mt-0.5">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
