import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { workerId, contractType, bankName, bankAccount, accountHolder } = await request.json();

    if (!workerId) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const supabase = getSupabase();

    const updates: Record<string, string | null> = {};
    if (contractType) updates.contract_type = contractType;
    if (bankName !== undefined) updates.bank_name = bankName || null;
    if (bankAccount !== undefined) updates.bank_account = bankAccount || null;
    if (accountHolder !== undefined) updates.account_holder = accountHolder || null;

    const { error } = await supabase
      .from("workers")
      .update(updates)
      .eq("id", workerId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "정보 수정에 실패했습니다." }, { status: 500 });
  }
}
