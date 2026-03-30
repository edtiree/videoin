"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReviewProject {
  id: string;
  title: string;
  created_at: string;
  review_videos: { id: string; version: number; created_at: string }[];
}

export default function ReviewListPage() {
  const [projects, setProjects] = useState<ReviewProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const router = useRouter();

  // 업로드 모달
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTarget, setUploadTarget] = useState<"new" | string>("new"); // "new" or projectId
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("worker");
    if (saved) {
      setAuthed(true);
      loadProjects();
    } else {
      setLoading(false);
    }
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadProjects = () => {
    setLoading(true);
    fetch("/api/review/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleLogin = () => {
    window.location.href = "/";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 프로젝트를 삭제할까요? 모든 영상과 코멘트가 삭제됩니다.")) return;
    await fetch("/api/review/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadProjects();
  };

  const openUploadModal = () => {
    setShowUpload(true);
    setUploadFile(null);
    setUploadTarget("new");
    setNewProjectTitle("");
    setUploadProgress(0);
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

  const getNextVersion = (p: ReviewProject) => {
    if (!p.review_videos || p.review_videos.length === 0) return 1;
    return Math.max(...p.review_videos.map(v => v.version)) + 1;
  };

  const getSelectedLabel = () => {
    if (uploadTarget === "new") return newProjectTitle ? `새 프로젝트: ${newProjectTitle}` : "";
    const p = projects.find(p => p.id === uploadTarget);
    return p ? `${p.title} (v${getNextVersion(p)})` : "";
  };

  const handleUpload = async () => {
    if (!uploadFile || uploading) return;

    let targetProjectId = uploadTarget;

    setUploading(true);
    setUploadProgress(0);

    try {
      // 새 프로젝트 생성
      if (uploadTarget === "new") {
        if (!newProjectTitle.trim()) { alert("프로젝트 이름을 입력하세요"); setUploading(false); return; }
        const res = await fetch("/api/review/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newProjectTitle.trim() }),
        });
        if (!res.ok) throw new Error("프로젝트 생성 실패");
        const project = await res.json();
        targetProjectId = project.id;
      }

      setUploadProgress(5);

      // Step 1: presigned URL
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

      // Step 2: R2 업로드 (XHR for progress)
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

      // Step 3: DB 저장
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
      setShowUpload(false);
      router.push(`/review/${targetProjectId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-xs text-center space-y-4">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-[20px] font-bold text-toss-gray-900">로그인이 필요합니다</h1>
          <p className="text-[14px] text-toss-gray-500">홈에서 로그인 후 이용해주세요.</p>
          <a href="/" className="inline-block px-6 py-3 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover transition">홈으로</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-white border-b border-toss-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-toss-gray-400 hover:text-toss-gray-600 text-[14px]">← 홈</Link>
            <h1 className="text-[20px] font-bold text-toss-gray-900">영상 리뷰</h1>
          </div>
          <button onClick={openUploadModal}
            className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-xl hover:bg-toss-blue-hover transition">
            + 영상 업로드
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 mt-4">
        {loading ? (
          <div className="text-center py-20 text-toss-gray-400 text-[14px]">불러오는 중...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-toss-gray-400 text-[14px]">아직 프로젝트가 없어요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-toss-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <Link href={`/review/${p.id}`} className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-bold text-toss-gray-900 truncate">{p.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-toss-gray-400">
                        {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      </span>
                      <span className="px-2 py-0.5 bg-toss-gray-100 text-toss-gray-600 rounded text-[11px] font-bold">
                        영상 {p.review_videos?.length || 0}개
                      </span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/review/${p.id}`);
                      alert("공유 링크가 복사되었습니다!");
                    }}
                      className="px-3 py-1.5 text-[12px] font-semibold text-toss-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition">
                      링크 복사
                    </button>
                    <button onClick={() => handleDelete(p.id)}
                      className="px-3 py-1.5 text-[12px] font-semibold text-toss-red bg-red-50 rounded-lg hover:bg-red-100 transition">
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 업로드 모달 */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => !uploading && setShowUpload(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-toss-gray-900">영상 업로드</h3>
              {!uploading && <button onClick={() => setShowUpload(false)} className="text-toss-gray-400 text-[20px]">✕</button>}
            </div>

            {/* 파일 드롭 영역 */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition mb-5 ${
                uploadFile ? "border-toss-blue bg-blue-50/30" : "border-toss-gray-200 hover:border-toss-blue hover:bg-blue-50/20"
              }`}>
              {uploadFile ? (
                <div>
                  <div className="text-3xl mb-2">🎬</div>
                  <p className="text-[14px] font-semibold text-toss-gray-900 truncate">{uploadFile.name}</p>
                  <p className="text-[12px] text-toss-gray-400 mt-1">
                    {uploadFile.size < 1024 * 1024 * 1024
                      ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${(uploadFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB`}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-[14px] font-semibold text-toss-gray-700">파일을 드래그하거나 클릭해서 선택</p>
                  <p className="text-[12px] text-toss-gray-400 mt-1">영상 파일 (mp4, mov 등)</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
            </div>

            {/* 업로드 위치 지정 */}
            <div className="mb-5">
              <label className="text-[14px] font-bold text-toss-gray-900 mb-2 block">업로드 위치 지정 *</label>
              <div ref={dropdownRef} className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl text-left text-[14px] flex items-center justify-between focus:outline-none focus:border-toss-blue">
                  <span className={getSelectedLabel() ? "text-toss-gray-900" : "text-toss-gray-400"}>
                    {getSelectedLabel() || "프로젝트를 선택하세요"}
                  </span>
                  <span className="text-toss-gray-400">▾</span>
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-toss-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-[300px] overflow-y-auto">
                    {/* 기존 프로젝트 */}
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
                    {/* 새 프로젝트 */}
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

              {/* 새 프로젝트 이름 입력 */}
              {uploadTarget === "new" && (
                <input value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full mt-2 px-4 py-3 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue"
                  placeholder="프로젝트 이름 (예: 홍길동 촬영분)" autoFocus />
              )}
            </div>

            {/* 업로드 진행바 */}
            {uploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-toss-gray-500">업로드 중...</span>
                  <span className="font-bold text-toss-blue">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-toss-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-toss-blue rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2">
              <button onClick={() => setShowUpload(false)} disabled={uploading}
                className="flex-1 py-3 bg-toss-gray-100 text-toss-gray-600 font-semibold rounded-xl hover:bg-toss-gray-200 disabled:opacity-50 transition">
                취소
              </button>
              <button onClick={handleUpload}
                disabled={uploading || !uploadFile || (uploadTarget === "new" && !newProjectTitle.trim())}
                className="flex-1 py-3 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover disabled:opacity-50 transition">
                {uploading ? "업로드 중..." : "업로드"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
