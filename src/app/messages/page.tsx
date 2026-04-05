"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

interface Thread {
  id: string;
  last_message_preview: string | null;
  last_message_at: string;
  other_user: { id: string; nickname: string | null; profile_image: string | null } | null;
  unread_count: number;
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "방금";
  if (d < 60) return `${d}분 전`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  return `${days}일 전`;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  // 새 메시지 시작 (쿼리 파라미터 처리)
  useEffect(() => {
    if (!isLoggedIn) { openLoginModal(); return; }
    const toUserId = searchParams.get("to");
    const jobId = searchParams.get("job");

    if (toUserId && profile) {
      // 기존 스레드가 있는지 확인 후 라우팅
      fetch(`/api/messages?user_id=${profile.id}`)
        .then((r) => r.json())
        .then((data: Thread[]) => {
          const existing = data.find((t) => t.other_user?.id === toUserId);
          if (existing) {
            router.replace(`/messages/${existing.id}${jobId ? `?job=${jobId}` : ""}`);
          } else {
            // 새 스레드 생성을 위해 첫 메시지 전송 페이지로
            router.replace(`/messages/new?to=${toUserId}${jobId ? `&job=${jobId}` : ""}`);
          }
        });
    }
  }, [isLoggedIn, profile, searchParams, router, openLoginModal]);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/messages?user_id=${profile.id}`)
      .then((r) => r.json())
      .then((data) => { setThreads(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [profile]);

  if (!isLoggedIn) return null;

  return (
    <>
      <TopNav title="쪽지" backHref="/" />
      <div className="max-w-[1200px] mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-toss-gray-400 text-[15px]">주고받은 쪽지가 없습니다</p>
            <p className="text-toss-gray-300 text-[13px] mt-1">공고나 편집자 프로필에서 쪽지를 보내보세요</p>
          </div>
        ) : (
          <div className="divide-y divide-toss-gray-100">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => router.push(`/messages/${thread.id}`)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-toss-gray-50 transition text-left"
              >
                <div className="w-11 h-11 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-[16px] font-bold text-toss-gray-400">
                    {thread.other_user?.nickname?.[0] || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-semibold text-toss-gray-900">
                      {thread.other_user?.nickname || "알 수 없음"}
                    </span>
                    <span className="text-[11px] text-toss-gray-300 flex-shrink-0">{timeAgo(thread.last_message_at)}</span>
                  </div>
                  <p className="text-[13px] text-toss-gray-400 truncate mt-0.5">{thread.last_message_preview || "..."}</p>
                </div>
                {thread.unread_count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-toss-red text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {thread.unread_count > 9 ? "9+" : thread.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
