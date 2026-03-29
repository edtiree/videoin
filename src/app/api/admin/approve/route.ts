import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { workerId, approved } = await request.json();

  const { error } = await getSupabase()
    .from("workers")
    .update({ approved })
    .eq("id", workerId);

  if (error) {
    return NextResponse.json({ error: "업데이트 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
