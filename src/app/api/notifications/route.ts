import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get("workerId");
  const adminSent = searchParams.get("adminSent");
  if (!workerId) return NextResponse.json({ error: "workerId 필요" }, { status: 400 });

  const supabase = getSupabase();

  // 관리자가 보낸 알림 전체 조회
  if (adminSent === "true") {
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("created_by", workerId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
    const items = (notifications || []).map((n: Record<string, unknown>) => ({
      id: n.id, type: n.type, title: n.title, message: n.message,
      link: n.link, deadlineDate: n.deadline_date, createdAt: n.created_at,
      targetWorkerId: n.target_worker_id,
    }));
    return NextResponse.json({ notifications: items });
  }

  // 이 워커에게 해당하는 알림 (targeted + broadcast)
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .or(`target_worker_id.eq.${workerId},target_worker_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });

  // 이 워커의 읽음 기록
  const { data: reads } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("worker_id", workerId);

  const readSet = new Set((reads || []).map((r: { notification_id: string }) => r.notification_id));

  const items = (notifications || []).map((n: Record<string, unknown>) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    deadlineDate: n.deadline_date,
    createdAt: n.created_at,
    isRead: readSet.has(n.id as string),
  }));

  const unreadCount = items.filter((n: { isRead: boolean }) => !n.isRead).length;

  return NextResponse.json({ notifications: items, unreadCount });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { type, title, message, link, deadlineDate, targetWorkerIds, createdBy, adId } = body;

  if (!type || !title || !message || !createdBy) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 관리자 확인
  const { data: admin } = await supabase
    .from("workers")
    .select("is_admin")
    .eq("id", createdBy)
    .single();

  if (!admin?.is_admin) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  // 대상별 알림 생성
  if (targetWorkerIds && targetWorkerIds.length > 0) {
    const rows = targetWorkerIds.map((wid: string) => ({
      type, title, message, link: link || null,
      deadline_date: deadlineDate || null,
      target_worker_id: wid, created_by: createdBy,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  } else {
    // 전체 브로드캐스트
    const { error } = await supabase.from("notifications").insert({
      type, title, message, link: link || null,
      deadline_date: deadlineDate || null,
      target_worker_id: null, created_by: createdBy,
    });
    if (error) return NextResponse.json({ error: "생성 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const notificationId = searchParams.get("id");
  const adminId = searchParams.get("adminId");
  if (!notificationId || !adminId) return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });

  const supabase = getSupabase();

  // 관리자 확인
  const { data: admin } = await supabase.from("workers").select("is_admin").eq("id", adminId).single();
  if (!admin?.is_admin) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  // 읽음 기록 삭제
  await supabase.from("notification_reads").delete().eq("notification_id", notificationId);
  // 알림 삭제
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
  if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });

  return NextResponse.json({ success: true });
}
