"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

const CATEGORIES = ["자유", "중고거래", "장비", "노하우", "질문", "홍보"];

export default function NewPostPage() {
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("자유");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) openLoginModal();
  }, [isLoggedIn, openLoginModal]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      setError("이미지는 최대 10장까지 첨부할 수 있어요");
      return;
    }

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    const urls: string[] = [];

    for (const img of images) {
      try {
        const formData = new FormData();
        formData.append("file", img.file);

        const res = await fetch("/api/posts/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.key) {
          // R2 key → 프록시 URL로 변환 (만료 없음)
          urls.push(`/api/posts/image?key=${encodeURIComponent(data.key)}`);
        }
      } catch {
        console.error("이미지 업로드 실패");
      }
    }

    return urls;
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요"); return; }
    if (!content.trim()) { setError("내용을 입력해주세요"); return; }

    setSaving(true);
    setError("");

    // 이미지 업로드
    let imageUrls: string[] = [];
    if (images.length > 0) {
      imageUrls = await uploadImages();
    }

    // 투표 데이터 구성
    const validPollOptions = showPoll ? pollOptions.filter((o) => o.trim()) : [];
    const pollData = validPollOptions.length >= 2 ? validPollOptions.map((o) => o.trim()) : null;

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: profile?.id,
        category,
        title: title.trim(),
        content: content.trim(),
        image_urls: imageUrls,
        poll_options: pollData,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error || "작성에 실패했습니다"); setSaving(false); return; }

    router.push(`/community/${data.id}`);
  };

  if (!isLoggedIn) return null;

  return (
    <>
      <TopNav title="글 작성" backHref="/community" rightContent={
        <button onClick={handleSubmit} disabled={saving} className="text-[14px] font-semibold text-toss-blue disabled:opacity-50">
          {saving ? "등록 중" : "등록"}
        </button>
      } />

      <div className="max-w-[800px] mx-auto px-4 py-5 space-y-5">
        {/* 카테고리 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition ${
                  category === c ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full h-[48px] rounded-xl border border-toss-gray-200 px-4 text-[15px] focus:outline-none focus:border-toss-blue"
          />
        </div>

        {/* 내용 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={12}
            className="w-full rounded-xl border border-toss-gray-200 px-4 py-3 text-[15px] focus:outline-none focus:border-toss-blue resize-none"
          />
        </div>

        {/* 사진 첨부 */}
        <div>
          <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">사진 ({images.length}/10)</label>

          {/* 이미지 미리보기 */}
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
              {images.map((img, i) => (
                <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-toss-gray-100">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-toss-gray-200 text-[13px] text-toss-gray-400 hover:border-toss-blue hover:text-toss-blue transition w-full justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            사진 추가
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
        </div>

        {/* 투표 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-toss-gray-500">투표</label>
            <button
              onClick={() => { setShowPoll(!showPoll); if (showPoll) setPollOptions(["", ""]); }}
              className={`text-[12px] font-medium px-3 py-1 rounded-lg transition ${
                showPoll ? "bg-toss-blue text-white" : "bg-toss-gray-50 text-toss-gray-500"
              }`}
            >
              {showPoll ? "투표 제거" : "투표 추가"}
            </button>
          </div>

          {showPoll && (
            <div className="space-y-2 bg-toss-gray-50 rounded-xl p-4">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[i] = e.target.value;
                      setPollOptions(next);
                    }}
                    placeholder={`선택지 ${i + 1}`}
                    className="flex-1 h-[40px] rounded-lg border border-toss-gray-200 px-3 text-[14px] focus:outline-none focus:border-toss-blue"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                      className="w-[40px] h-[40px] rounded-lg border border-toss-gray-200 flex items-center justify-center text-toss-gray-400 hover:text-toss-red hover:border-toss-red transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="w-full h-[40px] rounded-lg border border-dashed border-toss-gray-200 text-[13px] text-toss-gray-400 hover:border-toss-blue hover:text-toss-blue transition"
                >
                  + 선택지 추가
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-toss-red text-[13px]">{error}</p>}
      </div>
    </>
  );
}
