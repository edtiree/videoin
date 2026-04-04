import { NextRequest, NextResponse } from "next/server";
import { getPresignedUrl } from "@/lib/r2";

// GET: R2 key → presigned URL로 리다이렉트
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "key 필요" }, { status: 400 });
  }

  try {
    const url = await getPresignedUrl(key, 3600); // 1시간
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "이미지를 찾을 수 없습니다" }, { status: 404 });
  }
}
