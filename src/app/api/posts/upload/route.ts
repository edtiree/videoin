import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, getPresignedUrl } from "@/lib/r2";

// GET: R2 key → presigned download URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) return NextResponse.json({ error: "key 필요" }, { status: 400 });

  const url = await getPresignedUrl(key, 3600); // 1시간
  return NextResponse.json({ url });
}

// POST: 이미지 업로드 → R2 key 반환
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const key = `community/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(key, buffer, file.type);

    // key를 반환 (presigned URL 아님 — 표시 시 동적 생성)
    return NextResponse.json({ key });
  } catch (err) {
    console.error("업로드 에러:", err);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
