import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { workerId, allowedServices } = await request.json();
  if (!workerId || !Array.isArray(allowedServices)) {
    return NextResponse.json({ error: "필수값 누락" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("workers")
    .update({ allowed_services: allowedServices })
    .eq("id", workerId);

  if (error) return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}
