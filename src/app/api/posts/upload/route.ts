import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, getPresignedUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "10MB 이하만 가능" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const key = `community/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(key, buffer, file.type);

    // key를 반환 — 이미지 표시 시 /api/posts/image?key= 로 서빙
    return NextResponse.json({ key });
  } catch (err) {
    console.error("업로드 에러:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
