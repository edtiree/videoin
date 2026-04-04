import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select("*, users!reports_reporter_id_fkey(nickname)")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { reporter_id, target_type, target_id, reason, description } = body;

  if (!reporter_id || !target_type || !target_id || !reason) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .insert({ reporter_id, target_type, target_id, reason, description, status: "pending" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
