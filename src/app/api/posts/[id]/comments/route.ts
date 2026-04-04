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
