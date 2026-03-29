import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { settlementId, status } = await request.json();

  if (!settlementId || !status) {
    return NextResponse.json({ error: "필수 정보 누락" }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from("settlements")
    .update({ status })
    .eq("id", settlementId);

  if (error) {
    return NextResponse.json({ error: "상태 변경 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
