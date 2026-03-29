import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { SettlementSubmission } from "@/types";

export async function POST(request: Request) {
  try {
    const data: SettlementSubmission & { draftId?: string | null } =
      await request.json();

    if (!data.workerId || !data.settlementMonth || !data.items?.length) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 임시저장 → 제출 전환
    if (data.draftId) {
      const { error: updateError } = await supabase
        .from("settlements")
        .update({
          worker_name: data.workerName,
          role: data.role,
          contract_type: data.contractType,
          settlement_month: data.settlementMonth,
          total_amount: data.totalAmount,
          total_expense: data.totalExpense,
          tax: data.tax,
          final_amount: data.finalAmount,
          status: "제출됨",
        })
        .eq("id", data.draftId);

      if (updateError) {
        console.error("정산서 업데이트 오류:", updateError);
        return NextResponse.json(
          { error: "정산서 업데이트 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }

      // 기존 항목 교체
      await supabase
        .from("settlement_items")
        .delete()
        .eq("settlement_id", data.draftId);

      const lineItems = data.items.map((item) => ({
        settlement_id: data.draftId,
        ...item,
      }));

      const { error: itemsError } = await supabase
        .from("settlement_items")
        .insert(lineItems);

      if (itemsError) {
        console.error("항목 저장 오류:", itemsError);
        return NextResponse.json(
          { error: "상세 항목 저장 중 오류가 발생했습니다." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        id: data.draftId,
        message: "정산서가 성공적으로 제출되었습니다.",
      });
    }

    // 새 정산서 저장
    const { data: settlement, error: settlementError } = await supabase
      .from("settlements")
      .insert({
        worker_id: data.workerId,
        worker_name: data.workerName,
        role: data.role,
        contract_type: data.contractType,
        settlement_month: data.settlementMonth,
        total_amount: data.totalAmount,
        total_expense: data.totalExpense,
        tax: data.tax,
        final_amount: data.finalAmount,
        status: "제출됨",
      })
      .select()
      .single();

    if (settlementError) {
      console.error("정산서 저장 오류:", settlementError);
      return NextResponse.json(
        { error: "정산서 저장 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    // 상세 항목 저장
    const lineItems = data.items.map((item) => ({
      settlement_id: settlement.id,
      ...item,
    }));

    const { error: itemsError } = await supabase
      .from("settlement_items")
      .insert(lineItems);

    if (itemsError) {
      console.error("항목 저장 오류:", itemsError);
      return NextResponse.json(
        { error: "상세 항목 저장 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: settlement.id,
      message: "정산서가 성공적으로 제출되었습니다.",
    });
  } catch (error) {
    console.error("정산서 제출 오류:", error);
    return NextResponse.json(
      { error: "정산서 제출 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
