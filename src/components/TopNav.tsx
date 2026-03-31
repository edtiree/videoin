"use client";

import { useRouter } from "next/navigation";

interface TopNavProps {
  title: string;
  backHref?: string;
  rightContent?: React.ReactNode;
}

export default function TopNav({ title, backHref, rightContent }: TopNavProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <div className="bg-white border-b border-toss-gray-100 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="w-8 h-8 flex items-center justify-center -ml-1 rounded-lg hover:bg-toss-gray-50 active:bg-toss-gray-100 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#191f28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-[16px] font-bold text-toss-gray-900">{title}</h1>
        </div>
        {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
      </div>
    </div>
  );
}
