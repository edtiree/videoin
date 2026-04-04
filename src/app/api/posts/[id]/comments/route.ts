import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("post_comments")
    .select("*, users!post_comments_user_id_fkey(id, nickname, profile_image)")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
    .select("*, users!post_comments_user_id_fkey(id, nickname, profile_image)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // comment_count 증가
  const { data: post } = await supabase.from("posts").select("comment_count").eq("id", id).single();
  if (post) {
    await supabase.from("posts").update({ comment_count: (post.comment_count || 0) + 1 }).eq("id", id);
  }

  return NextResponse.json(data, { status: 201 });
}
