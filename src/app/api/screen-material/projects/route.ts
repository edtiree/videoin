import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const workerId = request.nextUrl.searchParams.get("workerId");
  if (!workerId) return NextResponse.json({ error: "workerId 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("screen_material_projects")
    .select("id, name, status, video_name, video_info, created_at, updated_at")
    .eq("worker_id", workerId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { workerId, name, videoName, videoInfo, railwayJobId } = body;
  if (!workerId) return NextResponse.json({ error: "workerId 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("screen_material_projects")
    .insert({
      worker_id: workerId,
      name: name || "새 프로젝트",
      video_name: videoName || null,
      video_info: videoInfo || null,
      railway_job_id: railwayJobId || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
