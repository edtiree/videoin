import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nickname = searchParams.get("nickname");
  const excludeId = searchParams.get("exclude_id"); // 본인 제외

  if (!nickname?.trim()) {
    return NextResponse.json({ available: false, error: "닉네임을 입력해주세요" });
  }

  const supabase = getSupabase();
  let query = supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("nickname", nickname.trim());

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count } = await query;

  return NextResponse.json({ available: (count || 0) === 0 });
}
