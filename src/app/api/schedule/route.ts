import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: 일정 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const month = searchParams.get("month"); // "2026-04" 형식

  if (!userId) return NextResponse.json({ error: "user_id 필요" }, { status: 400 });

  const supabase = getSupabase();
  let query = supabase
    .from("schedules")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (month) {
    query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 일정 등록
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, type, title, date, time, memo } = body;

  if (!user_id || !title?.trim() || !date) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 같은 날짜+시간 중복 체크
  if (time) {
    const { data: existing } = await supabase
      .from("schedules")
      .select("id")
      .eq("user_id", user_id)
      .eq("date", date)
      .eq("time", time);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "같은 시간에 이미 일정이 있습니다" }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from("schedules")
    .insert({
      user_id,
      type: type || "personal",
      title: title.trim(),
      date,
      time: time || null,
      memo: memo?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// DELETE: 일정 삭제
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
