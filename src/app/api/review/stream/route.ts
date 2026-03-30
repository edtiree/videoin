import { NextRequest, NextResponse } from "next/server";
import { getPresignedUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
  const fileKey = request.nextUrl.searchParams.get("key");
  if (!fileKey) return NextResponse.json({ error: "key 필요" }, { status: 400 });

  const url = await getPresignedUrl(fileKey, 7200); // 2시간 유효
  return NextResponse.json({ url });
}
