"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import TopNav from "@/components/TopNav";

interface Worker {
  id: string;
  name: string;
  allowedServices?: string[];
  isAdmin?: boolean;
}

interface ShortClip {
  short_id: string;
  title: string;
  start_time: number;
  end_time: number;
  duration: number;
  virality_score: number;
  reasoning: string;
  hook_text: string;
  download_url: string;
}

interface JobResults {
  job_id: string;
  source_filename: string;
  source_duration: number;
  shorts: ShortClip[];
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  video_name: string | null;
  settings: { maxShorts?: number; minDuration?: number; maxDuration?: number } | null;
  shorts: JobResults | null;
  railway_job_id: string | null;
  worker_id: string;
  created_at: string;
  updated_at: string;
}

type View = "upload" | "processing" | "results" | "error";

const SERVER_URL = process.env.NEXT_PUBLIC_SHORTS_SERVER_URL || "https://youtube-shorts-server-production.up.railway.app";

const PIPELINE_STEPS = [
  { key: "uploading", label: "영상 업로드" },
  { key: "extracting_audio", label: "오디오 추출 중..." },
  { key: "transcribing", label: "음성 인식 중..." },
  { key: "analyzing", label: "AI 분석 중..." },
  { key: "cutting", label: "영상 편집 중..." },
] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
  return (bytes / 1e3).toFixed(0) + " KB";
}

function scoreColor(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-toss-blue";
  if (score >= 4) return "bg-toss-orange";
  return "bg-toss-red";
}

function scoreTextColor(score: number): string {
  if (score >= 8) return "text-emerald-600";
  if (score >= 6) return "text-toss-blue";
  if (score >= 4) return "text-orange-600";
  return "text-red-600";
}

