import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get("workerId");

  const supabase = getSupabase();
  let query = supabase
    .from("review_projects")
    .select("*, review_videos(id, version, created_at)")
    .order("created_at", { ascending: false });

  if (workerId) {
    query = query.eq("worker_id", workerId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { title, workerId } = await request.json();
  if (!title) return NextResponse.json({ error: "제목 필요" }, { status: 400 });

  const supabase = getSupabase();
  const insertData: Record<string, string> = { title };
  if (workerId) insertData.worker_id = workerId;

  const { data, error } = await supabase
    .from("review_projects")
    .insert(insertData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const supabase = getSupabase();
  const { error } = await supabase.from("review_projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}
