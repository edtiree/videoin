import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { settlementId, issued } = await request.json();
  const supabase = getSupabase();
  const { error } = await supabase
    .from("settlements")
    .update({ tax_invoice_issued: issued })
    .eq("id", settlementId);
  if (error) return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}
