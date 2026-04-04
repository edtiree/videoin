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

interface VideoInfo {
  duration: number;
  duration_str: string;
  width: number;
  height: number;
  fps: number;
}

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
  keywords: string[];
  icon: string;
  enabled: boolean;
}

interface GeneratedClip {
  clip_id: string;
  segment_id: number;
  text: string;
  timecode: string;
  thumbnail_url?: string;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  video_name: string | null;
  video_info: VideoInfo | null;
  railway_job_id: string | null;
  segments: Segment[] | null;
  clips: GeneratedClip[] | null;
  selected_image_model: string | null;
  selected_video_model: string | null;
}

type Step = 1 | 2 | 3 | 4;

const SERVER_URL =
  process.env.NEXT_PUBLIC_SCREEN_MATERIAL_SERVER_URL ||
  "https://screen-material-server-production.up.railway.app";

const STEP_LABELS = ["영상 업로드", "음성 인식", "구간 선택", "생성 및 결과"];

const IMAGE_MODELS = [
  { value: "nano-banana-pro-preview", label: "Nano Banana Pro" },
  { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash" },
  { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro" },
  { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash" },
  { value: "imagen-4.0-generate-001", label: "Imagen 4.0" },
  { value: "imagen-4.0-fast-generate-001", label: "Imagen 4.0 Fast" },
];

const VIDEO_MODELS = [
  { value: "veo-3.0-fast-generate-001", label: "Veo 3.0 Fast" },
  { value: "veo-3.0-generate-001", label: "Veo 3.0" },
  { value: "veo-3.1-fast-generate-preview", label: "Veo 3.1 Fast" },
  { value: "veo-3.1-generate-preview", label: "Veo 3.1" },
  { value: "veo-2.0-generate-001", label: "Veo 2.0" },
];

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

export default function ScreenMaterialDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("화면자료 제작기");

  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1: Upload
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Transcription
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState("");
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);

  // Step 3: Selection
  const [selectedImageModel, setSelectedImageModel] = useState(
    IMAGE_MODELS[0].value
  );
  const [selectedVideoModel, setSelectedVideoModel] = useState(
    VIDEO_MODELS[0].value
  );

  // Step 4: Generation
  const [generating, setGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState("");
  const [generateProgress, setGenerateProgress] = useState(0);
  const [clips, setClips] = useState<GeneratedClip[]>([]);

  // Error
  const [errorMessage, setErrorMessage] = useState("");

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-save helper
  const saveProject = useCallback(
    async (data: Record<string, unknown>) => {
      try {
        await fetch(`/api/screen-material/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch {
        // silent fail for auto-save
      }
    },
    [projectId]
  );

  // Auth check
  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) {
      router.push("/");
      return;
    }
    try {
      const w = JSON.parse(saved);
      const isAdmin = w.isAdmin === true;
      if (!isAdmin && !w.allowedServices?.includes("screen-material")) {
        router.push("/");
        return;
      }
      setWorker(w);
    } catch {
      router.push("/");
    }
  }, [router]);

  // Load project data on mount
  useEffect(() => {
    if (!worker) return;

    const loadProject = async () => {
      try {
        const resp = await fetch(`/api/screen-material/projects/${projectId}`);
        if (!resp.ok) {
          router.push("/screen-material");
          return;
        }
        const data: ProjectData = await resp.json();
        setProjectName(data.name || "화면자료 제작기");

        if (data.railway_job_id) {
          setJobId(data.railway_job_id);
        }
        if (data.video_info) {
          setVideoInfo(data.video_info);
        }
        if (data.selected_image_model) {
          setSelectedImageModel(data.selected_image_model);
        }
        if (data.selected_video_model) {
          setSelectedVideoModel(data.selected_video_model);
        }

        // Determine starting step based on saved data
        if (data.clips && data.clips.length > 0) {
          setClips(data.clips);
          if (data.segments) {
            setSegments(data.segments);
          }
          setStep(4);
        } else if (data.segments && data.segments.length > 0) {
          setSegments(data.segments);
          setStep(3);
        } else {
          setStep(1);
        }
      } catch {
        router.push("/screen-material");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [worker, projectId, router]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const showError = useCallback(
    (message: string) => {
      setErrorMessage(message);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    },
    []
  );

  // ── Step 1: File handling ──

  const handleFile = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    const allowed = [".mp4", ".mov", ".avi", ".mkv"];
    if (!allowed.includes(ext)) {
      alert("지원하지 않는 파일 형식입니다.\n지원: " + allowed.join(", "));
      return;
    }
    setFile(f);
    setErrorMessage("");
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

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.job_id) {
            setJobId(data.job_id);
            const videoMeta = data.metadata || null;
            if (videoMeta) {
              setVideoInfo(videoMeta);
            }
            // Auto-save after upload
            saveProject({
              video_name: file.name,
              video_info: videoMeta,
              railway_job_id: data.job_id,
              name: file.name.replace(/\.[^.]+$/, ""),
              status: "draft",
            });
            setProjectName(file.name.replace(/\.[^.]+$/, ""));
          } else {
            showError(
              "서버 응답에 job_id가 없습니다: " +
                xhr.responseText.slice(0, 100)
            );
          }
        } catch {
          showError(
            "응답 파싱 실패: " + xhr.responseText.slice(0, 100)
          );
        }
      } else {
        showError(
          "업로드 실패 (" +
            xhr.status +
            "): " +
            xhr.responseText.slice(0, 200)
        );
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      showError(
        "네트워크 오류 - 서버에 연결할 수 없습니다. URL: " + SERVER_URL
      );
    };

    xhr.ontimeout = () => {
      setIsUploading(false);
      showError("업로드 시간 초과 (10분)");
    };

    xhr.timeout = 600000;
    xhr.open("POST", SERVER_URL + "/api/upload");
    xhr.send(formData);
  };

  // ── Step 2: Transcription ──

  const startTranscription = async () => {
    if (!jobId) return;
    setTranscribing(true);
    setTranscribeStatus("음성 인식 준비 중...");
    setTranscribeProgress(0);
    setErrorMessage("");
    setStep(2);

    try {
      const resp = await fetch(`${SERVER_URL}/api/jobs/${jobId}/transcribe`, {
        method: "POST",
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "음성 인식 시작 실패");
      }

      // Start polling for transcription status
      pollRef.current = setInterval(async () => {
        try {
          const statusResp = await fetch(
            `${SERVER_URL}/api/jobs/${jobId}/status`
          );
          if (!statusResp.ok) return;
          const data = await statusResp.json();

          setTranscribeStatus(
            data.current_step || data.message || data.status
          );
          setTranscribeProgress(
            Math.round((data.progress || data.progress_percent || 0) * 100)
          );

          if (
            data.status === "transcribed" ||
            data.status === "transcription_completed" ||
            data.status === "completed"
          ) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            // Fetch segments
            const segResp = await fetch(
              `${SERVER_URL}/api/jobs/${jobId}/segments`
            );
            if (!segResp.ok)
              throw new Error("구간 데이터를 불러오는데 실패했습니다.");
            const segData = await segResp.json();
            const segs: Segment[] = (segData.segments || []).map(
              (s: Segment & { enabled?: boolean }) => ({
                ...s,
                enabled: s.enabled ?? false,
              })
            );
            setSegments(segs);
            setTranscribing(false);
            setStep(3);

            // Auto-save after transcription
            saveProject({
              segments: segs,
              status: "transcribed",
            });
          } else if (data.status === "failed") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setTranscribing(false);
            showError(data.error || "음성 인식 중 오류가 발생했습니다.");
          }
        } catch {
          // Network error during polling - keep trying
        }
      }, 2000);
    } catch (err) {
      setTranscribing(false);
      showError(
        err instanceof Error ? err.message : "음성 인식 시작에 실패했습니다."
      );
    }
  };

  // ── Step 3: Segment Selection ──

  const toggleSegment = (id: number) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const selectAll = () => {
    setSegments((prev) => prev.map((s) => ({ ...s, enabled: true })));
  };

  const deselectAll = () => {
    setSegments((prev) => prev.map((s) => ({ ...s, enabled: false })));
  };

  const enabledCount = segments.filter((s) => s.enabled).length;

  // ── Step 4: Generation ──

  const startGeneration = async () => {
    if (!jobId) return;
    const enabledSegmentIds = segments
      .filter((s) => s.enabled)
      .map((s) => s.id);
    if (enabledSegmentIds.length === 0) return;

    setGenerating(true);
    setGenerateStatus("화면자료 생성 준비 중...");
    setGenerateProgress(0);
    setErrorMessage("");
    setStep(4);

    // Auto-save model selection when generation starts
    saveProject({
      selected_image_model: selectedImageModel,
      selected_video_model: selectedVideoModel,
    });

    try {
      const resp = await fetch(`${SERVER_URL}/api/jobs/${jobId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment_ids: enabledSegmentIds,
          image_model: selectedImageModel,
          video_model: selectedVideoModel,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "생성 시작 실패");
      }

      // Poll for generation status
      pollRef.current = setInterval(async () => {
        try {
          const statusResp = await fetch(
            `${SERVER_URL}/api/jobs/${jobId}/status`
          );
          if (!statusResp.ok) return;
          const data = await statusResp.json();

          setGenerateStatus(
            data.current_step || data.message || data.status
          );
          setGenerateProgress(
            Math.round((data.progress || data.progress_percent || 0) * 100)
          );

          if (
            data.status === "generated" ||
            data.status === "generation_completed" ||
            data.status === "completed"
          ) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            // Fetch results
            try {
              const resResp = await fetch(
                `${SERVER_URL}/api/jobs/${jobId}/results`
              );
              if (!resResp.ok)
                throw new Error("결과를 불러오는데 실패했습니다.");
              const resData = await resResp.json();
              const resultClips = resData.clips || [];
              setClips(resultClips);
              setGenerating(false);

              // Auto-save after generation completes
              saveProject({
                clips: resultClips,
                status: "completed",
              });
            } catch (err) {
              setGenerating(false);
              showError(
                err instanceof Error
                  ? err.message
                  : "결과를 불러오는데 실패했습니다."
              );
            }
          } else if (data.status === "failed") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setGenerating(false);
            showError(data.error || "생성 중 오류가 발생했습니다.");
          }
        } catch {
          // Network error during polling - keep trying
        }
      }, 2000);
    } catch (err) {
      setGenerating(false);
      showError(
        err instanceof Error ? err.message : "생성 시작에 실패했습니다."
      );
    }
  };

  // ── Reset ──

  const resetAll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (jobId) {
      fetch(`${SERVER_URL}/api/jobs/${jobId}`, { method: "DELETE" }).catch(
        () => {}
      );
    }
    setFile(null);
    setJobId(null);
    setVideoInfo(null);
    setStep(1);
    setUploadProgress(0);
    setIsUploading(false);
    setTranscribing(false);
    setTranscribeStatus("");
    setTranscribeProgress(0);
    setSegments([]);
    setSelectedImageModel(IMAGE_MODELS[0].value);
    setSelectedVideoModel(VIDEO_MODELS[0].value);
    setGenerating(false);
    setGenerateStatus("");
    setGenerateProgress(0);
    setClips([]);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Reset project data in DB
    saveProject({
      video_name: null,
      video_info: null,
      railway_job_id: null,
      segments: null,
      clips: null,
      selected_image_model: null,
      selected_video_model: null,
      status: "draft",
    });
  };

  // ── Render ──

  if (loading || !worker) {
    if (!loading && !worker) {
      return (
        <div className="min-h-full flex items-center justify-center px-6">
          <div className="w-full max-w-xs text-center space-y-4">
            <h1 className="text-[20px] font-bold text-toss-gray-900">
              로그인이 필요합니다
            </h1>
            <p className="text-[14px] text-toss-gray-500">
              홈에서 로그인 후 이용해주세요.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover transition"
            >
              홈으로
            </a>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="min-h-full bg-gray-50 pb-10">
      <TopNav title="화면자료 제작기" backHref="/screen-material" />

      <div className="max-w-2xl mx-auto px-5 mt-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEP_LABELS.map((label, idx) => {
            const stepNum = (idx + 1) as Step;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={idx} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      isDone
                        ? "bg-toss-blue text-white"
                        : isActive
                        ? "bg-toss-blue/10 ring-2 ring-toss-blue text-toss-blue"
                        : "bg-toss-gray-100 text-toss-gray-300"
                    }`}
                  >
                    {isDone ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      stepNum
                    )}
                  </div>
                  <span
                    className={`text-[11px] mt-1.5 font-medium transition-colors ${
                      isDone
                        ? "text-toss-blue"
                        : isActive
                        ? "text-toss-gray-900 font-semibold"
                        : "text-toss-gray-300"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 mx-1 rounded-full transition-colors ${
                      step > stepNum ? "bg-toss-blue" : "bg-toss-gray-100"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="#f04452"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">
                오류가 발생했습니다
              </p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="text-red-400 hover:text-red-600 transition"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div>
            <p className="text-sm text-toss-gray-400 mb-6">
              영상을 업로드하면 AI가 대본을 추출하고, 문장별 화면자료 영상을
              자동으로 만들어드립니다
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
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.avi,.mkv"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
                className="hidden"
              />
              {file ? (
                <div>
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg
                      width="28"
                      height="28"
                      fill="none"
                      stroke="#3182f6"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9a2.25 2.25 0 0 0-2.25 2.25v9A2.25 2.25 0 0 0 4.5 18.75z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-toss-blue">
                    {file.name}
                  </p>
                  <p className="text-xs text-toss-gray-400 mt-1">
                    {formatSize(file.size)} &middot; 클릭하여 다른 파일 선택
                  </p>
                </div>
              ) : (
                <div>
                  <div className="w-14 h-14 bg-toss-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg
                      width="28"
                      height="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <p className="text-sm text-toss-gray-500 font-medium">
                    영상 파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-xs text-toss-gray-300 mt-1">
                    MP4, MOV, AVI, MKV
                  </p>
                </div>
              )}
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="mt-5 bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-toss-gray-600">
                    업로드 중...
                  </span>
                  <span className="text-xs font-bold text-toss-blue">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="h-2 bg-toss-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-toss-blue rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video info after upload */}
            {videoInfo && !isUploading && (
              <div className="mt-5 bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-toss-gray-900 mb-3">
                  영상 정보
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-toss-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-toss-gray-400 mb-0.5">
                      길이
                    </p>
                    <p className="text-sm font-bold text-toss-gray-900">
                      {videoInfo.duration_str}
                    </p>
                  </div>
                  <div className="bg-toss-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-toss-gray-400 mb-0.5">
                      해상도
                    </p>
                    <p className="text-sm font-bold text-toss-gray-900">
                      {videoInfo.width}x{videoInfo.height}
                    </p>
                  </div>
                  <div className="bg-toss-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-toss-gray-400 mb-0.5">
                      FPS
                    </p>
                    <p className="text-sm font-bold text-toss-gray-900">
                      {videoInfo.fps}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload / Start transcription buttons */}
            {!jobId && (
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full mt-6 bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                {isUploading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M4 12a8 8 0 018-8"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    업로드 중...
                  </>
                ) : (
                  "영상 업로드"
                )}
              </button>
            )}

            {jobId && !isUploading && (
              <button
                onClick={startTranscription}
                className="w-full mt-6 bg-toss-blue hover:bg-toss-blue-hover text-white text-sm font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3z" />
                </svg>
                음성 인식 시작
              </button>
            )}
          </div>
        )}

        {/* Step 2: Transcription */}
        {step === 2 && (
          <div>
            <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm">
              <h2 className="text-base font-bold text-toss-gray-900 mb-4">
                음성 인식 중
              </h2>

              {transcribing ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-toss-blue/10 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-toss-blue rounded-full animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-toss-gray-900">
                        {transcribeStatus || "처리 중..."}
                      </p>
                      <p className="text-xs text-toss-gray-400 mt-0.5">
                        Whisper AI가 영상의 음성을 텍스트로 변환하고 있습니다
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-toss-gray-500">
                        진행률
                      </span>
                      <span className="text-xs font-bold text-toss-blue">
                        {transcribeProgress}%
                      </span>
                    </div>
                    <div className="h-2 bg-toss-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-toss-blue rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${transcribeProgress}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-toss-gray-500">
                  음성 인식이 완료되었습니다. 다음 단계로 이동합니다...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Segment Selection */}
        {step === 3 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-toss-gray-900">
                  화면자료 구간 선택
                </h2>
                <p className="text-xs text-toss-gray-400 mt-1">
                  화면자료가 필요한 문장을 선택하세요
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 bg-toss-gray-50 text-toss-gray-600 text-[12px] font-semibold rounded-lg hover:bg-toss-gray-100 transition"
                >
                  전체 선택
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 bg-toss-gray-50 text-toss-gray-600 text-[12px] font-semibold rounded-lg hover:bg-toss-gray-100 transition"
                >
                  전체 해제
                </button>
              </div>
            </div>

            {/* Segment list */}
            <div className="space-y-2 mb-5">
              {segments.map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => toggleSegment(seg.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                    seg.enabled
                      ? "bg-blue-50/70 border-toss-blue/30"
                      : "bg-white border-toss-gray-100 hover:border-toss-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        seg.enabled
                          ? "bg-toss-blue border-toss-blue"
                          : "border-toss-gray-300"
                      }`}
                    >
                      {seg.enabled && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-toss-blue bg-toss-blue/10 px-1.5 py-0.5 rounded">
                          {formatTime(seg.start)} ~ {formatTime(seg.end)}
                        </span>
                      </div>
                      <p className="text-sm text-toss-gray-800 leading-relaxed">
                        {seg.text}
                      </p>
                      {seg.keywords && seg.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {seg.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[11px] bg-toss-gray-50 text-toss-gray-500 px-2 py-0.5 rounded-md"
                            >
                              {seg.icon && i === 0 ? `${seg.icon} ` : ""}
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected count */}
            <div className="bg-white rounded-2xl border border-toss-gray-100 p-4 shadow-sm mb-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-toss-gray-600">
                  {segments.length}개 문장 중{" "}
                  <span className="font-bold text-toss-blue">
                    {enabledCount}개
                  </span>{" "}
                  선택됨
                </span>
              </div>
            </div>

            {/* Model selection */}
            <div className="bg-white rounded-2xl border border-toss-gray-100 p-5 shadow-sm mb-5">
              <h3 className="text-sm font-bold text-toss-gray-900 mb-4">
                AI 모델 설정
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-toss-gray-600 mb-1.5 block">
                    이미지 생성 모델
                  </label>
                  <select
                    value={selectedImageModel}
                    onChange={(e) => setSelectedImageModel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-toss-gray-50 border border-toss-gray-200 rounded-xl text-sm text-toss-gray-800 focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue transition"
                  >
                    {IMAGE_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-toss-gray-600 mb-1.5 block">
                    영상 생성 모델
                  </label>
                  <select
                    value={selectedVideoModel}
                    onChange={(e) => setSelectedVideoModel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-toss-gray-50 border border-toss-gray-200 rounded-xl text-sm text-toss-gray-800 focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue transition"
                  >
                    {VIDEO_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={startGeneration}
              disabled={enabledCount === 0}
              className="w-full bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09zM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456zM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423z" />
              </svg>
              화면자료 생성 ({enabledCount}개 문장)
            </button>
          </div>
        )}

        {/* Step 4: Generation & Results */}
        {step === 4 && (
          <div>
            {/* Generating progress */}
            {generating && (
              <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm mb-6">
                <h2 className="text-base font-bold text-toss-gray-900 mb-4">
                  화면자료 생성 중
                </h2>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-toss-blue/10 rounded-full flex items-center justify-center">
                    <svg
                      className="animate-spin w-5 h-5 text-toss-blue"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M4 12a8 8 0 018-8"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-toss-gray-900">
                      {generateStatus || "처리 중..."}
                    </p>
                    <p className="text-xs text-toss-gray-400 mt-0.5">
                      AI가 이미지를 생성하고 영상으로 변환하고 있습니다
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-toss-gray-500">진행률</span>
                    <span className="text-xs font-bold text-toss-blue">
                      {generateProgress}%
                    </span>
                  </div>
                  <div className="h-2 bg-toss-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-toss-blue rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${generateProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {!generating && clips.length > 0 && (
              <>
                {/* Actions */}
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold text-toss-gray-900">
                    생성된 화면자료
                    <span className="ml-2 text-sm font-normal text-toss-gray-400">
                      {clips.length}개
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    {jobId && (
                      <a
                        href={`${SERVER_URL}/api/jobs/${jobId}/download-all`}
                        className="px-4 py-2 bg-toss-gray-50 text-toss-gray-600 text-[13px] font-semibold rounded-xl hover:bg-toss-gray-100 transition flex items-center gap-1.5"
                      >
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
                        </svg>
                        <span className="hidden sm:inline">전체 다운로드</span>
                        <span className="sm:hidden">ZIP</span>
                      </a>
                    )}
                    <button
                      onClick={resetAll}
                      className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-xl hover:bg-toss-blue-hover transition"
                    >
                      처음부터 다시
                    </button>
                  </div>
                </div>

                {/* Clips grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clips.map((clip) => (
                    <div
                      key={clip.clip_id}
                      className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300"
                    >
                      {/* Video preview */}
                      {jobId && (
                        <div className="aspect-video bg-black">
                          <video
                            controls
                            preload="metadata"
                            src={`${SERVER_URL}/api/jobs/${jobId}/download/${clip.clip_id}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-semibold text-toss-blue bg-toss-blue/10 px-1.5 py-0.5 rounded">
                            {clip.timecode}
                          </span>
                        </div>
                        <p className="text-sm text-toss-gray-800 leading-relaxed line-clamp-2 mb-3">
                          {clip.text}
                        </p>

                        {/* Download button */}
                        {jobId && (
                          <a
                            href={`${SERVER_URL}/api/jobs/${jobId}/download/${clip.clip_id}`}
                            download
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-toss-blue/5 text-toss-blue text-sm font-semibold rounded-xl hover:bg-toss-blue/10 transition"
                          >
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
                            </svg>
                            다운로드
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* No results yet and not generating - error state */}
            {!generating && clips.length === 0 && !errorMessage && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-toss-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                  <svg
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-toss-gray-900 mb-2">
                  생성된 결과가 없습니다
                </h3>
                <p className="text-sm text-toss-gray-500 mb-6">
                  처음부터 다시 시도해주세요.
                </p>
                <button
                  onClick={resetAll}
                  className="px-6 py-2.5 bg-toss-blue text-white text-sm font-semibold rounded-xl hover:bg-toss-blue-hover transition"
                >
                  처음부터 다시
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
