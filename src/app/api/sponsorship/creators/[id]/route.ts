import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 크리에이터 광고 프로필 상세
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("creator_ad_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });

  // 조회수 증가
  await supabase.from("creator_ad_profiles").update({ view_count: (data.view_count || 0) + 1 }).eq("id", id);

  // 유저 정보 조인
  const { data: user } = await supabase.from("users").select("id, nickname, profile_image").eq("id", data.user_id).single();

  return NextResponse.json({ ...data, users: user });
}

// DELETE: 크리에이터 광고 프로필 삭제
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { error } = await supabase.from("creator_ad_profiles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
