import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // "2026-03" 형식

  const supabase = getSupabase();

  // 전체 정산서 조회
  let query = supabase
    .from("settlements")
    .select("*")
    .order("created_at", { ascending: false });

  // 월 필터
  if (month) {
    const startDate = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    query = query.gte("settlement_month", startDate).lt("settlement_month", nextMonth);
  }

  const { data: settlements, error } = await query;

  if (error) {
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }

  // 직원 목록 조회
  const { data: workers } = await supabase
    .from("workers")
    .select("id, name, role, contract_type, approved")
    .eq("approved", true);

  // 직원별 정산 합계 계산
  const workerStats: Record<string, {
    name: string;
    role: string;
    contractType: string;
    totalAmount: number;
    totalExpense: number;
    totalTax: number;
    totalFinal: number;
    count: number;
  }> = {};

  for (const w of (workers || [])) {
    workerStats[w.id] = {
      name: w.name,
      role: w.role,
      contractType: w.contract_type,
      totalAmount: 0,
      totalExpense: 0,
      totalTax: 0,
      totalFinal: 0,
      count: 0,
    };
  }

  let grandTotalAmount = 0;
  let grandTotalExpense = 0;
  let grandTotalTax = 0;
  let grandTotalFinal = 0;
  let totalCount = 0;

  const statusCounts: Record<string, number> = { "제출됨": 0, "정산완료": 0 };

  for (const s of (settlements || []).filter((s) => s.status !== "임시저장")) {
    grandTotalAmount += s.total_amount;
    grandTotalExpense += s.total_expense;
    grandTotalTax += s.tax;
    grandTotalFinal += s.final_amount;
    totalCount++;

    if (statusCounts[s.status] !== undefined) statusCounts[s.status]++;

    if (workerStats[s.worker_id]) {
      workerStats[s.worker_id].totalAmount += s.total_amount;
      workerStats[s.worker_id].totalExpense += s.total_expense;
      workerStats[s.worker_id].totalTax += s.tax;
      workerStats[s.worker_id].totalFinal += s.final_amount;
      workerStats[s.worker_id].count++;
    }
  }

  // 최근 정산서 목록 (임시저장 제외, 최신 10건)
  const recentSettlements = (settlements || []).filter((s) => s.status !== "임시저장").slice(0, 10).map((s) => ({
    id: s.id,
    workerName: s.worker_name,
    role: s.role,
    contractType: s.contract_type,
    settlementMonth: s.settlement_month,
    totalAmount: s.total_amount,
    finalAmount: s.final_amount,
    status: s.status,
    createdAt: s.created_at,
  }));

  // 직원별 순위 (지출 높은 순)
  const workerRanking = Object.values(workerStats)
    .filter((w) => w.count > 0)
    .sort((a, b) => b.totalFinal - a.totalFinal);

  return NextResponse.json({
    summary: {
      totalAmount: grandTotalAmount,
      totalExpense: grandTotalExpense,
      totalTax: grandTotalTax,
      totalFinal: grandTotalFinal,
      totalCount,
      statusCounts,
    },
    workerRanking,
    recentSettlements,
  });
}
