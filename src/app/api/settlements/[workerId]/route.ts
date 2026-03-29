import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const { workerId } = await params;
  const supabase = getSupabase();

  // 정산서 목록 조회 (최신순)
  const { data: settlements, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("worker_id", workerId)
    .order("settlement_month", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "정산서 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // 각 정산서의 상세 항목도 함께 조회
  const settlementsWithItems = await Promise.all(
    (settlements || []).map(async (s) => {
      const { data: items } = await supabase
        .from("settlement_items")
        .select("*")
        .eq("settlement_id", s.id);

      return { ...s, items: items || [] };
    })
  );

  return NextResponse.json(settlementsWithItems);
}
