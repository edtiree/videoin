import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 캠페인 상세
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });

  // 조회수 증가
  await supabase.from("ad_campaigns").update({ view_count: (data.view_count || 0) + 1 }).eq("id", id);

  // 유저 정보 조인
  const { data: user } = await supabase.from("users").select("id, nickname, profile_image").eq("id", data.user_id).single();

  return NextResponse.json({ ...data, users: user });
}

// PATCH: 캠페인 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ad_campaigns")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: 캠페인 삭제
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
