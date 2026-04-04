import { NextRequest, NextResponse } from "next/server";
import { getUploadPresignedUrl, getPresignedUrl } from "@/lib/r2";

// GET: presigned download URL
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) return NextResponse.json({ error: "key 필요" }, { status: 400 });

  const url = await getPresignedUrl(key, 86400 * 7); // 7일
  return NextResponse.json({ url });
}

// POST: presigned upload URL
export async function POST(request: NextRequest) {
  const { fileName, contentType } = await request.json();

  if (!fileName || !contentType) {
    return NextResponse.json({ error: "fileName, contentType 필요" }, { status: 400 });
  }

  const key = `community/${Date.now()}_${Math.random().toString(36).slice(2)}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "")}`;
  const uploadUrl = await getUploadPresignedUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
