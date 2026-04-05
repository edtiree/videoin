import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 유저가 작성한 댓글 목록 (게시글 제목 포함)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = getSupabase();

  // 유저 정보
  const { data: user } = await supabase
    .from("users")
    .select("id, nickname, profile_image")
    .eq("id", userId)
    .single();

  // 댓글 목록
  const { data: comments, error } = await supabase
    .from("post_comments")
    .select("id, content, created_at, post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 게시글 제목 조인
  const postIds = [...new Set((comments || []).map((c: { post_id: string }) => c.post_id))];
  const { data: posts } = postIds.length > 0
    ? await supabase.from("posts").select("id, title").in("id", postIds)
    : { data: [] };
  const postMap = new Map((posts || []).map((p: { id: string; title: string }) => [p.id, p.title]));

  const result = (comments || []).map((c: { post_id: string }) => ({
    ...c,
    post_title: postMap.get(c.post_id) || null,
  }));

  return NextResponse.json({ comments: result, total: result.length, user });
}
