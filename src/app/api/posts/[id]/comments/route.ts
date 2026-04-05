import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 유저 정보 별도 조회
  const userIds = [...new Set((data || []).map((c: { user_id: string }) => c.user_id))];
  const { data: users } = await supabase.from("users").select("id, nickname, profile_image").in("id", userIds);
  const userMap = new Map((users || []).map((u: { id: string }) => [u.id, u]));

  const result = (data || []).map((c: { user_id: string }) => ({ ...c, users: userMap.get(c.user_id) || null }));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user_id, content, parent_id } = await request.json();

  if (!user_id || !content?.trim()) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: id, user_id, content: content.trim(), parent_id: parent_id || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // comment_count 증가
  const { data: post } = await supabase.from("posts").select("comment_count").eq("id", id).single();
  if (post) {
    await supabase.from("posts").update({ comment_count: (post.comment_count || 0) + 1 }).eq("id", id);
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH: 댓글 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { comment_id, content, user_id } = await request.json();

  if (!comment_id || !content?.trim() || !user_id) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 본인 댓글인지 확인
  const { data: comment } = await supabase.from("post_comments").select("user_id").eq("id", comment_id).single();
  if (!comment || comment.user_id !== user_id) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("post_comments")
    .update({ content: content.trim() })
    .eq("id", comment_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: 댓글 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get("comment_id");
  const userId = searchParams.get("user_id");

  if (!commentId || !userId) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 본인 댓글인지 확인
  const { data: comment } = await supabase.from("post_comments").select("user_id").eq("id", commentId).single();
  if (!comment || comment.user_id !== userId) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  // 대댓글도 함께 삭제
  await supabase.from("post_comments").delete().eq("parent_id", commentId);
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // comment_count 감소
  const { count } = await supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("post_id", postId);
  await supabase.from("posts").update({ comment_count: count || 0 }).eq("id", postId);

  return NextResponse.json({ success: true });
}
