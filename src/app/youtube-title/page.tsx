"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { timeAgo } from "@/lib/youtube-title/utils";

interface Worker {
  id: string;
  name: string;
  allowedServices?: string[];
}

interface ProjectSummary {
  project_id: string;
  name: string;
  input_type: string;
  created_at: string;
  updated_at: string;
  video_type: string;
  video_thumbnail: string;
}

export default function YouTubeTitleDashboard() {
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try {
      const w = JSON.parse(saved);
      if (!w.allowedServices?.includes("youtube-title")) { router.push("/"); return; }
      setWorker(w);
    } catch { router.push("/"); }
  }, [router]);

  useEffect(() => {
    if (!worker) return;
    fetch(`/api/youtube-title/projects?workerId=${worker.id}`)
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [worker]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    await fetch(`/api/youtube-title/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.project_id !== id));
  };

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-xs text-center space-y-4">
          <h1 className="text-[20px] font-bold text-toss-gray-900">로그인이 필요합니다</h1>
          <p className="text-[14px] text-toss-gray-500">홈에서 로그인 후 이용해주세요.</p>
          <a href="/" className="inline-block px-6 py-3 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover transition">홈으로</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-toss-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-toss-gray-400 hover:text-toss-gray-600 text-[14px]">
              ← 홈
            </Link>
            <h1 className="text-[20px] font-bold text-toss-gray-900">유튜브 제목 생성</h1>
          </div>
          <button
            onClick={() => router.push("/youtube-title/new")}
            className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-xl hover:bg-toss-blue-hover transition"
          >
            + 새 프로젝트
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 mt-6">
        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-toss-gray-100 p-4 animate-pulse">
                <div className="aspect-video rounded-xl mb-3 bg-toss-gray-100" />
                <div className="h-4 w-3/4 mb-2 bg-toss-gray-100 rounded" />
                <div className="h-3 w-1/2 bg-toss-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3182f6" strokeWidth="1.5">
                <path d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                <path d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-toss-gray-900 mb-2">아직 프로젝트가 없습니다</h3>
            <p className="text-sm text-toss-gray-400 mb-6">첫 번째 프로젝트를 만들어 AI 제목 생성을 시작해 보세요</p>
            <button
              onClick={() => router.push("/youtube-title/new")}
              className="px-6 py-2.5 bg-toss-blue text-white text-sm font-semibold rounded-xl hover:bg-toss-blue-hover transition"
            >
              첫 프로젝트 만들기
            </button>
          </div>
        )}

        {/* Project Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.project_id}
                onClick={() => router.push(`/youtube-title/${p.project_id}`)}
                className="bg-white rounded-2xl border border-toss-gray-100 p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group relative shadow-sm"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-toss-gray-50 rounded-xl mb-3.5 overflow-hidden">
                  {p.video_thumbnail ? (
                    <img
                      src={p.video_thumbnail}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-toss-gray-100">
                      <svg width="28" height="28" fill="none" stroke="#b0b8c1" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                        <path d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <h3 className="font-bold text-[14px] text-toss-gray-900 truncate mb-1.5 group-hover:text-toss-blue transition-colors">
                  {p.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-toss-gray-400">
                  {p.video_type && (
                    <span className="bg-blue-50 text-toss-blue px-2 py-0.5 rounded-md text-[10px] font-semibold">
                      {p.video_type}
                    </span>
                  )}
                  <span>{timeAgo(p.updated_at)}</span>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => handleDelete(e, p.project_id)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur rounded-lg p-1.5 text-toss-gray-400 hover:text-toss-red hover:bg-red-50 transition-all shadow-sm"
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
