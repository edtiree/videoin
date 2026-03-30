import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("review_videos")
    .select("*")
    .eq("project_id", projectId)
    .order("version", { ascending: true });

  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const supabase = getSupabase();
  const { error } = await supabase.from("review_videos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}
