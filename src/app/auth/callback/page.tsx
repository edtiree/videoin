"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseAuthBrowser } from "@/lib/supabase-auth-browser";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseAuthBrowser();

    // URL에서 code 또는 hash fragment의 access_token 처리
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        // PKCE flow: code → session 교환
        await supabase.auth.exchangeCodeForSession(code);
      }

      // hash fragment flow도 자동 처리됨 (supabase-js가 onAuthStateChange에서)
      // 세션 확인 후 홈으로 이동
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
      } else {
        // 세션이 없으면 잠시 대기 후 재시도 (onAuthStateChange가 처리 중일 수 있음)
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          router.replace(retrySession ? "/" : "/");
        }, 1000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-toss-gray-500">로그인 처리 중...</p>
      </div>
    </div>
  );
}
