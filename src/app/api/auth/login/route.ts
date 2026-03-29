import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json(
        { error: "휴대폰 번호와 PIN을 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("workers")
      .select("*")
      .eq("phone", phone)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "등록되지 않은 휴대폰 번호입니다." },
        { status: 404 }
      );
    }

    const pinMatch = await bcrypt.compare(pin, data.pin);
    if (!pinMatch) {
      return NextResponse.json(
        { error: "PIN이 일치하지 않습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      worker: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        role: data.role,
        contractType: data.contract_type,
        bankName: data.bank_name,
        bankAccount: data.bank_account,
        accountHolder: data.account_holder,
        approved: data.approved,
      },
    });
  } catch (error) {
    console.error("로그인 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
