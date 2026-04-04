"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

const CATEGORIES = ["자유", "중고거래", "구인/구직", "장비", "노하우", "질문", "홍보"];

export default function NewPostPage() {
  const router = useRouter();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [category, setCategory] = useState("자유");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) openLoginModal();
  }, [isLoggedIn, openLoginModal]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요"); return; }
    if (!content.trim()) { setError("내용을 입력해주세요"); return; }

    setSaving(true);
    setError("");

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: profile?.id, category, title: title.trim(), content: content.trim() }),
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

      <div className="max-w-[640px] mx-auto px-4 py-5 space-y-5">
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

        {error && <p className="text-toss-red text-[13px]">{error}</p>}
      </div>
    </>
  );
}
