import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 스레드 내 메시지 목록
export async function GET(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 읽음 처리
  if (userId) {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("thread_id", threadId)
      .eq("receiver_id", userId)
      .eq("is_read", false);
  }

  return NextResponse.json(data);
}
