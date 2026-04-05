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

// DELETE: 스레드 삭제 (메시지도 함께)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const supabase = getSupabase();

  await supabase.from("messages").delete().eq("thread_id", threadId);
  const { error } = await supabase.from("message_threads").delete().eq("id", threadId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
