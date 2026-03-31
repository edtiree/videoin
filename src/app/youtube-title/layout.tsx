import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "제목 생성기",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
