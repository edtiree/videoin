import { Metadata } from "next";

export const metadata: Metadata = { title: "커뮤니티" };

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-white min-h-screen" style={{ backgroundColor: "#ffffff" }}>{children}</div>;
}
