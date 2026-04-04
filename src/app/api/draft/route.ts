import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const supabase = getSupabase();

    // 관리자 차단
    const { data: worker } = await supabase.from("workers").select("is_admin").eq("id", data.workerId).single();
    if (worker?.is_admin) {
      return NextResponse.json({ error: "관리자 계정은 정산서를 작성할 수 없습니다." }, { status: 403 });
    }

    if (data.draftId) {
      // 기존 임시저장 업데이트
      const { error: updateError } = await supabase
        .from("settlements")
        .update({
          settlement_month: data.settlementMonth,
          total_amount: data.totalAmount,
          total_expense: data.totalExpense || 0,
          tax: data.tax,
          final_amount: data.finalAmount,
        })
        .eq("id", data.draftId);

      if (updateError) throw updateError;

      // 기존 항목 삭제 후 새로 저장
      await supabase
        .from("settlement_items")
        .delete()
        .eq("settlement_id", data.draftId);

      if (data.items?.length) {
        const lineItems = data.items.map(
          (item: Record<string, unknown>) => {
            const { quantity, videoMinutes, videoSeconds, notificationId, ...rest } = item;
            return { settlement_id: data.draftId, ...rest };
          }
        );
        await supabase.from("settlement_items").insert(lineItems);
      }

      return NextResponse.json({ id: data.draftId });
    }

    // 새 임시저장 생성
    const { data: settlement, error } = await supabase
      .from("settlements")
      .insert({
        worker_id: data.workerId,
        worker_name: data.workerName,
        role: data.role,
        contract_type: data.contractType,
        settlement_month: data.settlementMonth,
        total_amount: data.totalAmount,
        total_expense: data.totalExpense || 0,
        tax: data.tax,
        final_amount: data.finalAmount,
        status: "임시저장",
      })
      .select()
      .single();

    if (error) throw error;

    if (data.items?.length) {
      const lineItems = data.items.map(
        (item: Record<string, unknown>) => {
          const { quantity, videoMinutes, videoSeconds, notificationId, ...rest } = item;
          return { settlement_id: settlement.id, ...rest };
        }
      );
      await supabase.from("settlement_items").insert(lineItems);
    }

    return NextResponse.json({ id: settlement.id });
  } catch (error) {
    console.error("임시저장 오류:", error);
    return NextResponse.json(
      { error: "임시저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
