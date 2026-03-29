import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { settlementId, workerId } = await request.json();

    if (!settlementId || !workerId) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 본인의 제출됨 상태 정산서만 취소 가능
    const { data: settlement } = await supabase
      .from("settlements")
      .select("id, status, worker_id")
      .eq("id", settlementId)
      .eq("worker_id", workerId)
      .eq("status", "제출됨")
      .maybeSingle();

    if (!settlement) {
      return NextResponse.json(
        { error: "취소할 수 없는 정산서입니다." },
        { status: 400 }
      );
    }

    // 항목 삭제 → 정산서 삭제
    await supabase
      .from("settlement_items")
      .delete()
      .eq("settlement_id", settlementId);

    const { error } = await supabase
      .from("settlements")
      .delete()
      .eq("id", settlementId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("정산서 취소 오류:", error);
    return NextResponse.json(
      { error: "정산서 취소 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
