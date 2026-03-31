"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/stores/titleProjectStore";
import TopNav from "@/components/TopNav";
import TranscriptViewer from "@/components/youtube-title/TranscriptViewer";
import AnalysisResult from "@/components/youtube-title/AnalysisResult";
import SimilarVideoList from "@/components/youtube-title/SimilarVideoList";
import TitleSettings from "@/components/youtube-title/TitleSettings";
import TitleResultCard from "@/components/youtube-title/TitleResultCard";
import TitleEvaluator from "@/components/youtube-title/TitleEvaluator";

interface Worker {
  id: string;
  name: string;
  allowedServices?: string[];
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useProjectStore();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try {
      const w = JSON.parse(saved);
      const isAdmin = w.isAdmin === true;
      if (!isAdmin && !w.allowedServices?.includes("youtube-title")) { router.push("/"); return; }
      setWorker(w);
    } catch { router.push("/"); }
  }, [router]);

  useEffect(() => {
    if (!worker) return;
    fetch(`/api/youtube-title/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        store.loadProject(data);
        if (!store.searchKeywords && data.analysis) {
          const queries = data.analysis.search_queries || [];
          const guestName = data.analysis.guest_name || "";
          const kws = [...queries];
          if (guestName) kws.unshift(guestName);
          store.setSearchKeywords(kws.join(", "));
        }
      })
      .catch(() => {
        alert("프로젝트를 불러올 수 없습니다");
        router.replace("/youtube-title");
      })
      .finally(() => setPageLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, worker]);

  const autoSave = async () => {
    if (!store.projectId) return;
    try {
      await fetch(`/api/youtube-title/projects/${store.projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: store.projectName,
          transcript: store.transcript,
          analysis: store.analysis,
          similar_videos: store.similarVideos,
          titles: store.titles,
          video_type: store.videoType,
          search_keywords: store.searchKeywords,
          ref_channels: store.refChannels,
          video_thumbnail: store.videoThumbnail,
        }),
      });
    } catch {
      /* silent */
    }
  };

  const handleAnalyze = async () => {
    if (!store.transcript) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/youtube-title/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: store.transcript }),
      });
      const data = await res.json();
      store.setAnalysis(data);

      const guestName = data.guest_name || "";
      const summary = data.summary || "";
      if (guestName) store.setProjectName(`${guestName} 인터뷰`);
      else if (summary) store.setProjectName(summary.slice(0, 20));

      const queries = data.search_queries || [];
      const kws = guestName ? [guestName, ...queries] : queries;
      store.setSearchKeywords(kws.join(", "));
      await autoSave();
    } catch {
      alert("분석에 실패했습니다");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!store.transcript) return;
    setGenerating(true);
    try {
      const selectedVideos = store.similarVideos.filter((v) =>
        store.selectedRefVideoIds.has(v.video_id)
      );
      const res = await fetch("/api/youtube-title/titles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: store.transcript,
          analysis_summary: store.analysis?.summary || "",
          similar_videos: selectedVideos.length > 0 ? selectedVideos : undefined,
          title_style: store.titleStyle,
          ref_channels: store.refChannels.length > 0 ? store.refChannels : undefined,
          extra_request: store.extraRequest,
        }),
      });
      const data = await res.json();
      store.setTitles(data.titles);
      await autoSave();
    } catch {
      alert("제목 생성에 실패했습니다");
    } finally {
      setGenerating(false);
    }
  };

  if (pageLoading || !worker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-toss-blue" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const bgImage = store.videoThumbnail || store.videoFrames[store.selectedFrame] || undefined;
  const channelName = store.refChannels[0]?.name || "내 채널";
  const channelThumb = store.refChannels[0]?.thumbnail;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <TopNav title={store.projectName} backHref="/youtube-title" rightContent={
        store.videoType ? (
          <span className="text-[10px] font-bold bg-blue-50 text-toss-blue px-3 py-1.5 rounded-lg uppercase">
            {store.videoType}
          </span>
        ) : undefined
      } />

      <div className="max-w-4xl mx-auto px-5 mt-6 space-y-5">
        {/* 1. Transcript */}
        {store.transcript && <TranscriptViewer transcript={store.transcript} />}

        {/* 2. Analyze button */}
        {store.transcript && !store.analysis && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-70 text-white text-sm font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            {analyzing ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI 영상 분석 중...
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                AI 영상 분석하기
              </>
            )}
          </button>
        )}

        {/* 3. Analysis */}
        {store.analysis && <AnalysisResult analysis={store.analysis} />}

        {/* 4. Similar Videos */}
        {store.analysis && <SimilarVideoList />}

        {/* 5. Title Settings + Generate */}
        {store.analysis && (
          <>
            <TitleSettings />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-70 text-white text-sm font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              {generating ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI가 제목 생성 중...
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  제목 생성하기
                </>
              )}
            </button>
          </>
        )}

        {/* 6. Title Results */}
        {store.titles.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-toss-gray-900">추천 제목</h2>
              <span className="text-xs font-bold bg-toss-blue text-white px-3 py-1 rounded-full shadow-sm">
                {store.titles.length}개
              </span>
            </div>

            {/* Frame Selector */}
            {store.videoFrames.length > 0 && (
              <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
                <p className="text-[10px] text-toss-gray-400 font-semibold uppercase tracking-wider mb-3">썸네일 배경 선택</p>
                <div className="flex gap-2">
                  {store.videoFrames.map((frame, i) => (
                    <button
                      key={i}
                      onClick={() => store.setSelectedFrame(i)}
                      className={`flex-1 aspect-video rounded-xl overflow-hidden transition-all duration-200 ${
                        i === store.selectedFrame
                          ? "ring-2 ring-toss-blue ring-offset-2 shadow-lg"
                          : "opacity-50 hover:opacity-80"
                      }`}
                    >
                      <img src={frame} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {store.titles.map((t, i) => (
              <TitleResultCard
                key={i}
                title={t}
                bgImage={bgImage}
                channelName={channelName}
                channelThumb={channelThumb}
                similarVideos={store.similarVideos}
              />
            ))}
          </div>
        )}

        {/* 7. Title Evaluation */}
        {store.titles.length > 0 && <TitleEvaluator />}

        {/* Bottom spacing */}
        <div className="h-10" />
      </div>
    </div>
  );
}
