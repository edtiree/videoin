import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .order("filming_date", { ascending: false });

  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabase();

  if (body.id) {
    // Update
    const { id, created_at, ...updates } = body;
    void created_at;
    const { error } = await supabase.from("ads").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Insert
  const { data, error } = await supabase.from("ads").insert(body).select().single();
  if (error) return NextResponse.json({ error: "추가 실패" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const supabase = getSupabase();
  const { error } = await supabase.from("ads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}
