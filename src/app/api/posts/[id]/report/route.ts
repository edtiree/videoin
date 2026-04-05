import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user_id, reason } = await request.json();

  if (!user_id || !reason?.trim()) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 중복 신고 방지
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("post_id", id)
    .eq("user_id", user_id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "이미 신고한 게시글입니다" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({ post_id: id, user_id, reason: reason.trim(), status: "pending" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
