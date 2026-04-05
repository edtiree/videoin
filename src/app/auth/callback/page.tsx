"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseAuthBrowser } from "@/lib/supabase-auth-browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseAuthBrowser();

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("세션 교환 에러:", exchangeError);
            // 에러가 나도 홈으로 이동 (이미 세션이 있을 수 있음)
          }
        }
      } catch (e) {
        console.error("콜백 에러:", e);
      }

      // 무조건 홈으로 이동 (AuthProvider가 세션 감지해서 처리)
      window.location.href = "/";
    };

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-toss-gray-500">로그인 처리 중...</p>
        {error && <p className="text-[12px] text-toss-red mt-2">{error}</p>}
      </div>
    </div>
  );
}
