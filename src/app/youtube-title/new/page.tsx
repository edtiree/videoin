"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";

type Tab = "youtube" | "upload" | "direct";

interface Worker {
  id: string;
  name: string;
  allowedServices?: string[];
}

async function getOpenAIKey() {
  const res = await fetch("/api/youtube-title/openai-key");
  const data = await res.json();
  return data.key;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<Tab>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [directText, setDirectText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.push("/"); return; }
    try {
      const w = JSON.parse(saved);
      const isAdmin = w.isAdmin === true;
      if (!isAdmin && !w.allowedServices?.includes("youtube-title")) { router.push("/"); return; }
      setWorker(w);
    } catch { router.push("/"); }
    setLoading(false);
  }, [router]);

  const handleSubmit = async () => {
    if (!worker) return;
    setSubmitting(true);
    setProgress("프로젝트 생성 중...");

    try {
      const projectRes = await fetch("/api/youtube-title/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "새 프로젝트", workerId: worker.id }),
      });
      const projectData = await projectRes.json();
      const projectId = projectData.project_id;

      setProgress(
        tab === "youtube"
          ? "YouTube 자막 추출 중..."
          : tab === "upload"
          ? "영상 처리 중... (최대 수 분 소요)"
          : "텍스트 처리 중..."
      );

      let transcriptData;
      if (tab === "youtube") {
        // 서버 API로 자막 추출 시도
        const res = await fetch("/api/youtube-title/transcript/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl }),
        });
        transcriptData = await res.json();

        // 서버 실패 시 클라이언트에서 직접 시도
        if (!res.ok || transcriptData.error) {
          setProgress("서버 추출 실패, 다른 방법 시도 중...");
          try {
            const { fetchYoutubeTranscript, extractVideoId } = await import("@/lib/youtube-title/transcript-client");
            const videoId = extractVideoId(youtubeUrl);
            if (!videoId) throw new Error("올바른 YouTube URL이 아닙니다");
            transcriptData = await fetchYoutubeTranscript(videoId);
          } catch (clientErr) {
            throw new Error(transcriptData.error || (clientErr instanceof Error ? clientErr.message : "자막 추출 실패"));
          }
        }
      } else if (tab === "upload" && file) {
        const MAX_DIRECT = 25 * 1024 * 1024; // 25MB
        const MAX_FFMPEG = 500 * 1024 * 1024; // 500MB

        const apiKey = await getOpenAIKey();

        if (file.size <= MAX_DIRECT) {
          // 25MB 이하: Whisper API에 직접 전송
          setProgress("음성 인식 중...");
          const formData = new FormData();
          formData.append("file", file);
          formData.append("model", "whisper-1");
          formData.append("language", "ko");
          const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}` },
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || "음성 인식 실패");
          }
          const result = await res.json();
          transcriptData = { transcript: result.text, videoType: "롱폼" };

        } else if (file.size <= MAX_FFMPEG) {
          // 25MB~500MB: ffmpeg.wasm으로 오디오 추출 후 Whisper
          const { extractAudioFromVideo } = await import("@/lib/youtube-title/audio-extractor");
          const audioChunks = await extractAudioFromVideo(file, (msg) => setProgress(msg));

          const transcripts: string[] = [];
          for (let i = 0; i < audioChunks.length; i++) {
            setProgress(`음성 인식 중... (${i + 1}/${audioChunks.length})`);
            const formData = new FormData();
            formData.append("file", audioChunks[i]);
            formData.append("model", "whisper-1");
            formData.append("language", "ko");
            const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${apiKey}` },
              body: formData,
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error?.message || `음성 인식 실패 (${i + 1}번째 조각)`);
            }
            const result = await res.json();
            if (result.text) transcripts.push(result.text);
          }
          transcriptData = { transcript: transcripts.join(" "), videoType: "롱폼" };

        } else {
          // 500MB 초과: 처리 불가
          throw new Error(
            `파일이 너무 큽니다 (${(file.size / (1024*1024*1024)).toFixed(1)}GB).\n\n` +
            "대용량 영상은 다음 방법을 사용해주세요:\n" +
            "• YouTube에 비공개로 업로드 후 'YouTube 링크' 탭 사용\n" +
            "• 대본이 있다면 '직접 입력' 탭 사용"
          );
        }
      } else if (tab === "direct") {
        const res = await fetch("/api/youtube-title/transcript/direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: directText, video_type: "롱폼" }),
        });
        transcriptData = await res.json();
      }

      if (transcriptData) {
        await fetch(`/api/youtube-title/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: transcriptData.transcript,
            video_type: transcriptData.video_type,
            video_thumbnail: transcriptData.video_thumbnail || null,
            input_type: tab,
            input_name: tab === "youtube" ? youtubeUrl : tab === "upload" ? file?.name : "직접 입력",
          }),
        });
      }
      router.push(`/youtube-title/${projectId}`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message?: string }).message
          : "오류가 발생했습니다";
      alert(message || "오류가 발생했습니다");
      setSubmitting(false);
      setProgress("");
    }
  };

  const canSubmit =
    !submitting &&
    ((tab === "youtube" && youtubeUrl.trim()) ||
      (tab === "upload" && file) ||
      (tab === "direct" && directText.trim()));

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "youtube",
      label: "YouTube 링크",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-1.135a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364l1.757 1.757" />
        </svg>
      ),
    },
    {
      key: "upload",
      label: "파일 업로드",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
      ),
    },
    {
      key: "direct",
      label: "직접 입력",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
        </svg>
      ),
    },
  ];

  if (loading || !worker) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <TopNav title="새 프로젝트" backHref="/youtube-title" />

      <div className="max-w-2xl mx-auto px-5 mt-6">
        <p className="text-sm text-toss-gray-400 mb-8">영상 소스를 선택하여 시작하세요</p>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all duration-200 border-2 ${
                tab === t.key
                  ? "bg-blue-50 border-toss-blue/30 text-toss-blue shadow-sm"
                  : "bg-white border-toss-gray-100 text-toss-gray-400 hover:border-toss-gray-200 hover:text-toss-gray-600"
              }`}
            >
              <span className={tab === t.key ? "text-toss-blue" : "text-toss-gray-300"}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm">
          {tab === "youtube" && (
            <div>
              <label className="text-xs text-toss-gray-500 font-semibold mb-2 block uppercase tracking-wider">
                YouTube URL
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3.5 rounded-xl border border-toss-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue/50 transition-all"
              />
              <p className="text-xs text-toss-gray-400 mt-2">YouTube 영상 링크를 붙여넣으면 자동으로 자막을 추출합니다</p>
            </div>
          )}

          {tab === "upload" && (
            <div>
              <label className="text-xs text-toss-gray-500 font-semibold mb-2 block uppercase tracking-wider">
                영상 파일
              </label>
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                  file
                    ? "border-toss-blue/30 bg-blue-50/50"
                    : "border-toss-gray-200 hover:border-toss-blue/40 hover:bg-blue-50/30"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {file ? (
                  <div>
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg width="24" height="24" fill="none" stroke="#3182f6" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9a2.25 2.25 0 0 0-2.25 2.25v9A2.25 2.25 0 0 0 4.5 18.75z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-toss-blue">{file.name}</p>
                    <p className="text-xs text-toss-gray-400 mt-1">
                      {(file.size / (1024*1024)).toFixed(0)}MB · 클릭하여 다른 파일 선택
                    </p>
                    {file.size > 500 * 1024 * 1024 && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 text-left">
                        <p className="font-semibold mb-1">대용량 파일 ({(file.size / (1024*1024*1024)).toFixed(1)}GB)</p>
                        <p>500MB 초과 파일은 브라우저에서 처리할 수 없습니다.</p>
                        <p className="mt-1">YouTube에 비공개 업로드 후 &apos;YouTube 링크&apos; 탭을 사용하거나, 대본을 &apos;직접 입력&apos; 탭에 붙여넣어 주세요.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 bg-toss-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg width="24" height="24" fill="none" stroke="#b0b8c1" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-sm text-toss-gray-500 font-medium">클릭하여 파일 선택</p>
                    <p className="text-xs text-toss-gray-300 mt-1">MP4, MOV, AVI, MKV, WebM</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "direct" && (
            <div>
              <label className="text-xs text-toss-gray-500 font-semibold mb-2 block uppercase tracking-wider">
                대본 / 스크립트
              </label>
              <textarea
                value={directText}
                onChange={(e) => setDirectText(e.target.value)}
                placeholder="영상 대본을 붙여넣으세요..."
                rows={10}
                className="w-full px-4 py-3.5 rounded-xl border border-toss-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue/50 transition-all resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full mt-6 bg-toss-blue hover:bg-toss-blue-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
        >
          {submitting && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {submitting ? progress : "프로젝트 시작하기"}
        </button>
      </div>
    </div>
  );
}
