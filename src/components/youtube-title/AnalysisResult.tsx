"use client";

import type { Analysis } from "@/stores/titleProjectStore";

export default function AnalysisResult({ analysis }: { analysis: Analysis }) {
  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg width="16" height="16" fill="none" stroke="#3182f6" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
          </svg>
        </div>
        <h2 className="text-sm font-bold text-toss-gray-900">AI 분석 결과</h2>
      </div>

      {/* Guest */}
      {analysis.guest && (
        <div className="bg-blue-50 rounded-xl p-4">
          <span className="text-[10px] text-toss-blue font-semibold uppercase tracking-wider">출연자</span>
          <p className="text-sm text-toss-gray-700 mt-1 font-medium">{analysis.guest}</p>
        </div>
      )}

      {/* Summary */}
      <div>
        <span className="text-[10px] text-toss-gray-400 font-semibold uppercase tracking-wider">요약</span>
        <p className="text-sm text-toss-gray-600 mt-1.5 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Keywords */}
      {analysis.keywords.length > 0 && (
        <div>
          <span className="text-[10px] text-toss-gray-400 font-semibold uppercase tracking-wider">키워드</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {analysis.keywords.map((kw, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-toss-blue text-white shadow-sm"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Points */}
      {analysis.key_points.length > 0 && (
        <div>
          <span className="text-[10px] text-toss-gray-400 font-semibold uppercase tracking-wider">핵심 포인트</span>
          <div className="mt-2 space-y-2">
            {analysis.key_points.map((point, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-toss-blue">{i + 1}</span>
                </span>
                <p className="text-sm text-toss-gray-600 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notable Quotes */}
      {analysis.notable_quotes.length > 0 && (
        <div>
          <span className="text-[10px] text-toss-gray-400 font-semibold uppercase tracking-wider">인상적인 발언</span>
          <div className="mt-2 space-y-2">
            {analysis.notable_quotes.map((quote, i) => (
              <div
                key={i}
                className="pl-4 py-2 bg-toss-gray-50 rounded-r-lg"
                style={{ borderLeft: "3px solid #3182f6" }}
              >
                <p className="text-sm text-toss-gray-600 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
