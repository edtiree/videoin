import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "화면자료 제작기",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
