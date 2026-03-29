"use client";

import { useRef, useState } from "react";
import ConfirmModal from "./ConfirmModal";

interface FileUploadProps {
  onUpload: (urls: string[]) => void;
  currentUrls?: string[];
}

export default function FileUpload({ onUpload, currentUrls = [] }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>(currentUrls);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(currentUrls);
  const inputRef = useRef<HTMLInputElement>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) { setAlertMsg("이미지 파일만 업로드 가능합니다."); return; }

    setPreviews((prev) => [...prev, ...imageFiles.map((f) => URL.createObjectURL(f))]);
    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) newUrls.push(data.url);
      }
      const allUrls = [...uploadedUrls, ...newUrls];
      setUploadedUrls(allUrls);
      onUpload(allUrls);
    } catch { setAlertMsg("업로드 중 오류가 발생했습니다."); setPreviews(uploadedUrls); }
    finally { setUploading(false); }
  };

  const removeImage = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    const newUrls = uploadedUrls.filter((_, i) => i !== index);
    setPreviews(newPreviews); setUploadedUrls(newUrls); onUpload(newUrls);
  };

  return (
    <div>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {previews.map((src, i) => (
            <div key={i} className="relative group">
              <img src={src} alt={`영수증 ${i + 1}`}
                className="w-[72px] h-[72px] object-cover rounded-xl border border-toss-gray-200" />
              <button type="button" onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-toss-gray-800 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="border-2 border-dashed border-toss-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-toss-blue hover:bg-blue-50/30 transition-all"
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <div className="w-4 h-4 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-toss-gray-500">업로드 중...</span>
          </div>
        ) : (
          <p className="text-[13px] text-toss-gray-400">
            📎 사진 첨부 (여러 장 가능)
          </p>
        )}
      </div>

      {alertMsg && (
        <ConfirmModal title="알림" message={alertMsg} confirmText="확인" onConfirm={() => setAlertMsg(null)} />
      )}
    </div>
  );
}
