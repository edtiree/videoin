import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { workerId } = await request.json();

  const { error } = await getSupabase()
    .from("workers")
    .delete()
    .eq("id", workerId);

  if (error) {
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
