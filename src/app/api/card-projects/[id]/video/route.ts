import { NextRequest, NextResponse } from "next/server";
import { getUploadPresignedUrl, getPresignedUrl, deleteFromR2 } from "@/lib/r2";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { contentType, fileName } = await request.json();
  const fileKey = `card-projects/${id}/video/${Date.now()}_${fileName || "video"}`;
  const uploadUrl = await getUploadPresignedUrl(fileKey, contentType || "video/mp4", 3600);
  const downloadUrl = await getPresignedUrl(fileKey, 86400);
  return NextResponse.json({ uploadUrl, fileKey, downloadUrl });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { fileKey } = await request.json();
  if (fileKey) {
    try { await deleteFromR2(fileKey); } catch {}
  }
  return NextResponse.json({ success: true });
}
