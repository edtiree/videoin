"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getCache, setCache } from "@/lib/cache";


interface Worker { id: string; name: string; allowedServices?: string[]; isAdmin?: boolean; }

interface Project {
  id: string;
  name: string;
  status?: string;
  updated_at: string;
  tool: string;
  toolLabel: string;
  toolIcon: string;
  href: string;
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "오늘";
  if (d === 1) return "어제";
  if (d < 30) return `${d}일 전`;
  return `${Math.floor(d / 30)}개월 전`;
}

const TOOLS = [
  { key: "youtube-title", label: "제목 생성기", icon: "✏️", api: "/api/youtube-title/projects", href: "/youtube-title" },
  { key: "youtube-shorts", label: "쇼츠 제작기", icon: "🎬", api: "/api/youtube-shorts/projects", href: "/youtube-shorts" },
  { key: "screen-material", label: "화면자료", icon: "🖼️", api: "/api/screen-material/projects", href: "/screen-material" },
  { key: "instagram-card", label: "카드뉴스", icon: "📸", api: "/api/card-projects", href: "/instagram-card" },
];

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "youtube-title", label: "제목 생성기" },
  { key: "youtube-shorts", label: "쇼츠" },
  { key: "screen-material", label: "화면자료" },
  { key: "instagram-card", label: "카드뉴스" },
];

export default function ToolsPage() {
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === "undefined") return [];
    return getCache<Project[]>("tools_projects") || [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return !getCache<Project[]>("tools_projects");
  });
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try {
      const w = JSON.parse(saved);
      setWorker(w);
    } catch { router.push("/"); }
  }, [router]);

  useEffect(() => {
    if (!worker) return;
    const fetchAll = async () => {
      const all: Project[] = [];
      await Promise.all(
        TOOLS.map(async (tool) => {
          try {
            const res = await fetch(`${tool.api}?workerId=${worker.id}`);
            if (!res.ok) return;
            const data = await res.json();
            const items = Array.isArray(data) ? data : [];
            items.forEach((p: Record<string, unknown>) => {
              all.push({
                id: (p.project_id || p.id) as string,
                name: (p.name as string) || "제목 없음",
                status: p.status as string,
                updated_at: (p.updated_at as string) || (p.created_at as string) || "",
                tool: tool.key,
                toolLabel: tool.label,
                toolIcon: tool.icon,
                href: tool.key === "instagram-card" ? tool.href : `${tool.href}/${p.project_id || p.id}`,
              });
            });
          } catch { /* skip */ }
        })
      );
      all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setProjects(all);
      setCache("tools_projects", all);
      setLoading(false);
    };
    fetchAll();
  }, [worker]);

  useEffect(() => {
    if (!loading) // eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).dismissSplash?.();
  }, [loading]);

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    for (const cat of CATEGORIES) {
      if (cat.key !== "all") {
        counts[cat.key] = projects.filter((p) => p.tool === cat.key).length;
      }
    }
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === "all") return projects;
    return projects.filter((p) => p.tool === selectedCategory);
  }, [projects, selectedCategory]);

  if (!worker) return <div className="min-h-full bg-gray-50" />;

  return (
    <div className="min-h-full bg-gray-50 pb-10">
      {/* 새 작업 시작 */}
      <div className="max-w-3xl md:max-w-5xl mx-auto px-5 md:px-8 pt-4 pb-2">
        <h2 className="text-[15px] font-bold text-toss-gray-900 mb-3">새 작업 시작</h2>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
          {[
            { label: "영상 피드백", icon: "🎬", href: "/review/new" },
            { label: "카드뉴스", icon: "📸", href: "/instagram-card" },
            { label: "유튜브 제목", icon: "✏️", href: "/youtube-title/new" },
            { label: "숏폼", icon: "🎬", href: "/youtube-shorts/new" },
            { label: "화면자료", icon: "🖼️", href: "/screen-material/new" },
          ].map((item) => (
            <button key={item.href} onClick={() => router.push(item.href)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border border-toss-gray-200 rounded-xl hover:border-toss-blue hover:bg-blue-50/30 active:scale-[0.97] transition-all">
              <span className="text-[16px]">{item.icon}</span>
              <span className="text-[13px] font-semibold text-toss-gray-800">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl md:max-w-5xl mx-auto px-5 md:px-8 pt-3 pb-2">
        <h2 className="text-[15px] font-bold text-toss-gray-900">최근 프로젝트</h2>
      </div>

      {/* Category filter tabs */}
      <div className="sticky top-0 z-10 bg-gray-50">
        <div className="max-w-3xl md:max-w-5xl mx-auto px-5 md:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const count = countByCategory[cat.key] ?? 0;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all ${
                    isActive
                      ? "bg-toss-gray-900 text-white"
                      : "bg-white border border-toss-gray-200 text-toss-gray-600"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-3xl md:max-w-5xl mx-auto px-5 md:px-8">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-toss-gray-100 p-4 animate-pulse">
                <div className="h-4 w-3/4 mb-2 bg-toss-gray-100 rounded" />
                <div className="h-3 w-1/2 bg-toss-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" fill="none" stroke="#3182f6" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-toss-gray-900 font-bold mb-1">프로젝트가 없습니다</p>
            <p className="text-toss-gray-400 text-sm">
              {selectedCategory === "all"
                ? "홈에서 도구를 선택해 프로젝트를 시작하세요"
                : "이 카테고리에 프로젝트가 없습니다"}
            </p>
          </div>
        )}

        {!loading && filteredProjects.length > 0 && (
          <div className="space-y-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {filteredProjects.map((p) => (
              <div
                key={`${p.tool}-${p.id}`}
                onClick={() => router.push(p.href)}
                className="bg-white rounded-2xl border border-toss-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md active:scale-[0.98] transition-all shadow-sm"
              >
                <span className="text-[28px]">{p.toolIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-toss-gray-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-semibold text-toss-blue bg-blue-50 px-2 py-0.5 rounded-md">{p.toolLabel}</span>
                    <span className="text-[11px] text-toss-gray-400">{timeAgo(p.updated_at)}</span>
                  </div>
                </div>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
