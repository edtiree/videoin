"use client";

interface CategoryBadgeProps {
  category: string;
  size?: "sm" | "md";
}

export default function CategoryBadge({ category, size = "sm" }: CategoryBadgeProps) {
  const sizeClass = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-[12px] px-2.5 py-1";

  return (
    <span className={`inline-block ${sizeClass} rounded-md bg-blue-50 text-toss-blue font-medium`}>
      {category}
    </span>
  );
}
