import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function PUT(request: Request) {
  const { notificationId, workerId } = await request.json();
  if (!notificationId || !workerId) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from("notification_reads")
    .upsert(
      { notification_id: notificationId, worker_id: workerId },
      { onConflict: "notification_id,worker_id" }
    );

  if (error) return NextResponse.json({ error: "처리 실패" }, { status: 500 });
  return NextResponse.json({ success: true });
}
