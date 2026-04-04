"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getCache, setCache } from "@/lib/cache";

interface Recommendation {
  id: string;
  reason: string;
}

export default function AIRecommendation() {
  const router = useRouter();
  const { isLoggedIn, profile } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !profile) return;

    const cached = getCache<Recommendation[]>("ai_recommendations");
    if (cached) { setRecommendations(cached); return; }

    const isCreator = profile.role?.includes("크리에이터/사장");
    const type = isCreator ? "editor" : "job";

    setLoading(true);
    fetch("/api/ai/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile.id, type }),
    })
      .then((r) => r.json())
      .then((data) => {
        const recs = data.recommendations || [];
        setRecommendations(recs);
        setCache("ai_recommendations", recs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, profile]);

  if (!isLoggedIn || (!loading && recommendations.length === 0)) return null;

  const isCreator = profile?.role?.includes("크리에이터/사장");

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-blue">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="text-[14px] font-bold text-toss-blue">AI 추천</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
          <span className="text-[13px] text-toss-gray-500">맞춤 추천을 준비하고 있어요...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map((rec) => (
            <button
              key={rec.id}
              onClick={() => router.push(isCreator ? `/editors/${rec.id}` : `/jobs/${rec.id}`)}
              className="w-full flex items-center gap-3 bg-white/70 dark:bg-white/10 rounded-xl p-3 text-left hover:bg-white/90 transition"
            >
              <div className="w-8 h-8 rounded-full bg-toss-blue/10 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-blue">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                </svg>
              </div>
              <p className="text-[13px] text-toss-gray-700 flex-1">{rec.reason}</p>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-gray-300 flex-shrink-0"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
