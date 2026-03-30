"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./card-styles.css";

interface WorkerSession {
  id: string;
  name: string;
  allowedServices?: string[];
}

export default function InstagramCardPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{ destroy: () => void } | null>(null);
  const [worker, setWorker] = useState<WorkerSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) {
      router.push("/");
      return;
    }
    try {
      const w = JSON.parse(saved);
      if (!w.allowedServices?.includes("instagram-card")) {
        router.push("/");
        return;
      }
      setWorker(w);
    } catch {
      router.push("/");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!worker || !containerRef.current || engineRef.current) return;

    import("./card-engine").then(({ initCardMaker }) => {
      if (!containerRef.current) return;
      engineRef.current = initCardMaker(containerRef.current, {
        workerId: worker.id,
        onNavigateHome: () => router.push("/"),
      });
    });

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [worker, router]);

  if (loading || !worker) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "#888" }}>로딩 중...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="card-maker-root"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
