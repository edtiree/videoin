import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    let file: File | null = null;

    // Content-Type에 따라 파싱 방식 결정
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      file = formData.get("file") as File | null;
    }

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다. content-type: " + contentType }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "10MB 이하만 가능합니다" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const key = `community/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadToR2(key, buffer, file.type || "image/jpeg");

    return NextResponse.json({ key });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("업로드 에러:", message);
    return NextResponse.json({ error: "업로드 실패: " + message }, { status: 500 });
  }
}
