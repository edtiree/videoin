"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const CATEGORIES = [
  { group: "일반", items: [
    { key: "자유", icon: "💬", desc: "자유롭게 이야기해요" },
    { key: "질문", icon: "❓", desc: "궁금한 걸 물어봐요" },
  ]},
  { group: "정보 공유", items: [
    { key: "노하우", icon: "💡", desc: "작업 팁을 공유해요" },
    { key: "피드백", icon: "🎬", desc: "내 작업물 피드백 받아요" },
  ]},
  { group: "거래/홍보", items: [
    { key: "장터", icon: "🏪", desc: "장비·라이선스 사고팔아요" },
    { key: "홍보", icon: "📢", desc: "내 서비스를 알려요" },
  ]},
];

export default function NewPostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tradeType, setTradeType] = useState<"판매" | "구매" | "">("");

  // 모달 상태
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) openLoginModal();
  }, [isLoggedIn, openLoginModal]);

  // 스크롤 막기
  useEffect(() => {
    if (showCategorySheet || showPollModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showCategorySheet, showPollModal]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      setError("이미지는 최대 10장까지 첨부할 수 있어요");
      return;
    }
    const newImages = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
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
      const formData = new FormData();
      formData.append("file", img.file);
      const res = await fetch("/api/posts/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("이미지 업로드에 실패했습니다");
      const data = await res.json();
      if (data.key) urls.push(`/api/posts/image?key=${encodeURIComponent(data.key)}`);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!category) { setShowCategorySheet(true); return; }
    if (category === "장터" && !tradeType) { setError("구매/판매를 선택해주세요"); return; }
    if (!title.trim()) { setError("제목을 입력해주세요"); return; }
    if (!content.trim()) { setError("내용을 입력해주세요"); return; }

    setSaving(true);
    setError("");

    let imageUrls: string[] = [];
    if (images.length > 0) {
      try { imageUrls = await uploadImages(); }
      catch (e) { setError(e instanceof Error ? e.message : "이미지 업로드 실패"); setSaving(false); return; }
    }

    const validPollOptions = showPoll ? pollOptions.filter((o) => o.trim()) : [];
    const pollData = validPollOptions.length >= 2 ? validPollOptions.map((o) => o.trim()) : null;

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: profile?.id,
        category,
        title: (category === "장터" && tradeType ? `[${tradeType}] ` : "") + title.trim(),
        content: content.trim(),
        image_urls: imageUrls,
        poll_options: pollData,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error || "작성에 실패했습니다"); setSaving(false); return; }
    router.replace(`/community/${data.id}`);
  };

  const getCategoryIcon = (key: string) => {
    for (const g of CATEGORIES) {
      const found = g.items.find(i => i.key === key);
      if (found) return found.icon;
    }
    return "📝";
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 헤더: X + 등록 */}
      <div className="sticky top-0 z-30 bg-white">
        <div className="pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center justify-between px-4 h-[52px]">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-toss-gray-700">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-[14px] font-semibold bg-toss-blue text-white disabled:opacity-50"
            >
              {saving ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 px-5">
        {/* 주제 선택 */}
        <button
          onClick={() => setShowCategorySheet(true)}
          className="flex items-center justify-between py-3.5 border-b border-toss-gray-200 w-full"
        >
          <span className={`text-[15px] ${category ? "font-medium text-toss-gray-900" : "text-toss-gray-400"}`}>
            {category ? `${getCategoryIcon(category)} ${category}` : "게시판을 선택하세요"}
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-gray-400"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        {/* 장터: 구매/판매 선택 */}
        {category === "장터" && (
          <div className="flex gap-2 py-3 border-b border-toss-gray-200">
            <button
              onClick={() => setTradeType("판매")}
              className={`flex-1 h-[40px] rounded-xl text-[14px] font-medium transition ${
                tradeType === "판매"
                  ? "bg-toss-blue text-white"
                  : "bg-toss-gray-50 text-toss-gray-500 border border-toss-gray-200"
              }`}
            >
              판매
            </button>
            <button
              onClick={() => setTradeType("구매")}
              className={`flex-1 h-[40px] rounded-xl text-[14px] font-medium transition ${
                tradeType === "구매"
                  ? "bg-toss-blue text-white"
                  : "bg-toss-gray-50 text-toss-gray-500 border border-toss-gray-200"
              }`}
            >
              구매
            </button>
          </div>
        )}

        {/* 제목 */}
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(""); }}
          placeholder="제목"
          className="w-full py-3.5 text-[16px] font-semibold text-toss-gray-900 placeholder:text-toss-gray-300 border-b border-toss-gray-200 outline-none bg-transparent"
        />

        {/* 내용 */}
        <textarea
          value={content}
          onChange={(e) => { setContent(e.target.value); setError(""); }}
          placeholder="내용을 입력하세요."
          className="w-full py-3.5 text-[15px] text-toss-gray-700 placeholder:text-toss-gray-300 border-none outline-none bg-transparent resize-none leading-relaxed min-h-[200px]"
        />

        {/* 에러 */}
        {error && <p className="text-toss-red text-[13px] mt-2">{error}</p>}

        {/* 투표 미리보기 */}
        {showPoll && pollOptions.some(o => o.trim()) && (
          <div className="mt-4 bg-toss-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-toss-gray-700">투표</p>
              <button onClick={() => setShowPollModal(true)} className="text-[12px] text-toss-blue font-medium">수정</button>
            </div>
            <div className="space-y-2">
              {pollOptions.filter(o => o.trim()).map((opt, i) => (
                <div key={i} className="bg-white rounded-lg px-4 py-2.5 text-[14px] text-toss-gray-700 border border-toss-gray-100">{opt}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단: 이미지 프리뷰 + 툴바 */}
      <div className="sticky bottom-0 bg-white border-t border-toss-gray-100">
        {/* 이미지 프리뷰 */}
        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
            {images.map((img, i) => (
              <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-toss-gray-100">
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-toss-gray-900 rounded-full flex items-center justify-center"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 툴바 */}
        <div className="flex items-center gap-1 px-3 py-2 pb-[env(safe-area-inset-bottom,8px)]">
          {/* 사진 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-toss-gray-500 hover:bg-toss-gray-50 rounded-lg transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            사진
          </button>

          {/* 투표 */}
          <button
            onClick={() => setShowPollModal(true)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] rounded-lg transition ${
              showPoll ? "text-toss-blue bg-blue-50" : "text-toss-gray-500 hover:bg-toss-gray-50"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 11H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5"/><path d="M15 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5"/><path d="M9 3h6v18H9z"/>
            </svg>
            투표
          </button>

          {/* 태그 */}
          <button
            onClick={() => {
              setContent(prev => prev.endsWith("#") ? prev : prev + (prev && !prev.endsWith("\n") && !prev.endsWith(" ") ? " #" : "#"));
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-toss-gray-500 hover:bg-toss-gray-50 rounded-lg transition"
          >
            <span className="text-[18px] font-bold">#</span>
            태그
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
      </div>

      {/* 카테고리 선택 바텀시트 */}
      {showCategorySheet && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategorySheet(false)} />
          <div className="relative bg-white dark:bg-[var(--surface)] w-full md:w-[400px] md:rounded-2xl rounded-t-2xl pb-[env(safe-area-inset-bottom,16px)] animate-slide-up max-h-[80vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-[18px] font-bold text-toss-gray-900">게시글 주제를 선택해주세요.</h3>
              <button onClick={() => setShowCategorySheet(false)} className="text-toss-gray-400 p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-5 pb-4">
              {CATEGORIES.map((group) => (
                <div key={group.group} className="mb-5">
                  <p className="text-[13px] font-semibold text-toss-gray-400 mb-2">{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => { setCategory(item.key); setShowCategorySheet(false); }}
                        className={`px-4 py-2 rounded-full text-[14px] font-medium border transition ${
                          category === item.key
                            ? "border-toss-blue bg-blue-50 text-toss-blue"
                            : "border-toss-gray-200 text-toss-gray-700 hover:bg-toss-gray-50"
                        }`}
                      >
                        {item.icon} {item.key}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 투표 만들기 모달 */}
      {showPollModal && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-[var(--background)]">
          <div className="pt-[env(safe-area-inset-top,0px)]">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 h-[52px] border-b border-toss-gray-100">
              <button
                onClick={() => {
                  if (!showPoll) { setPollOptions(["", "", ""]); }
                  setShowPollModal(false);
                }}
                className="w-10 h-10 flex items-center justify-center text-toss-gray-700"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <h3 className="text-[16px] font-bold text-toss-gray-900">투표 만들기</h3>
              <button
                onClick={() => {
                  const valid = pollOptions.filter(o => o.trim());
                  if (valid.length >= 2) {
                    setShowPoll(true);
                    setShowPollModal(false);
                  } else {
                    setError("투표 항목을 2개 이상 입력해주세요");
                    setShowPollModal(false);
                  }
                }}
                className="text-[15px] font-semibold text-toss-green"
              >
                완료
              </button>
            </div>

            {/* 투표 항목 입력 */}
            <div className="px-5 py-4">
              <div className="space-y-3">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder="항목 입력"
                      className="flex-1 py-3 text-[15px] text-toss-gray-900 placeholder:text-toss-gray-300 border-b border-toss-gray-100 focus:border-toss-blue outline-none bg-transparent transition"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                        className="w-8 h-8 flex items-center justify-center text-toss-gray-300 hover:text-toss-red transition"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 5 && (
                <button
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="w-full mt-4 py-3.5 rounded-xl bg-toss-gray-100 text-[14px] font-medium text-toss-gray-600 hover:bg-toss-gray-200 transition"
                >
                  + 항목 추가
                </button>
              )}

              {/* 투표 제거 */}
              {showPoll && (
                <button
                  onClick={() => {
                    setShowPoll(false);
                    setPollOptions(["", "", ""]);
                    setShowPollModal(false);
                  }}
                  className="w-full mt-3 py-3 text-[14px] text-toss-red font-medium"
                >
                  투표 삭제
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
