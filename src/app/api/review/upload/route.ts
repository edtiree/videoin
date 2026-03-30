import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getUploadPresignedUrl } from "@/lib/r2";

// Step 1: presigned URL 발급
export async function POST(request: NextRequest) {
  const { projectId, fileName, fileSize, contentType } = await request.json();

  if (!projectId || !fileName) {
    return NextResponse.json({ error: "projectId, fileName 필요" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 현재 최대 버전 조회
  const { data: existing } = await supabase
    .from("review_videos")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1);

  const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;
  const fileKey = `review/${projectId}/v${nextVersion}_${Date.now()}_${fileName}`;

  // presigned URL 발급
  const uploadUrl = await getUploadPresignedUrl(fileKey, contentType || "video/mp4", 3600);

  return NextResponse.json({ uploadUrl, fileKey, nextVersion });
}

// Step 2: 업로드 완료 후 DB 저장
export async function PUT(request: NextRequest) {
  const { projectId, fileKey, version, fileName, fileSize } = await request.json();

  if (!projectId || !fileKey) {
    return NextResponse.json({ error: "필수값 누락" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("review_videos")
    .insert({
      project_id: projectId,
      version: version || 1,
      title: `v${version || 1}`,
      file_key: fileKey,
      file_size: fileSize || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "DB 저장 실패" }, { status: 500 });
  }

  return NextResponse.json(data);
}
