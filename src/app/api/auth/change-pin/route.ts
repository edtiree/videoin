import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { workerId, currentPin, newPin } = await request.json();

    if (!workerId || !currentPin || !newPin) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json({ error: "새 PIN은 4자리 숫자여야 합니다." }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: worker } = await supabase
      .from("workers")
      .select("id, pin")
      .eq("id", workerId)
      .single();

    if (!worker) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    const match = await bcrypt.compare(currentPin, worker.pin);
    if (!match) {
      return NextResponse.json({ error: "현재 PIN이 일치하지 않습니다." }, { status: 401 });
    }

    const hashedPin = await bcrypt.hash(newPin, 10);
    await supabase.from("workers").update({ pin: hashedPin }).eq("id", workerId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
