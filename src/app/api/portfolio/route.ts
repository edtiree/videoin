import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 포트폴리오 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const profileId = searchParams.get("profile_id");

  if (!profileId) return NextResponse.json({ error: "profile_id 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("portfolio_videos")
    .select("*")
    .eq("editor_profile_id", profileId)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 포트폴리오 추가
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { editor_profile_id, type, youtube_video_id, youtube_url, file_key, external_url, title, thumbnail_url, description } = body;

  if (!editor_profile_id || !type) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 현재 최대 sort_order
  const { data: maxOrder } = await supabase
    .from("portfolio_videos")
    .select("sort_order")
    .eq("editor_profile_id", editor_profile_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (maxOrder?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("portfolio_videos")
    .insert({
      editor_profile_id, type,
      youtube_video_id, youtube_url,
      file_key, external_url,
      title, thumbnail_url, description,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE: 포트폴리오 삭제
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase.from("portfolio_videos").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
