"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
  deadlineDate?: string;
  isRead: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  deadline: "📅",
  filming: "🎬",
  editing: "✂️",
  announcement: "📢",
};

const TYPE_LABELS: Record<string, string> = {
  deadline: "업로드 마감",
  filming: "촬영 요청",
  editing: "편집 요청",
  announcement: "공지사항",
};

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerId, setWorkerId] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try {
      const w = JSON.parse(saved);
      setWorkerId(w.id);
      fetch(`/api/notifications?workerId=${w.id}`)
        .then((r) => r.json())
        .then((data) => setNotifications(data.notifications || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch { router.push("/"); }
  }, [router]);

  const handleRead = async (notif: Notification) => {
    if (!notif.isRead) {
      // 즉시 UI 업데이트
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      await fetch("/api/notifications/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notif.id, workerId }),
      });
    }
    if (notif.link) router.push(notif.link);
  };

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      <TopNav title="알림" backHref="/" />

      <div className="max-w-lg md:max-w-3xl mx-auto px-5 md:px-8 mt-4">
        {loading ? (
          <div className="py-20 text-center text-toss-gray-400 text-[14px]">불러오는 중...</div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-toss-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-toss-gray-900 mb-1">새로운 알림이 없습니다</p>
            <p className="text-[13px] text-toss-gray-400">알림이 오면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleRead(notif)}
                className={`w-full text-left bg-white rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                  notif.isRead
                    ? "border-toss-gray-100"
                    : "border-toss-blue/30 bg-blue-50/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-[24px] shrink-0 mt-0.5">
                    {TYPE_ICONS[notif.type] || "📢"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] font-bold ${notif.isRead ? "text-toss-gray-700" : "text-toss-gray-900"}`}>
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-toss-blue rounded-full shrink-0" />
                        )}
                      </div>
                      <span className="text-[12px] text-toss-gray-400 shrink-0">{timeAgo(notif.createdAt)}</span>
                    </div>
                    <p className={`text-[13px] line-clamp-2 ${notif.isRead ? "text-toss-gray-400" : "text-toss-gray-600"}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {notif.type && (
                        <span className="px-2 py-0.5 bg-toss-gray-50 text-toss-gray-500 text-[11px] font-semibold rounded-md">
                          {TYPE_LABELS[notif.type] || notif.type}
                        </span>
                      )}
                      {notif.deadlineDate && (() => {
                        const daysLeft = Math.ceil((new Date(notif.deadlineDate).getTime() - Date.now()) / 86400000);
                        const ddayText = daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : daysLeft === 0 ? "D-Day" : `D-${daysLeft}`;
                        const color = daysLeft < 0 ? "bg-gray-100 text-toss-gray-400" : daysLeft <= 2 ? "bg-red-50 text-red-500" : "bg-blue-50 text-toss-blue";
                        return <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${color}`}>{ddayText} ({notif.deadlineDate})</span>;
                      })()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