export default function YouTubeShortsDetailPage() {
  const router = useRouter();
  const { id: projectId } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(true);

  // View state
  const [view, setView] = useState<View>("upload");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [maxShorts, setMaxShorts] = useState(5);
  const [minDuration, setMinDuration] = useState(15);
  const [maxDuration, setMaxDuration] = useState(58);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Processing state
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState("");
  const [currentStep, setCurrentStep] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results state
  const [results, setResults] = useState<JobResults | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());

  // Error state
  const [errorMessage, setErrorMessage] = useState("");

  // Save project helper
  const saveProject = useCallback(async (update: Record<string, unknown>) => {
    try {
      await fetch(`/api/youtube-shorts/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
    } catch {
      // Silent fail for auto-save
    }
  }, [projectId]);

  // Auth check
  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try {
      const w = JSON.parse(saved);
      const isAdmin = w.isAdmin === true;
      if (!isAdmin && !w.allowedServices?.includes("youtube-shorts")) { router.push("/"); return; }
      setWorker(w);
    } catch { router.push("/"); }
    setLoading(false);
  }, [router]);

  // Load project on mount
  useEffect(() => {
    if (!worker || !projectId) return;
    (async () => {
      try {
        const resp = await fetch(`/api/youtube-shorts/projects/${projectId}`);
        if (!resp.ok) {
          router.push("/youtube-shorts");
          return;
        }
        const project: ProjectData = await resp.json();

        // Restore settings if saved
        if (project.settings) {
          if (project.settings.maxShorts) setMaxShorts(project.settings.maxShorts);
          if (project.settings.minDuration) setMinDuration(project.settings.minDuration);
          if (project.settings.maxDuration) setMaxDuration(project.settings.maxDuration);
        }

        // If completed with results, show results directly
        if (project.status === "completed" && project.shorts) {
          setResults(project.shorts);
          setJobId(project.railway_job_id);
          setView("results");
        } else if (project.status === "processing" && project.railway_job_id) {
          // Resume polling if still processing
          setJobId(project.railway_job_id);
          setView("processing");
          startPolling(project.railway_job_id);
        }
        // Otherwise stay on upload view (draft)
      } catch {
        router.push("/youtube-shorts");
      } finally {
        setProjectLoading(false);
      }
    })();
    // startPolling is stable via useCallback, but we only want this on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker, projectId, router]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleFile = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    const allowed = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    if (!allowed.includes(ext)) {
      alert("지원하지 않는 파일 형식입니다.\n지원: " + allowed.join(", "));
      return;
    }
    setFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setView("error");
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((jId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`${SERVER_URL}/api/jobs/${jId}/status`);
        if (!resp.ok) return;
        const data = await resp.json();

        setCurrentStatus(data.status);
        setCurrentStep(data.current_step);
        setProgressPercent(data.progress_percent);

        if (data.status === "completed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          // Fetch results
          try {
            const resResp = await fetch(`${SERVER_URL}/api/jobs/${jId}/results`);
            if (!resResp.ok) throw new Error("결과를 불러오는데 실패했습니다.");
            const resData: JobResults = await resResp.json();
            setResults(resData);
            setView("results");
            // Auto-save completed results
            saveProject({ shorts: resData, status: "completed" });
          } catch (err) {
            showError(err instanceof Error ? err.message : "결과를 불러오는데 실패했습니다.");
          }
        } else if (data.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          showError(data.error || "알 수 없는 오류가 발생했습니다.");
        }
      } catch {
        // Network error during polling - keep trying
      }
    }, 2000);
  }, [showError, saveProject]);

  const handleStart = async () => {
    if (!file) return;

    setView("processing");
    setIsUploading(true);
    setUploadProgress(0);
    setCurrentStatus("uploading");
    setCurrentStep("영상 업로드 중...");
    setProgressPercent(0);

    try {
      // Upload via XHR for progress tracking
      const formData = new FormData();
      formData.append("file", file);

      const uploadResult = await new Promise<{ job_id: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
            setProgressPercent(Math.round(pct * 0.1)); // Upload is 0-10% of total
            setCurrentStep(`영상 업로드 중... ${pct}%`);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.detail || "업로드 실패"));
            } catch {
              reject(new Error("업로드 실패"));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("네트워크 오류")));
        xhr.addEventListener("abort", () => reject(new Error("업로드가 취소되었습니다")));

        xhr.open("POST", `${SERVER_URL}/api/jobs/upload`);
        xhr.send(formData);
      });

      setIsUploading(false);
      setJobId(uploadResult.job_id);

      // Auto-save: upload started
      saveProject({
        video_name: file.name,
        railway_job_id: uploadResult.job_id,
        status: "processing",
        settings: { maxShorts, minDuration, maxDuration },
      });

      // Start processing
      const processResp = await fetch(`${SERVER_URL}/api/jobs/${uploadResult.job_id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_shorts: maxShorts,
          min_duration_sec: minDuration,
          max_duration_sec: maxDuration,
        }),
      });

      if (!processResp.ok) {
        const err = await processResp.json();
        throw new Error(err.detail || "처리 시작 실패");
      }

      // Start polling for status
      startPolling(uploadResult.job_id);
    } catch (err) {
      showError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    }
  };

  const resetAll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    // Clean up job on server if exists
    if (jobId) {
      fetch(`${SERVER_URL}/api/jobs/${jobId}`, { method: "DELETE" }).catch(() => {});
    }
    setFile(null);
    setJobId(null);
    setView("upload");
    setUploadProgress(0);
    setCurrentStatus("");
    setCurrentStep("");
    setProgressPercent(0);
    setIsUploading(false);
    setResults(null);
    setExpandedReasoning(new Set());
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Reset DB status back to draft
    saveProject({ status: "draft", shorts: null, railway_job_id: null });
  };

  const toggleReasoning = (shortId: string) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(shortId)) next.delete(shortId);
      else next.add(shortId);
      return next;
    });
  };

  const getStepState = (stepKey: string): "done" | "active" | "pending" => {
    const stepOrder: string[] = PIPELINE_STEPS.map((s) => s.key);
    const currentIdx = stepOrder.indexOf(currentStatus);
    const stepIdx = stepOrder.indexOf(stepKey);

    if (currentStatus === "completed") return "done";
    if (stepIdx < currentIdx) return "done";
    if (stepIdx === currentIdx) return "active";
    // For "processing" status before first real step
    if (currentStatus === "processing" && stepKey === "uploading") return "done";
    if (currentStatus === "processing" && stepKey === "extracting_audio") return "active";
    return "pending";
  };

  if (loading || !worker) {
    if (!loading && !worker) {
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
    return null;
  }

  if (projectLoading) {
    return (
      <div className="min-h-full bg-gray-50">
        <TopNav title="쇼츠 제작기" backHref="/youtube-shorts" />
        <div className="max-w-2xl mx-auto px-5 mt-10">
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-10">
      <TopNav title="쇼츠 제작기" backHref="/youtube-shorts" />

      <div className="max-w-2xl mx-auto px-5 mt-6">
        {/* Upload View */}
        {view === "upload" && (
          <div>
            <p className="text-sm text-toss-gray-400 mb-6">
              영상을 업로드하면 AI가 바이럴 쇼츠 구간을 찾아 자동으로 편집합니다
            </p>

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-toss-blue bg-blue-50/70 scale-[1.01]"
                  : file
                  ? "border-toss-blue/30 bg-blue-50/50"
                  : "border-toss-gray-200 hover:border-toss-blue/40 hover:bg-blue-50/30"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.avi,.mkv,.webm"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
                className="hidden"
              />
              {file ? (
                <div>
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg width="28" height="28" fill="none" stroke="#3182f6" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9a2.25 2.25 0 0 0-2.25 2.25v9A2.25 2.25 0 0 0 4.5 18.75z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-toss-blue">{file.name}</p>
                  <p className="text-xs text-toss-gray-400 mt-1">
                    {formatSize(file.size)} &middot; 클릭하여 다른 파일 선택
                  </p>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 bg-toss-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-sm text-toss-gray-500 font-medium">
                    영상 파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-xs text-toss-gray-300 mt-1">MP4, MOV, AVI, MKV, WEBM</p>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="bg-white rounded-2xl border border-toss-gray-100 mt-5 shadow-sm overflow-hidden">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-sm font-semibold text-toss-gray-700 hover:bg-toss-gray-50 transition"
              >
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  </svg>
                  설정
                </span>
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  className={`transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
                >
                  <path d="m19 9-7 7-7-7" />
                </svg>
              </button>

              {settingsOpen && (
                <div className="px-5 pb-5 space-y-5 border-t border-toss-gray-100 pt-4">
                  {/* Max shorts */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-toss-gray-600">추출할 쇼츠 수</label>
                      <span className="text-sm font-bold text-toss-blue">{maxShorts}개</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={maxShorts}
                      onChange={(e) => setMaxShorts(Number(e.target.value))}
                      className="w-full h-1.5 bg-toss-gray-100 rounded-full appearance-none cursor-pointer accent-toss-blue [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-toss-blue [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <div className="flex justify-between text-[10px] text-toss-gray-300 mt-1">
                      <span>1</span>
                      <span>10</span>
                    </div>
                  </div>

                  {/* Min duration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-toss-gray-600">최소 길이</label>
                      <span className="text-sm font-bold text-toss-blue">{minDuration}초</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      value={minDuration}
                      onChange={(e) => setMinDuration(Number(e.target.value))}
                      className="w-full h-1.5 bg-toss-gray-100 rounded-full appearance-none cursor-pointer accent-toss-blue [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-toss-blue [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <div className="flex justify-between text-[10px] text-toss-gray-300 mt-1">
                      <span>10초</span>
                      <span>50초</span>
                    </div>
                  </div>

                  {/* Max duration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-toss-gray-600">최대 길이</label>
                      <span className="text-sm font-bold text-toss-blue">{maxDuration}초</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={58}
                      value={maxDuration}
                      onChange={(e) => setMaxDuration(Number(e.target.value))}
                      className="w-full h-1.5 bg-toss-gray-100 rounded-full appearance-none cursor-pointer accent-toss-blue [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-toss-blue [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                    />
                    <div className="flex justify-between text-[10px] text-toss-gray-300 mt-1">
                      <span>20초</span>
                      <span>58초</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Start button */}
            <button
              onClick={handleStart}
              disabled={!file}
              className="w-full mt-6 bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              쇼츠 생성하기
            </button>
          </div>
        )}

        {/* Processing View */}
        {view === "processing" && (
          <div>
            <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-toss-gray-900 mb-6">처리 중...</h2>

              {/* Step indicator */}
              <div className="space-y-1 mb-8">
                {PIPELINE_STEPS.map((step, idx) => {
                  const state = getStepState(step.key);
                  return (
                    <div key={step.key} className="flex items-center gap-3 py-2.5">
                      {/* Step circle */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                          state === "done"
                            ? "bg-toss-blue"
                            : state === "active"
                            ? "bg-toss-blue/10 ring-2 ring-toss-blue"
                            : "bg-toss-gray-100"
                        }`}
                      >
                        {state === "done" ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        ) : state === "active" ? (
                          <div className="w-3 h-3 bg-toss-blue rounded-full animate-pulse" />
                        ) : (
                          <span className="text-xs font-bold text-toss-gray-300">{idx + 1}</span>
                        )}
                      </div>

                      {/* Step label */}
                      <span
                        className={`text-sm font-medium transition-colors ${
                          state === "done"
                            ? "text-toss-gray-500"
                            : state === "active"
                            ? "text-toss-gray-900 font-semibold"
                            : "text-toss-gray-300"
                        }`}
                      >
                        {step.label}
                        {state === "active" && step.key === "uploading" && isUploading && (
                          <span className="ml-2 text-toss-blue">{uploadProgress}%</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-toss-gray-500">진행률</span>
                  <span className="text-xs font-bold text-toss-blue">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-toss-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-toss-blue rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-toss-gray-400 text-center">{currentStep || "준비 중..."}</p>
            </div>
          </div>
        )}

        {/* Results View */}
        {view === "results" && results && (
          <div>
            {/* Actions */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-toss-gray-900">
                생성된 쇼츠
                <span className="ml-2 text-sm font-normal text-toss-gray-400">
                  {results.shorts.length}개
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {jobId && (
                  <a
                    href={`${SERVER_URL}/api/jobs/${jobId}/download-all`}
                    className="px-4 py-2 bg-toss-gray-50 text-toss-gray-600 text-[13px] font-semibold rounded-xl hover:bg-toss-gray-100 transition flex items-center gap-1.5"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
                    </svg>
                    전체 다운로드 (ZIP)
                  </a>
                )}
                <button
                  onClick={resetAll}
                  className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-xl hover:bg-toss-blue-hover transition"
                >
                  새로 만들기
                </button>
              </div>
            </div>

            {/* Shorts grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.shorts.map((short) => (
                <div
                  key={short.short_id}
                  className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Video player */}
                  <div className="aspect-[9/16] bg-black max-h-[360px]">
                    {jobId ? (
                      <video
                        controls
                        preload="metadata"
                        src={`${SERVER_URL}/api/jobs/${jobId}/download/${short.short_id}`}
                        className="w-full h-full object-contain"
                      />
                    ) : short.download_url ? (
                      <video
                        controls
                        preload="metadata"
                        src={short.download_url}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-toss-gray-400 text-sm">
                        영상을 불러올 수 없습니다
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-toss-gray-900 mb-2 line-clamp-2">
                      {short.title}
                    </h3>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {/* Virality score */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${scoreTextColor(short.virality_score)} bg-opacity-10`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${scoreColor(short.virality_score)}`} />
                        점수 {short.virality_score}/10
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-toss-gray-50 text-toss-gray-500">
                        {formatTime(short.start_time)} - {formatTime(short.end_time)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-toss-gray-50 text-toss-gray-500">
                        {short.duration}초
                      </span>
                    </div>

                    {/* Virality bar */}
                    <div className="mb-3">
                      <div className="h-1.5 bg-toss-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${scoreColor(short.virality_score)}`}
                          style={{ width: `${short.virality_score * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Hook text */}
                    <div className="bg-blue-50/70 rounded-xl px-3 py-2.5 mb-3">
                      <p className="text-xs text-toss-gray-400 mb-0.5 font-semibold">Hook</p>
                      <p className="text-sm text-toss-gray-800 leading-relaxed">
                        &ldquo;{short.hook_text}&rdquo;
                      </p>
                    </div>

                    {/* Reasoning toggle */}
                    <button
                      onClick={() => toggleReasoning(short.short_id)}
                      className="text-xs text-toss-gray-400 hover:text-toss-blue transition mb-2"
                    >
                      {expandedReasoning.has(short.short_id) ? "분석 이유 접기 \u25B2" : "분석 이유 보기 \u25BC"}
                    </button>
                    {expandedReasoning.has(short.short_id) && (
                      <div className="bg-toss-gray-50 rounded-xl px-3 py-2.5 mb-3">
                        <p className="text-xs text-toss-gray-600 leading-relaxed whitespace-pre-wrap">
                          {short.reasoning}
                        </p>
                      </div>
                    )}

                    {/* Download button */}
                    {jobId ? (
                      <a
                        href={`${SERVER_URL}/api/jobs/${jobId}/download/${short.short_id}`}
                        download
                        className="w-full mt-1 flex items-center justify-center gap-1.5 py-2.5 bg-toss-blue/5 text-toss-blue text-sm font-semibold rounded-xl hover:bg-toss-blue/10 transition"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
                        </svg>
                        다운로드
                      </a>
                    ) : short.download_url ? (
                      <a
                        href={short.download_url}
                        download
                        className="w-full mt-1 flex items-center justify-center gap-1.5 py-2.5 bg-toss-blue/5 text-toss-blue text-sm font-semibold rounded-xl hover:bg-toss-blue/10 transition"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
                        </svg>
                        다운로드
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error View */}
        {view === "error" && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" fill="none" stroke="#f04452" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-toss-gray-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-sm text-toss-gray-500 mb-6 max-w-sm mx-auto whitespace-pre-wrap">
              {errorMessage}
            </p>
            <button
              onClick={resetAll}
              className="px-6 py-2.5 bg-toss-blue text-white text-sm font-semibold rounded-xl hover:bg-toss-blue-hover transition"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
