"use client";

const ACTIVE_CATEGORIES = ["영상 편집", "영상 촬영", "썸네일", "모션그래픽"];

interface CategoryBadgeProps {
  category: string;
  size?: "sm" | "md";
}

export default function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  const isActive = ACTIVE_CATEGORIES.includes(category);
  const sizeClass = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-[12px] px-2.5 py-1";

  if (!isActive) {
    return (
      <span className={`inline-flex items-center gap-1 ${sizeClass} rounded-md bg-toss-gray-50 text-toss-gray-400 font-medium`}>
        {category}
        <span className="text-[9px] bg-toss-gray-200 text-toss-gray-400 px-1 py-px rounded">준비중</span>
      </span>
    );
  }

  return (
    <span className={`inline-block ${sizeClass} rounded-md bg-blue-50 text-toss-blue font-medium`}>
      {category}
    </span>
  );
}
