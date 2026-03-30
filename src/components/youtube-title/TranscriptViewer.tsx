"use client";

import { useState } from "react";

export default function TranscriptViewer({ transcript }: { transcript: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!transcript) return null;

  const preview = transcript.slice(0, 300);
  const isLong = transcript.length > 300;

  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg width="16" height="16" fill="none" stroke="#3182f6" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-toss-gray-900">스크립트</h2>
        </div>
        <span className="text-[10px] text-toss-gray-400 bg-toss-gray-50 px-2 py-0.5 rounded-md">
          {transcript.length.toLocaleString()}자
        </span>
      </div>
      <p className="text-sm text-toss-gray-500 leading-relaxed whitespace-pre-wrap">
        {expanded || !isLong ? transcript : `${preview}...`}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-toss-blue hover:text-toss-blue-hover font-medium mt-3"
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      )}
    </div>
  );
}
