import { NextResponse } from "next/server";
import { getUploadPresignedUrl, uploadToR2, getPresignedUrl } from "@/lib/r2";

export async function GET() {
  try {
    // 1. R2에 테스트 파일 직접 업로드
    const testKey = "test/ping.txt";
    await uploadToR2(testKey, Buffer.from("hello"), "text/plain");

    // 2. presigned GET URL 생성
    const getUrl = await getPresignedUrl(testKey, 600);

    // 3. presigned PUT URL 생성
    const putUrl = await getUploadPresignedUrl("test/upload-test.mp4", "video/mp4", 600);

    return NextResponse.json({
      success: true,
      message: "R2 연결 성공",
      presignedGetUrl: getUrl,
      presignedPutUrl: putUrl.substring(0, 200) + "...",
      putUrlDomain: new URL(putUrl).origin,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
