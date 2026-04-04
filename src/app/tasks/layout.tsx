import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "요청된 작업",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
