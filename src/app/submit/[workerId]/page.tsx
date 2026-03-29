"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Worker } from "@/types";
import PDForm from "@/components/PDForm";
import EditorForm from "@/components/EditorForm";
import SettlementHistory from "@/components/SettlementHistory";

type Tab = "write" | "history";

export default function SubmitPage() {
  const params = useParams();
  const workerId = params.workerId as string;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<Tab>("write");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchWorker() {
      try {
        const res = await fetch(`/api/worker/${workerId}`);
        if (!res.ok) {
          setError("직원 정보를 찾을 수 없습니다. 링크를 다시 확인해주세요.");
          return;
        }
        const data = await res.json();
        setWorker(data);
      } catch {
        setError("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    }
    fetchWorker();
  }, [workerId]);

  const handleSubmitSuccess = () => {
    setSubmitted(true);
    setRefreshKey((k) => k + 1);
  };

  const handleResumeDraft = () => {
    setTab("write");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">정보를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            접근할 수 없습니다
          </h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#x2705;</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            정산서가 제출되었습니다
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {worker.name}님의 정산서가 성공적으로 저장되었습니다.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
            >
              새 정산서 작성
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setTab("history");
              }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
            >
              제출 이력 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-800 mb-1">정산서</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">{worker.name}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                worker.contractType === "프리랜서"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {worker.contractType}
            </span>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab("write")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
              tab === "write"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            정산서 작성
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
              tab === "history"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            제출 이력
          </button>
        </div>

        {/* 탭 내용 */}
        {tab === "write" ? (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            {worker.role === "촬영비" ? (
              <PDForm worker={worker} onSubmitSuccess={handleSubmitSuccess} />
            ) : (
              <EditorForm worker={worker} onSubmitSuccess={handleSubmitSuccess} />
            )}
          </div>
        ) : (
          <SettlementHistory
            workerId={worker.id}
            role={worker.role}
            contractType={worker.contractType}
            refreshKey={refreshKey}
            onResumeDraft={handleResumeDraft}
          />
        )}
      </div>
    </div>
  );
}
