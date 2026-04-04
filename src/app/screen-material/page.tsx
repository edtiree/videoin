"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import { getCache, setCache } from "@/lib/cache";

interface Worker {
  id: string;
  name: string;
  allowedServices?: string[];
  isAdmin?: boolean;
}

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  video_name: string | null;
  video_info: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function timeAgo(isoDate: string): string {
  if (!isoDate) return "";
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

function statusBadge(status: string) {
  switch (status) {
    case "completed":
      return { label: "완료", bg: "bg-green-50", text: "text-green-600" };
    case "transcribed":
      return { label: "음성인식 완료", bg: "bg-blue-50", text: "text-toss-blue" };
    default:
      return { label: "작업 중", bg: "bg-toss-gray-50", text: "text-toss-gray-500" };
  }
}

export default function ScreenMaterialDashboard() {
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => { const c = getCache<ProjectSummary[]>("screen_projects"); if (c) { setProjects(c); setLoading(false); } }, []);

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try {
      const w = JSON.parse(saved);
      const isAdmin = w.isAdmin === true;
      if (!isAdmin && !w.allowedServices?.includes("screen-material")) {
        router.push("/");
        return;
      }
      setWorker(w);
    } catch { router.push("/"); }
  }, [router]);

  useEffect(() => {
    if (!worker) return;
    fetch(`/api/screen-material/projects?workerId=${worker.id}`)
      .then((r) => r.json())
      .then((data) => { setProjects(data); setCache("screen_projects", data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [worker]);

  const handleNewProject = async () => {
    if (!worker || creating) return;
    setCreating(true);
    try {
      const resp = await fetch("/api/screen-material/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.id }),
      });
      const data = await resp.json();
      if (data.id) {
        router.push(`/screen-material/${data.id}`);
      }
    } catch {
      alert("프로젝트 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    await fetch(`/api/screen-material/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === projects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(projects.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}개 프로젝트를 삭제하시겠습니까?`)) return;
    setDeleting(true);
    await Promise.all(
      [...selected].map((id) =>
        fetch(`/api/screen-material/projects/${id}`, { method: "DELETE" })
      )
    );
    setProjects((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    setSelectMode(false);
    setDeleting(false);
  };

  if (!worker) {
    return (
      <div className="min-h-full flex items-center justify-center px-6">
        <div className="w-full max-w-xs text-center space-y-4">
          <h1 className="text-[20px] font-bold text-toss-gray-900">로그인이 필요합니다</h1>
          <p className="text-[14px] text-toss-gray-500">홈에서 로그인 후 이용해주세요.</p>
          <a href="/" className="inline-block px-6 py-3 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover transition">홈으로</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-10">
      <TopNav title="화면자료 제작기" backHref="/" rightContent={
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <button
              onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }}
              className={`px-4 py-2 text-[13px] font-semibold rounded-xl transition ${
                selectMode
                  ? "bg-toss-gray-100 text-toss-gray-600"
                  : "bg-toss-gray-50 text-toss-gray-400 hover:bg-toss-gray-100"
              }`}
            >
              {selectMode ? "취소" : "선택"}
            </button>
          )}
          <button
            onClick={handleNewProject}
            disabled={creating}
            className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-xl hover:bg-toss-blue-hover disabled:opacity-50 transition"
          >
            {creating ? "생성 중..." : "+ 새 프로젝트"}
          </button>
        </div>
      } />

      <div className="max-w-3xl mx-auto px-5 mt-6">
        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-toss-gray-100 p-5 animate-pulse">
                <div className="h-4 w-3/4 mb-3 bg-toss-gray-100 rounded" />
                <div className="h-3 w-1/2 mb-2 bg-toss-gray-100 rounded" />
                <div className="h-3 w-1/3 bg-toss-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3182f6" strokeWidth="1.5">
                <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9a2.25 2.25 0 0 0-2.25 2.25v9A2.25 2.25 0 0 0 4.5 18.75z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-toss-gray-900 mb-2">아직 프로젝트가 없습니다</h3>
            <p className="text-sm text-toss-gray-400 mb-6">첫 번째 프로젝트를 만들어 화면자료 제작을 시작해 보세요</p>
            <button
              onClick={handleNewProject}
              disabled={creating}
              className="px-6 py-2.5 bg-toss-blue text-white text-sm font-semibold rounded-xl hover:bg-toss-blue-hover disabled:opacity-50 transition"
            >
              {creating ? "생성 중..." : "첫 프로젝트 만들기"}
            </button>
          </div>
        )}

        {/* Select Mode Bar */}
        {selectMode && projects.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-toss-gray-100 px-5 py-3 mb-4 shadow-sm">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-[13px] font-semibold text-toss-gray-600 hover:text-toss-blue transition"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                selected.size === projects.length ? "bg-toss-blue border-toss-blue" : "border-toss-gray-300"
              }`}>
                {selected.size === projects.length && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                )}
              </div>
              전체 선택 ({selected.size}/{projects.length})
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selected.size === 0 || deleting}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-xl transition"
            >
              {deleting ? "삭제 중..." : `${selected.size}개 삭제`}
            </button>
          </div>
        )}

        {/* Project Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => {
              const badge = statusBadge(p.status);
              return (
                <div
                  key={p.id}
                  onClick={() => selectMode ? toggleSelect(p.id) : router.push(`/screen-material/${p.id}`)}
                  className={`bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group relative shadow-sm ${
                    selectMode && selected.has(p.id) ? "border-toss-blue ring-2 ring-toss-blue/20" : "border-toss-gray-100"
                  }`}
                >
                  {/* Checkbox */}
                  {selectMode && (
                    <div className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${
                      selected.has(p.id) ? "bg-toss-blue border-toss-blue" : "bg-white/80 backdrop-blur border-toss-gray-300"
                    }`}>
                      {selected.has(p.id) && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <h3 className="font-bold text-[14px] text-toss-gray-900 truncate mb-2 group-hover:text-toss-blue transition-colors">
                    {p.name}
                  </h3>

                  {p.video_name && (
                    <p className="text-[12px] text-toss-gray-500 truncate mb-2">
                      {p.video_name}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-toss-gray-400">
                    <span className={`${badge.bg} ${badge.text} px-2 py-0.5 rounded-md text-[10px] font-semibold`}>
                      {badge.label}
                    </span>
                    <span>{timeAgo(p.updated_at)}</span>
                  </div>

                  {/* Delete (hover, non-select mode only) */}
                  {!selectMode && (
                    <button
                      onClick={(e) => handleDelete(e, p.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur rounded-lg p-1.5 text-toss-gray-400 hover:text-toss-red hover:bg-red-50 transition-all shadow-sm"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
