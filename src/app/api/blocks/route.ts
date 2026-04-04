import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blockerId = searchParams.get("blocker_id");

  if (!blockerId) return NextResponse.json({ error: "blocker_id 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_blocks")
    .select("*, users!user_blocks_blocked_id_fkey(nickname, profile_image)")
    .eq("blocker_id", blockerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { blocker_id, blocked_id } = await request.json();

  if (!blocker_id || !blocked_id) return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id, blocked_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const blockerId = searchParams.get("blocker_id");
  const blockedId = searchParams.get("blocked_id");

  if (!blockerId || !blockedId) return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
