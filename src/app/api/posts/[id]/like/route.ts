import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 유저의 좋아요 상태 확인
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  if (!userId) return NextResponse.json({ liked: false });

  const supabase = getSupabase();
  const { data } = await supabase.from("post_likes").select("id").eq("post_id", id).eq("user_id", userId).single();
  return NextResponse.json({ liked: !!data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user_id } = await request.json();

  if (!user_id) return NextResponse.json({ error: "user_id 필요" }, { status: 400 });

  const supabase = getSupabase();

  // 이미 좋아요 했는지 확인
  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", id)
    .eq("user_id", user_id)
    .single();

  if (existing) {
    // 좋아요 취소
    await supabase.from("post_likes").delete().eq("id", existing.id);
    const { data: post } = await supabase.from("posts").select("like_count").eq("id", id).single();
    await supabase.from("posts").update({ like_count: Math.max((post?.like_count || 1) - 1, 0) }).eq("id", id);
    return NextResponse.json({ liked: false });
  } else {
    // 좋아요 추가
    await supabase.from("post_likes").insert({ post_id: id, user_id });
    const { data: post } = await supabase.from("posts").select("like_count").eq("id", id).single();
    await supabase.from("posts").update({ like_count: (post?.like_count || 0) + 1 }).eq("id", id);
    return NextResponse.json({ liked: true });
  }
}
