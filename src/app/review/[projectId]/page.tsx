"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Video {
  id: string;
  project_id: string;
  version: number;
  title: string;
  description: string | null;
  file_key: string;
  file_size: number | null;
  duration: number | null;
  created_at: string;
}

interface Comment {
  id: string;
  video_id: string;
  author_name: string;
  timecode: number | null;
  content: string;
  created_at: string;
  edited?: boolean;
  parent_id?: string | null;
  reactions?: Record<string, number>;
}

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "👏", "🔥", "✅"];

interface Project {
  id: string;
  title: string;
  created_at: string;
}

function formatTimecode(sec: number | null): string {
  if (sec === null || sec === undefined) return "00:00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

const AVATAR_COLORS = [
  "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-pink-500",
  "bg-amber-500", "bg-teal-500", "bg-red-500", "bg-indigo-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function ReviewProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTarget, setUploadTarget] = useState<"new" | string>(projectId);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const uploadFileRef = useRef<HTMLInputElement>(null);
  const uploadDropdownRef = useRef<HTMLDivElement>(null);

  const [authorName, setAuthorName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [emojiPickerId, setEmojiPickerId] = useState<string | null>(null);
  const [versionDropdown, setVersionDropdown] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  const loadProject = useCallback(async () => {
    const res = await fetch("/api/review/projects");
    if (res.ok) {
      const all = await res.json();
      setAllProjects(all);
      const found = all.find((p: Project) => p.id === projectId);
      if (found) setProject(found);
    }
  }, [projectId]);

  const loadVideos = useCallback(async () => {
    const res = await fetch(`/api/review/videos?projectId=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setVideos(data);
      if (data.length > 0 && !selectedVideo) {
        setSelectedVideo(data[data.length - 1]); // 최신 버전 기본 선택
      }
    }
  }, [projectId, selectedVideo]);

  const loadComments = useCallback(async (videoId: string) => {
    const res = await fetch(`/api/review/comments?videoId=${videoId}`);
    if (res.ok) setComments(await res.json());
  }, []);

  const loadVideoUrl = useCallback(async (fileKey: string) => {
    setVideoUrl(null);
    const res = await fetch(`/api/review/stream?key=${encodeURIComponent(fileKey)}`);
    if (res.ok) {
      const { url } = await res.json();
      setVideoUrl(url);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadProject(), loadVideos()]).finally(() => setLoading(false));
  }, [loadProject, loadVideos]);

  useEffect(() => {
    if (selectedVideo) {
      loadVideoUrl(selectedVideo.file_key);
      loadComments(selectedVideo.id);
    }
  }, [selectedVideo, loadVideoUrl, loadComments]);

  // 저장된 이름 복원
  useEffect(() => {
    const saved = localStorage.getItem("review_author_name");
    if (saved) setAuthorName(saved);
  }, []);

  // 업로드 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (uploadDropdownRef.current && !uploadDropdownRef.current.contains(e.target as Node)) setUploadDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openUploadModal = () => {
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadTarget(projectId);
    setNewProjectTitle("");
    setUploadProgress(0);
  };

  const getNextVersionForProject = (pid: string) => {
    if (pid === projectId) {
      if (videos.length === 0) return 1;
      return Math.max(...videos.map(v => v.version)) + 1;
    }
    const p = allProjects.find((pr: any) => pr.id === pid);
    if (!p) return 1;
    const vids = (p as any).review_videos || [];
    if (vids.length === 0) return 1;
    return Math.max(...vids.map((v: any) => v.version)) + 1;
  };

  const getUploadSelectedLabel = () => {
    if (uploadTarget === "new") return newProjectTitle ? `새 프로젝트: ${newProjectTitle}` : "";
    if (uploadTarget === projectId) return `${project?.title || ""} (v${getNextVersionForProject(projectId)})`;
    const p = allProjects.find((pr: any) => pr.id === uploadTarget);
    return p ? `${p.title} (v${getNextVersionForProject(uploadTarget)})` : "";
  };

  const handleUpload = async () => {
    if (!uploadFile || uploading) return;
    let targetPid = uploadTarget;
    setUploading(true);
    setUploadProgress(0);
    try {
      if (uploadTarget === "new") {
        if (!newProjectTitle.trim()) { alert("프로젝트 이름을 입력하세요"); setUploading(false); return; }
        const res = await fetch("/api/review/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newProjectTitle.trim() }),
        });
        if (!res.ok) throw new Error("프로젝트 생성 실패");
        const proj = await res.json();
        targetPid = proj.id;
      }
      setUploadProgress(5);
      const res1 = await fetch("/api/review/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: targetPid, fileName: uploadFile.name, fileSize: uploadFile.size, contentType: uploadFile.type || "video/mp4" }),
      });
      if (!res1.ok) throw new Error("presigned URL 발급 실패");
      const { uploadUrl, fileKey, nextVersion } = await res1.json();
      setUploadProgress(10);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setUploadProgress(10 + Math.round((ev.loaded / ev.total) * 85)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`업로드 실패: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.open("PUT", uploadUrl);
        xhr.send(uploadFile);
      });
      const res3 = await fetch("/api/review/upload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: targetPid, fileKey, version: nextVersion, fileName: uploadFile.name, fileSize: uploadFile.size }),
      });
      if (!res3.ok) throw new Error("DB 저장 실패");
      setUploadProgress(100);
      setShowUploadModal(false);
      if (targetPid === projectId) {
        const newVideo = await res3.json();
        setVideos((prev) => [...prev, newVideo]);
        setSelectedVideo(newVideo);
      } else {
        window.location.href = `/review/${targetPid}`;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  // 타임코드가 추가된 상태에서 재생 위치 변경 시 자동 갱신
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => {
      if (capturedTime !== null) {
        setCapturedTime(video.currentTime);
      }
    };
    video.addEventListener("seeked", sync);
    video.addEventListener("timeupdate", sync);
    return () => {
      video.removeEventListener("seeked", sync);
      video.removeEventListener("timeupdate", sync);
    };
  }, [capturedTime]);

  const handleCaptureTime = () => {
    if (videoRef.current) {
      setCapturedTime(videoRef.current.currentTime);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !selectedVideo) return;
    setSubmitting(true);

    if (authorName.trim()) localStorage.setItem("review_author_name", authorName.trim());

    const res = await fetch("/api/review/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: selectedVideo.id,
        author_name: authorName.trim() || "익명",
        timecode: capturedTime,
        content: commentText.trim(),
      }),
    });

    if (res.ok) {
      setCommentText("");
      setCapturedTime(null);
      loadComments(selectedVideo.id);
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (id: string) => {
    setMenuOpenId(null);
    await fetch("/api/review/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selectedVideo) loadComments(selectedVideo.id);
  };

  const startEdit = (c: Comment) => {
    setMenuOpenId(null);
    setEditingId(c.id);
    setEditText(c.content);
  };

  const handleEditComment = async (id: string) => {
    if (!editText.trim()) return;
    await fetch("/api/review/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: editText.trim() }),
    });
    setEditingId(null);
    setEditText("");
    if (selectedVideo) loadComments(selectedVideo.id);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !replyingTo || !selectedVideo) return;
    await fetch("/api/review/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: selectedVideo.id,
        author_name: authorName.trim() || "익명",
        content: replyText.trim(),
        parent_id: replyingTo.id,
      }),
    });
    setReplyText("");
    setReplyingTo(null);
    loadComments(selectedVideo.id);
  };

  const handleReact = async (commentId: string, emoji: string) => {
    setEmojiPickerId(null);
    await fetch("/api/review/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "react", id: commentId, emoji }),
    });
    if (selectedVideo) loadComments(selectedVideo.id);
  };

  const seekTo = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play();
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = selectedVideo?.title || "video";
      a.click();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-toss-gray-400">불러오는 중...</div>;
  if (!project) return <div className="min-h-screen flex items-center justify-center text-toss-gray-400">프로젝트를 찾을 수 없습니다</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-toss-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/review" className="text-toss-gray-400 hover:text-toss-gray-600 text-[14px]">← 목록</Link>
            <h1 className="text-[20px] font-bold text-toss-gray-900">{project.title}</h1>
            {selectedVideo && (
              <div className="relative">
                <button onClick={() => setVersionDropdown(!versionDropdown)}
                  className="px-2.5 py-1 border border-toss-gray-200 rounded-lg text-[13px] font-semibold text-toss-gray-600 hover:border-toss-gray-400 transition flex items-center gap-1">
                  v{selectedVideo.version} <span className="text-[10px]">▾</span>
                </button>
                {versionDropdown && (
                  <div className="absolute left-0 top-9 bg-white border border-toss-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[180px]">
                    {[...videos].reverse().map((v) => (
                      <button key={v.id} onClick={() => { setSelectedVideo(v); setVersionDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center gap-2 hover:bg-toss-gray-50 transition ${
                          selectedVideo?.id === v.id ? "bg-blue-50" : ""
                        }`}>
                        <span className="font-semibold text-toss-gray-900">{project.title}</span>
                        <span className="px-1.5 py-0.5 bg-toss-gray-100 text-toss-gray-500 rounded text-[11px] font-bold">v{v.version}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("링크가 복사되었습니다!"); }}
              className="px-3 py-1.5 text-[13px] text-toss-gray-500 hover:text-toss-gray-700 transition">공유</button>
            {videoUrl && (
              <button onClick={handleDownload}
                className="px-3 py-1.5 text-[13px] text-toss-gray-500 hover:text-toss-gray-700 transition">다운로드</button>
            )}
            <button onClick={openUploadModal}
              className="px-4 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-xl hover:bg-toss-blue-hover transition">
              + 업로드
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 mt-4">
        {videos.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🎥</div>
            <p className="text-toss-gray-400 text-[14px] mb-4">아직 영상이 없어요</p>
            <button onClick={openUploadModal}
              className="px-6 py-3 bg-toss-blue text-white font-semibold rounded-xl hover:bg-toss-blue-hover transition">
              영상 업로드
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 왼쪽: 영상 */}
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-black rounded-2xl overflow-hidden aspect-video">
                {videoUrl ? (
                  <video ref={videoRef} src={videoUrl} controls className="w-full h-full" playsInline />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/50">영상 로딩 중...</div>
                )}
              </div>
              {selectedVideo && (
                <div className="text-[12px] text-toss-gray-400">
                  {formatFileSize(selectedVideo.file_size)} · {new Date(selectedVideo.created_at).toLocaleDateString("ko-KR")}
                </div>
              )}
            </div>

            {/* 오른쪽: 코멘트 */}
            <div className="space-y-3">
              {/* 코멘트 입력 */}
              <div className="bg-white rounded-2xl border border-toss-gray-100 p-4 space-y-3">
                <h3 className="text-[14px] font-bold text-toss-gray-900">피드백 남기기</h3>
                {capturedTime !== null && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-toss-gray-100 text-toss-gray-600 rounded-lg text-[12px] font-bold">영상</span>
                    <button onClick={handleCaptureTime}
                      className="px-2 py-1 bg-pink-50 text-pink-600 rounded-lg text-[12px] font-mono font-bold hover:bg-pink-100 transition">
                      {formatTimecode(capturedTime)}
                    </button>
                    <button onClick={() => setCapturedTime(null)}
                      className="text-toss-gray-400 text-[12px] font-semibold hover:text-toss-red transition">취소</button>
                  </div>
                )}
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); }}}
                  className="w-full px-3 py-2 border border-toss-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-toss-blue resize-none"
                  rows={3} placeholder="내용을 입력하세요." />
                <div className="flex items-center justify-between">
                  <button onClick={handleCaptureTime} title="타임코드 추가"
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-pink-50 text-pink-500 hover:bg-pink-100 transition text-[18px]">⏱</button>
                  <button onClick={handleSubmitComment} disabled={submitting || !commentText.trim()}
                    className="px-5 py-2 bg-toss-blue text-white text-[13px] font-semibold rounded-xl hover:bg-toss-blue-hover disabled:opacity-50 transition">
                    {submitting ? "등록 중..." : "등록"}
                  </button>
                </div>
              </div>

              {/* 코멘트 목록 */}
              <div className="bg-white rounded-2xl border border-toss-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-toss-gray-100">
                  <h3 className="text-[14px] font-bold text-toss-gray-900">
                    피드백 <span className="text-toss-gray-400 font-normal">{comments.length}</span>
                  </h3>
                </div>
                {comments.filter(c => !c.parent_id).length === 0 ? (
                  <div className="text-center py-8 text-toss-gray-400 text-[13px]">아직 피드백이 없어요</div>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto">
                    {comments.filter(c => !c.parent_id).map((c) => {
                      const replies = comments.filter(r => r.parent_id === c.id);
                      return (
                        <div key={c.id}>
                          <CommentItem c={c} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId}
                            editingId={editingId} editText={editText} setEditText={setEditText}
                            startEdit={startEdit} handleEditComment={handleEditComment}
                            handleDeleteComment={handleDeleteComment} setEditingId={setEditingId}
                            seekTo={seekTo} setReplyingTo={setReplyingTo}
                            emojiPickerId={emojiPickerId} setEmojiPickerId={setEmojiPickerId}
                            handleReact={handleReact} />
                          {replies.map((r) => (
                            <div key={r.id} className="pl-10">
                              <CommentItem c={r} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId}
                                editingId={editingId} editText={editText} setEditText={setEditText}
                                startEdit={startEdit} handleEditComment={handleEditComment}
                                handleDeleteComment={handleDeleteComment} setEditingId={setEditingId}
                                seekTo={seekTo} setReplyingTo={setReplyingTo} isReply
                                emojiPickerId={emojiPickerId} setEmojiPickerId={setEmojiPickerId}
                                handleReact={handleReact} />
                            </div>
                          ))}
                          {replyingTo?.id === c.id && (
                            <div className="pl-10 px-4 py-2 bg-toss-gray-50">
                              <div className="flex gap-2 items-start">
                                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }}}
                                  className="flex-1 px-3 py-2 border border-toss-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-toss-blue resize-none"
                                  rows={2} placeholder={`${c.author_name}에게 답장...`} autoFocus />
                                <div className="flex flex-col gap-1">
                                  <button onClick={handleReply} disabled={!replyText.trim()}
                                    className="px-3 py-1.5 text-[12px] text-white bg-toss-blue rounded-lg hover:bg-toss-blue-hover disabled:opacity-50 transition">등록</button>
                                  <button onClick={() => setReplyingTo(null)}
                                    className="px-3 py-1.5 text-[12px] text-toss-gray-500 bg-toss-gray-100 rounded-lg hover:bg-toss-gray-200 transition">취소</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-bold text-toss-gray-900">영상 업로드</h3>
              {!uploading && <button onClick={() => setShowUploadModal(false)} className="text-toss-gray-400 text-[20px]">✕</button>}
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith("video/")) setUploadFile(f); }}
              onClick={() => uploadFileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition mb-5 ${
                uploadFile ? "border-toss-blue bg-blue-50/30" : "border-toss-gray-200 hover:border-toss-blue"
              }`}>
              {uploadFile ? (
                <div>
                  <div className="text-3xl mb-2">🎬</div>
                  <p className="text-[14px] font-semibold text-toss-gray-900 truncate">{uploadFile.name}</p>
                  <p className="text-[12px] text-toss-gray-400 mt-1">
                    {uploadFile.size < 1024 * 1024 * 1024 ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : `${(uploadFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB`}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-[14px] font-semibold text-toss-gray-700">파일을 드래그하거나 클릭해서 선택</p>
                  <p className="text-[12px] text-toss-gray-400 mt-1">영상 파일 (mp4, mov 등)</p>
                </div>
              )}
              <input ref={uploadFileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
            </div>

            <div className="mb-5">
              <label className="text-[14px] font-bold text-toss-gray-900 mb-2 block">업로드 위치 지정 *</label>
              <div ref={uploadDropdownRef} className="relative">
                <button onClick={() => setUploadDropdownOpen(!uploadDropdownOpen)}
                  className="w-full px-4 py-3 border border-toss-gray-200 rounded-xl text-left text-[14px] flex items-center justify-between focus:outline-none focus:border-toss-blue">
                  <span className={getUploadSelectedLabel() ? "text-toss-gray-900" : "text-toss-gray-400"}>
                    {getUploadSelectedLabel() || "프로젝트를 선택하세요"}
                  </span>
                  <span className="text-toss-gray-400">▾</span>
                </button>
                {uploadDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-toss-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-[250px] overflow-y-auto">
                    {allProjects.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-[11px] font-bold text-toss-gray-400 bg-toss-gray-50">기존 프로젝트의 다음버전으로 추가</div>
                        {allProjects.map((p) => (
                          <button key={p.id} onClick={() => { setUploadTarget(p.id); setUploadDropdownOpen(false); }}
                            className={`w-full px-4 py-2.5 text-left text-[13px] flex items-center gap-2 hover:bg-toss-gray-50 ${uploadTarget === p.id ? "bg-blue-50" : ""}`}>
                            <span className="font-semibold text-toss-gray-900">{p.title}</span>
                            <span className="px-1.5 py-0.5 bg-toss-gray-100 text-toss-gray-500 rounded text-[11px] font-bold">v{getNextVersionForProject(p.id)}</span>
                          </button>
                        ))}
                      </>
                    )}
                    <div className="px-4 py-2 text-[11px] font-bold text-toss-gray-400 bg-toss-gray-50 border-t border-toss-gray-100">신규 프로젝트로 추가</div>
                    <button onClick={() => { setUploadTarget("new"); setUploadDropdownOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-[13px] text-toss-blue font-semibold hover:bg-blue-50 ${uploadTarget === "new" ? "bg-blue-50" : ""}`}>
                      + 새 프로젝트로 추가...
                    </button>
                  </div>
                )}
              </div>
              {uploadTarget === "new" && (
                <input value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)}
                  className="w-full mt-2 px-4 py-3 border border-toss-gray-200 rounded-xl text-[14px] focus:outline-none focus:border-toss-blue"
                  placeholder="프로젝트 이름 (예: 홍길동 촬영분)" autoFocus />
              )}
            </div>

            {uploading && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="text-toss-gray-500">업로드 중...</span>
                  <span className="font-bold text-toss-blue">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-toss-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-toss-blue rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowUploadModal(false)} disabled={uploading}
                className="flex-1 py-3 bg-toss-gray-100 text-toss-gray-600 font-semibold rounded-xl hover:bg-toss-gray-200 disabled:opacity-50 transition">취소</button>
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

/* 코멘트 아이템 컴포넌트 */
function CommentItem({ c, menuOpenId, setMenuOpenId, editingId, editText, setEditText,
  startEdit, handleEditComment, handleDeleteComment, setEditingId, seekTo, setReplyingTo,
  isReply, emojiPickerId, setEmojiPickerId, handleReact }: {
  c: Comment; menuOpenId: string | null; setMenuOpenId: (id: string | null) => void;
  editingId: string | null; editText: string; setEditText: (t: string) => void;
  startEdit: (c: Comment) => void; handleEditComment: (id: string) => void;
  handleDeleteComment: (id: string) => void; setEditingId: (id: string | null) => void;
  seekTo: (sec: number) => void; setReplyingTo: (c: Comment | null) => void;
  isReply?: boolean; emojiPickerId: string | null; setEmojiPickerId: (id: string | null) => void;
  handleReact: (id: string, emoji: string) => void;
}) {
  const reactions = c.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div className="px-4 py-3 hover:bg-toss-gray-50 transition group">
      <div className="flex gap-3">
        <div className={`${isReply ? "w-7 h-7 text-[12px]" : "w-9 h-9 text-[14px]"} rounded-full ${getAvatarColor(c.author_name)} flex items-center justify-center text-white font-bold shrink-0`}>
          {c.author_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-toss-gray-900">{c.author_name}</span>
            <span className="text-[11px] text-toss-gray-400">{timeAgo(c.created_at)}{c.edited ? " (수정됨)" : ""}</span>
            {c.timecode !== null && (
              <span className="px-1.5 py-0.5 bg-toss-gray-100 text-toss-gray-500 rounded text-[10px] font-bold">영상</span>
            )}
            <div className="relative ml-auto">
              <button onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                className="w-6 h-6 flex items-center justify-center rounded-full text-toss-gray-400 hover:bg-toss-gray-100 hover:text-toss-gray-600 opacity-0 group-hover:opacity-100 transition">
                ⋮
              </button>
              {menuOpenId === c.id && (
                <div className="absolute right-0 top-7 bg-white border border-toss-gray-200 rounded-xl shadow-lg z-10 overflow-hidden w-24">
                  <button onClick={() => startEdit(c)}
                    className="w-full px-4 py-2.5 text-[13px] text-toss-gray-700 hover:bg-toss-gray-50 text-left transition">수정</button>
                  <button onClick={() => handleDeleteComment(c.id)}
                    className="w-full px-4 py-2.5 text-[13px] text-toss-red hover:bg-red-50 text-left transition">삭제</button>
                </div>
              )}
            </div>
          </div>

          {editingId === c.id ? (
            <div className="mt-1.5 space-y-2">
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditComment(c.id); }}}
                className="w-full px-3 py-2 border border-toss-blue rounded-xl text-[13px] focus:outline-none resize-none"
                rows={2} autoFocus />
              <div className="flex gap-1.5 justify-end">
                <button onClick={() => setEditingId(null)}
                  className="px-3 py-1 text-[12px] text-toss-gray-500 bg-toss-gray-100 rounded-lg hover:bg-toss-gray-200 transition">취소</button>
                <button onClick={() => handleEditComment(c.id)}
                  className="px-3 py-1 text-[12px] text-white bg-toss-blue rounded-lg hover:bg-toss-blue-hover transition">저장</button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-1.5">
                {c.timecode !== null && (
                  <button onClick={() => seekTo(c.timecode!)}
                    className="inline-block px-2 py-0.5 bg-pink-50 text-pink-600 rounded-lg text-[11px] font-mono font-bold hover:bg-pink-100 transition mr-1.5 mb-0.5">
                    {formatTimecode(c.timecode)}
                  </button>
                )}
                <span className="text-[13px] text-toss-gray-700 whitespace-pre-wrap">{c.content}</span>
              </div>

              {/* 답장 + 이모지 + 리액션 한 줄 */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {!isReply && (
                  <button onClick={() => setReplyingTo(c)}
                    className="text-[12px] text-toss-gray-400 hover:text-toss-gray-600 font-semibold transition">
                    답장하기
                  </button>
                )}
                <div className="relative">
                  <button onClick={() => setEmojiPickerId(emojiPickerId === c.id ? null : c.id)}
                    className="text-toss-gray-300 hover:text-toss-gray-500 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><line x1="19" y1="5" x2="19" y2="1"/><line x1="17" y1="3" x2="21" y2="3"/>
                    </svg>
                  </button>
                  {emojiPickerId === c.id && (
                    <div className="absolute left-0 bottom-7 bg-white border border-toss-gray-200 rounded-xl shadow-lg z-10 p-1.5 flex gap-0.5">
                      {EMOJI_LIST.map((emoji) => (
                        <button key={emoji} onClick={() => handleReact(c.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-100 text-[18px] transition">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* 리액션 배지들 */}
                {Object.entries(reactions).map(([emoji, count]) => (
                  <button key={emoji} onClick={() => handleReact(c.id, emoji)}
                    className="px-2 py-0.5 bg-pink-50 rounded-full text-[12px] hover:bg-pink-100 transition flex items-center gap-1">
                    <span>{emoji}</span><span className="text-toss-red font-bold">{count as number}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
