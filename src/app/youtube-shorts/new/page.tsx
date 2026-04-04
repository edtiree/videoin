"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function NewYoutubeShortsProject() {
  const router = useRouter();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    const saved = localStorage.getItem("worker");
    if (!saved) { router.replace("/"); return; }

    let worker: { id: string; allowedServices?: string[]; isAdmin?: boolean };
    try {
      worker = JSON.parse(saved);
      if (!worker.isAdmin && !worker.allowedServices?.includes("youtube-shorts")) {
        router.replace("/"); return;
      }
    } catch { router.replace("/"); return; }

    fetch("/api/youtube-shorts/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: worker.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.id) router.replace(`/youtube-shorts/${data.id}`);
        else router.replace("/youtube-shorts");
      })
      .catch(() => {
        alert("프로젝트 생성에 실패했습니다.");
        router.replace("/youtube-shorts");
      });
  }, [router]);

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-toss-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[15px] text-toss-gray-500 font-medium">프로젝트 생성 중...</p>
      </div>
    </div>
  );
}
