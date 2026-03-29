import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const { workerId } = await params;
  const url = new URL(request.url);
  const role = url.searchParams.get("role");

  if (!role) {
    return NextResponse.json(
      { error: "role parameter required" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  const { data: settlement } = await supabase
    .from("settlements")
    .select("*")
    .eq("worker_id", workerId)
    .eq("status", "임시저장")
    .eq("role", role)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!settlement) {
    return NextResponse.json(null);
  }

  const { data: items } = await supabase
    .from("settlement_items")
    .select("*")
    .eq("settlement_id", settlement.id);

  return NextResponse.json({
    id: settlement.id,
    month: settlement.settlement_month.slice(0, 7),
    items: items || [],
    created_at: settlement.created_at,
  });
}
