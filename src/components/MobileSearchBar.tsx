"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MobileSearchBar({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/jobs?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="px-4 py-3 border-b border-toss-gray-100 bg-white">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-toss-gray-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="전문가, 공고 검색"
          className="w-full h-[42px] pl-10 pr-10 rounded-xl bg-toss-gray-50 border border-toss-gray-100 text-[14px] placeholder:text-toss-gray-300 focus:outline-none focus:border-toss-blue focus:bg-white transition"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-toss-gray-300 hover:text-toss-gray-500"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
