import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { workerId, categories } = await request.json();
  const supabase = getSupabase();
  const { error } = await supabase
    .from("workers")
    .update({ categories })
    .eq("id", workerId);
  if (error) return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}
