import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get("workerId");
  if (!workerId) return NextResponse.json({ unreadCount: 0 });

  const supabase = getSupabase();

  const { count: totalCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .or(`target_worker_id.eq.${workerId},target_worker_id.is.null`);

  const { count: readCount } = await supabase
    .from("notification_reads")
    .select("id", { count: "exact", head: true })
    .eq("worker_id", workerId);

  return NextResponse.json({ unreadCount: Math.max(0, (totalCount || 0) - (readCount || 0)) });
}
