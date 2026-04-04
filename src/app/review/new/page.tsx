"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";

interface ReviewProject {
  id: string;
  title: string;
  review_videos: { id: string; version: number; created_at: string }[];
}

export default function NewReviewUploadPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [projects, setProjects] = useState<ReviewProject[]>([]);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTarget, setUploadTarget] = useState<"new" | string>("new");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (!saved) { router.replace("/"); return; }
    setAuthed(true);

    const worker = JSON.parse(saved);
    const url = worker?.id ? `/api/review/projects?workerId=${worker.id}` : "/api/review/projects";
    fetch(url).then((r) => r.json()).then((data) => setProjects(data)).catch(() => {});
  }, [router]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getNextVersion = (p: ReviewProject) => {
    if (!p.review_videos || p.review_videos.length === 0) return 1;
    return Math.max(...p.review_videos.map(v => v.version)) + 1;
  };

  const getSelectedLabel = () => {
    if (uploadTarget === "new") return newProjectTitle ? `새 프로젝트: ${newProjectTitle}` : "";
    const p = projects.find(p => p.id === uploadTarget);
    return p ? `${p.title} (v${getNextVersion(p)})` : "";
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) setUploadFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile || uploading) return;

    let targetProjectId = uploadTarget;
    setUploading(true);
    setUploadProgress(0);

    try {
      if (uploadTarget === "new") {
        if (!newProjectTitle.trim()) { alert("프로젝트 이름을 입력하세요"); setUploading(false); return; }
        const saved = localStorage.getItem("worker");
        const worker = saved ? JSON.parse(saved) : null;
        const res = await fetch("/api/review/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newProjectTitle.trim(), workerId: worker?.id }),
        });
        if (!res.ok) throw new Error("프로젝트 생성 실패");
        const project = await res.json();
        targetProjectId = project.id;
      }

      setUploadProgress(5);

      const res1 = await fetch("/api/review/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          contentType: uploadFile.type || "video/mp4",
        }),
      });
      if (!res1.ok) throw new Error("presigned URL 발급 실패");
      const { uploadUrl, fileKey, nextVersion } = await res1.json();

      setUploadProgress(10);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(10 + Math.round((ev.loaded / ev.total) * 85));
          }
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 업로드 실패: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.open("PUT", uploadUrl);
        xhr.send(uploadFile);
      });

      const res3 = await fetch("/api/review/upload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetProjectId,
          fileKey,
          version: nextVersion,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
        }),
      });
      if (!res3.ok) throw new Error("DB 저장 실패");

      setUploadProgress(100);
      router.replace(`/review/${targetProjectId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  if (!authed) return <div className="min-h-full bg-gray-50" />;

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      <TopNav title="영상 업로드" backHref="/review" />
      <div className="w-full max-w-md mx-auto px-5 pt-6">

        {/* 파일 드롭 영역 */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition mb-6 ${
            uploadFile ? "border-toss-blue bg-blue-50/30" : "border-toss-gray-200 hover:border-toss-blue hover:bg-blue-50/20"
          }`}>
          {uploadFile ? (
            <div>
              <div className="text-4xl mb-3">🎬</div>
              <p className="text-[15px] font-semibold text-toss-gray-900 truncate">{uploadFile.name}</p>
              <p className="text-[13px] text-toss-gray-400 mt-1">
                {uploadFile.size < 1024 * 1024 * 1024
                  ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`
                  : `${(uploadFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB`}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">📁</div>
              <p className="text-[15px] font-semibold text-toss-gray-700">파일을 드래그하거나 클릭해서 선택</p>
              <p className="text-[13px] text-toss-gray-400 mt-1">영상 파일 (mp4, mov 등)</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* 업로드 위치 지정 */}
        <div className="mb-6">
          <label className="text-[14px] font-bold text-toss-gray-900 mb-2 block">업로드 위치 지정 *</label>
          <div ref={dropdownRef} className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full px-4 py-3.5 border border-toss-gray-200 rounded-xl text-left text-[14px] flex items-center justify-between focus:outline-none focus:border-toss-blue bg-white">
              <span className={getSelectedLabel() ? "text-toss-gray-900" : "text-toss-gray-400"}>
                {getSelectedLabel() || "프로젝트를 선택하세요"}
              </span>
              <span className="text-toss-gray-400">▾</span>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-toss-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-[300px] overflow-y-auto">
                {projects.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-[11px] font-bold text-toss-gray-400 uppercase bg-toss-gray-50">
                      기존 프로젝트의 다음버전으로 추가
                    </div>
                    {projects.map((p) => (
                      <button key={p.id} onClick={() => { setUploadTarget(p.id); setDropdownOpen(false); }}
                        className={`w-full px-4 py-3 text-left text-[14px] flex items-center gap-2 hover:bg-toss-gray-50 transition ${
                          uploadTarget === p.id ? "bg-blue-50" : ""
                        }`}>
                        <span className="font-semibold text-toss-gray-900">{p.title}</span>
                        <span className="px-1.5 py-0.5 bg-toss-gray-100 text-toss-gray-500 rounded text-[11px] font-bold">
                          v{getNextVersion(p)}
                        </span>
                      </button>
                    ))}
                  </>
                )}
                <div className="px-4 py-2 text-[11px] font-bold text-toss-gray-400 uppercase bg-toss-gray-50 border-t border-toss-gray-100">
                  신규 프로젝트로 추가
                </div>
                <button onClick={() => { setUploadTarget("new"); setDropdownOpen(false); }}
                  className={`w-full px-4 py-3 text-left text-[14px] text-toss-blue font-semibold hover:bg-blue-50 transition ${
                    uploadTarget === "new" ? "bg-blue-50" : ""
                  }`}>
                  + 새 프로젝트로 추가...
                </button>
              </div>
            )}
          </div>

          {uploadTarget === "new" && (
            <input value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)}
              className="w-full mt-2 px-4 py-3.5 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue bg-white"
              placeholder="프로젝트 이름 (예: 홍길동 촬영분)" autoFocus />
          )}
        </div>

        {/* 업로드 진행바 */}
        {uploading && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-[13px] mb-1.5">
              <span className="text-toss-gray-500">업로드 중...</span>
              <span className="font-bold text-toss-blue">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-toss-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-toss-blue rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button onClick={() => router.back()} disabled={uploading}
            className="flex-1 py-3.5 bg-toss-gray-100 text-toss-gray-600 font-semibold rounded-xl hover:bg-toss-gray-200 disabled:opacity-50 transition text-[15px]">
            취소
          </button>
          <button onClick={handleUpload}
            disabled={uploading || !uploadFile || (uploadTarget === "new" && !newProjectTitle.trim())}
            className="flex-1 py-3.5 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover disabled:opacity-50 transition text-[15px]">
            {uploading ? "업로드 중..." : "업로드"}
          </button>
        </div>
      </div>
    </div>
  );
}
