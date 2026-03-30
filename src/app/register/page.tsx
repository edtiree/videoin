"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-[22px] font-bold text-toss-gray-900 mb-2">가입 완료!</h2>
          <p className="text-toss-gray-500 text-[14px] mb-8">관리자 승인 후 이용 가능합니다.</p>
          <button onClick={() => router.push("/")}
            className="w-full py-4 bg-toss-blue text-white text-[16px] font-semibold rounded-2xl hover:bg-toss-blue-hover transition">
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <RegisterForm onSuccess={() => setDone(true)} onBack={() => router.push("/")} />
    </div>
  );
}
