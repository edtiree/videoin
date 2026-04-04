"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";

interface TaskItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  deadlineDate: string | null;
  createdAt: string;
  isRead: boolean;
}

const TYPE_ICONS: Record<string, string> = { deadline: "📅", filming: "🎬", editing: "✂️" };
const TYPE_LABELS: Record<string, string> = { deadline: "업로드 마감", filming: "촬영 요청", editing: "편집 요청" };

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d === 1) return "어제";
  if (d < 30) return `${d}일 전`;
  return `${Math.floor(d / 30)}개월 전`;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerId, setWorkerId] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try {
      const w = JSON.parse(saved);
      setWorkerId(w.id);
      fetch(`/api/notifications?workerId=${w.id}`)
        .then(r => r.json())
        .then(data => {
          const items = (data.notifications || [])
            .filter((n: TaskItem) => ["deadline", "filming", "editing"].includes(n.type));
          // 마감일 임박순 (마감일 없는 건 뒤로)
          items.sort((a: TaskItem, b: TaskItem) => {
            if (a.deadlineDate && b.deadlineDate) return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
            if (a.deadlineDate) return -1;
            if (b.deadlineDate) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setTasks(items);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } catch { router.push("/"); }
  }, [router]);

  const handleRead = async (task: TaskItem) => {
    if (!task.isRead) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isRead: true } : t));
      await fetch("/api/notifications/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: task.id, workerId }),
      });
    }
    if (task.link) router.push(task.link);
  };

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      <TopNav title="요청된 작업" backHref="/" />

      <div className="max-w-lg md:max-w-3xl mx-auto px-5 md:px-8 mt-4">
        {loading ? (
          <div className="py-20 text-center text-toss-gray-400 text-[14px]">불러오는 중...</div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-toss-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-[28px]">📋</span>
            </div>
            <p className="text-[15px] font-bold text-toss-gray-900 mb-1">요청된 작업이 없습니다</p>
            <p className="text-[13px] text-toss-gray-400">관리자가 작업을 요청하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const daysLeft = task.deadlineDate
                ? Math.ceil((new Date(task.deadlineDate).getTime() - Date.now()) / 86400000)
                : null;
              const isOverdue = daysLeft !== null && daysLeft < 0;
              const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;
              const ddayText = daysLeft !== null
                ? (daysLeft < 0 ? `D+${Math.abs(daysLeft)}` : daysLeft === 0 ? "D-Day" : `D-${daysLeft}`)
                : null;

              return (
                <button
                  key={task.id}
                  onClick={() => handleRead(task)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                    task.isRead ? "border-toss-gray-100" : "border-toss-blue/30 bg-blue-50/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[24px] shrink-0 mt-0.5">{TYPE_ICONS[task.type] || "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[14px] font-bold ${task.isRead ? "text-toss-gray-700" : "text-toss-gray-900"}`}>
                            {task.title}
                          </span>
                          {!task.isRead && <span className="w-2 h-2 bg-toss-blue rounded-full shrink-0" />}
                        </div>
                        <span className="text-[12px] text-toss-gray-400 shrink-0">{timeAgo(task.createdAt)}</span>
                      </div>
                      <p className={`text-[13px] line-clamp-2 ${task.isRead ? "text-toss-gray-400" : "text-toss-gray-600"}`}>
                        {task.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-toss-gray-50 text-toss-gray-500 text-[11px] font-semibold rounded-md">
                          {TYPE_LABELS[task.type] || task.type}
                        </span>
                        {ddayText && (
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                            isOverdue ? "bg-gray-100 text-toss-gray-400" : isUrgent ? "bg-red-50 text-red-500" : "bg-blue-50 text-toss-blue"
                          }`}>
                            {ddayText}{task.deadlineDate ? ` (${task.deadlineDate})` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
