import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .order("filming_date", { ascending: false });

  if (error) return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabase();

  if (body.id) {
    // 기존 데이터 가져오기 (변경 감지용)
    const { data: oldAd } = await supabase.from("ads").select("*").eq("id", body.id).single();

    // Update
    const { id, created_at, ...updates } = body;
    void created_at;
    const { error } = await supabase.from("ads").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });

    // 변경 감지: 촬영일정, 업로드일정, 출연자명
    if (oldAd) {
      // undefined인 필드는 변경 안 된 것이므로 oldAd 값 사용
      const newPerformer = updates.performer ?? oldAd.performer;
      const newFilmingDate = updates.filming_date ?? oldAd.filming_date;
      const newUploadDate = updates.upload_date ?? oldAd.upload_date;

      const changes: string[] = [];
      if (oldAd.performer !== newPerformer) changes.push(`출연자: ${oldAd.performer} → ${newPerformer}`);
      if (oldAd.filming_date !== newFilmingDate) changes.push(`촬영일정: ${oldAd.filming_date || "미정"} → ${newFilmingDate || "미정"}`);
      if (oldAd.upload_date?.split(" ")[0] !== newUploadDate?.split(" ")[0]) changes.push(`업로드일정: ${oldAd.upload_date || "미정"} → ${newUploadDate || "미정"}`);

      if (changes.length > 0) {
        // 연결된 알림의 deadline_date 업데이트 (출연자명 기반 매칭)
        if (oldAd.upload_date !== newUploadDate) {
          const oldUpload = oldAd.upload_date?.split(" ")[0];
          if (oldUpload) {
            await supabase.from("notifications")
              .update({ deadline_date: newUploadDate?.split(" ")[0] || null })
              .like("title", `%${oldAd.performer}%`)
              .eq("deadline_date", oldUpload)
              .in("type", ["filming", "editing"]);
          }
        }

        // 출연자명 변경 시 관련 알림 제목도 업데이트
        if (oldAd.performer !== newPerformer) {
          const { data: relatedNotifs } = await supabase.from("notifications")
            .select("id, title")
            .like("title", `%${oldAd.performer}%`)
            .in("type", ["filming", "editing"]);
          if (relatedNotifs?.length) {
            for (const n of relatedNotifs) {
              await supabase.from("notifications")
                .update({ title: (n.title as string).replace(oldAd.performer, newPerformer) })
                .eq("id", n.id);
            }
          }
        }

        // 변경 알림 전송 (전체 브로드캐스트)
        await supabase.from("notifications").insert({
          type: "announcement",
          title: `일정 변경: ${newPerformer}`,
          message: changes.join(" / "),
          link: null,
          deadline_date: null,
          target_worker_id: null,
          created_by: null,
        });
      }
    }

    return NextResponse.json({ success: true });
  }

  // Insert
  const { data, error } = await supabase.from("ads").insert(body).select().single();
  if (error) return NextResponse.json({ error: "추가 실패" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const supabase = getSupabase();

  // 삭제 전 광고 정보 가져오기
  const { data: ad } = await supabase.from("ads").select("performer, upload_date").eq("id", id).single();

  const { error } = await supabase.from("ads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });

  // 연결된 알림 삭제 + 삭제 알림 전송
  if (ad?.performer) {
    // 해당 출연자의 작업 요청 알림 삭제
    await supabase.from("notifications")
      .delete()
      .like("title", `%${ad.performer}%`)
      .in("type", ["filming", "editing"]);

    // 삭제 알림 전송
    await supabase.from("notifications").insert({
      type: "announcement",
      title: `촬영 취소: ${ad.performer}`,
      message: `${ad.performer} 촬영 건이 삭제되었습니다.`,
      link: null,
      deadline_date: null,
      target_worker_id: null,
      created_by: null,
    });
  }

  return NextResponse.json({ success: true });
}
