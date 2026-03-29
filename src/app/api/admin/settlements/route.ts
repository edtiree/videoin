import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const month = searchParams.get("month");

  const supabase = getSupabase();
  let query = supabase.from("settlements").select("*").order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    query = query.gte("settlement_month", `${month}-01`).lt("settlement_month", nextMonth);
  }

  const { data: settlements, error } = await query;
  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });

  // 각 정산서의 상세 항목도 조회
  const result = await Promise.all(
    (settlements || []).map(async (s) => {
      const { data: items } = await supabase
        .from("settlement_items").select("*").eq("settlement_id", s.id);
      return { ...s, items: items || [] };
    })
  );

  return NextResponse.json(result);
}
