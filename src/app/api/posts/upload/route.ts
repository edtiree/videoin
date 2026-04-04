import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, getPresignedUrl } from "@/lib/r2";

// POST: 이미지 업로드 (서버에서 R2로 직접 업로드)
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

    // presigned download URL (7일)
    const url = await getPresignedUrl(key, 86400 * 7);

    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("업로드 에러:", err);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
