"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCache, setCache } from "@/lib/cache";

export default function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const cached = getCache<number>("notif_unread");
    if (cached !== null) setCount(cached);

    const saved = localStorage.getItem("worker");
    if (!saved) return;
    let workerId: string;
    try { workerId = JSON.parse(saved).id; } catch { return; }

    const fetchCount = () => {
      fetch(`/api/notifications/unread-count?workerId=${workerId}`)
        .then((r) => r.json())
        .then((data) => {
          const c = data.unreadCount || 0;
          setCount(c);
          setCache("notif_unread", c);
        })
        .catch(() => {});
    };

    fetchCount();

    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [pathname]);

  return (
    <button
      onClick={() => router.push("/notifications")}
      className="relative p-1.5 -mr-1.5 hover:bg-toss-gray-50 rounded-xl transition"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
