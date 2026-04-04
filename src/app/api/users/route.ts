import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: auth_id로 유저 프로필 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authId = searchParams.get("authId");
  const userId = searchParams.get("userId");

  if (!authId && !userId) {
    return NextResponse.json({ error: "authId 또는 userId 필요" }, { status: 400 });
  }

  const supabase = getSupabase();

  let query = supabase.from("users").select("*");
  if (authId) query = query.eq("auth_id", authId);
  if (userId) query = query.eq("id", userId);

  const { data, error } = await query.single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  }

  return NextResponse.json(data);
}

// POST: 유저 프로필 업데이트
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, ...updates } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId 필요" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
