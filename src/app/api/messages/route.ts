import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 스레드 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) return NextResponse.json({ error: "user_id 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("message_threads")
    .select("*")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 각 스레드의 상대방 정보 로드
  const threads = await Promise.all((data || []).map(async (thread) => {
    const otherId = thread.participant_a === userId ? thread.participant_b : thread.participant_a;
    const { data: otherUser } = await supabase.from("users").select("id, nickname, profile_image").eq("id", otherId).single();

    // 안읽은 메시지 수
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", thread.id)
      .eq("receiver_id", userId)
      .eq("is_read", false);

    return { ...thread, other_user: otherUser, unread_count: count || 0 };
  }));

  return NextResponse.json(threads);
}

// POST: 새 메시지 보내기
export async function POST(request: NextRequest) {
  const { sender_id, receiver_id, content, job_id } = await request.json();

  if (!sender_id || !receiver_id || !content?.trim()) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 스레드 찾기 또는 생성
  const [a, b] = [sender_id, receiver_id].sort();
  let { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("participant_a", a)
    .eq("participant_b", b)
    .single();

  if (!thread) {
    const { data: newThread, error: threadErr } = await supabase
      .from("message_threads")
      .insert({ participant_a: a, participant_b: b, last_message_preview: content.trim().slice(0, 100) })
      .select()
      .single();
    if (threadErr || !newThread) return NextResponse.json({ error: threadErr?.message || "스레드 생성 실패" }, { status: 500 });
    thread = newThread;
  }

  // 메시지 저장
  const { data: message, error: msgErr } = await supabase
    .from("messages")
    .insert({
      thread_id: thread!.id,
      sender_id,
      receiver_id,
      content: content.trim(),
      job_id: job_id || null,
    })
    .select()
    .single();

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  // 스레드 업데이트
  await supabase.from("message_threads").update({
    last_message_at: new Date().toISOString(),
    last_message_preview: content.trim().slice(0, 100),
  }).eq("id", thread!.id);

  return NextResponse.json({ message, thread_id: thread!.id }, { status: 201 });
}
