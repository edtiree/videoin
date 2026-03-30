import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, getPresignedUrl } from "@/lib/r2";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { frameId, base64 } = await request.json();

  if (!base64) return NextResponse.json({ error: "base64 필요" }, { status: 400 });

  const match = base64.match(/^data:(.*?);base64,(.*)$/);
  if (!match) return NextResponse.json({ error: "잘못된 base64 형식" }, { status: 400 });

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const key = `card-projects/${id}/frames/${frameId}.jpg`;

  await uploadToR2(key, buffer, contentType);
  const url = await getPresignedUrl(key, 86400);

  return NextResponse.json({ key, url, frameId });
}
