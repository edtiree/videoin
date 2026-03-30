import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ error: "videoId 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("review_comments")
    .select("*")
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { video_id, author_name, timecode, content, parent_id } = body;
  if (!video_id || !content) return NextResponse.json({ error: "필수값 누락" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("review_comments")
    .insert({
      video_id,
      author_name: author_name || "익명",
      timecode: timecode ?? null,
      content,
      parent_id: parent_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "작성 실패" }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();

  // 이모지 리액션
  if (body.action === "react") {
    const { id, emoji } = body;
    if (!id || !emoji) return NextResponse.json({ error: "필수값 누락" }, { status: 400 });
    const supabase = getSupabase();
    const { data: comment } = await supabase.from("review_comments").select("reactions").eq("id", id).single();
    const reactions = (comment?.reactions as Record<string, number>) || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    const { error } = await supabase.from("review_comments").update({ reactions }).eq("id", id);
    if (error) return NextResponse.json({ error: "리액션 실패" }, { status: 500 });
    return NextResponse.json({ success: true, reactions });
  }

  // 수정
  const { id, content } = body;
  if (!id || !content) return NextResponse.json({ error: "필수값 누락" }, { status: 400 });
  const supabase = getSupabase();
  const { error } = await supabase.from("review_comments").update({ content, edited: true }).eq("id", id);
  if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const supabase = getSupabase();
  const { error } = await supabase.from("review_comments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}
