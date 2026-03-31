import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "카드뉴스 메이커",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
