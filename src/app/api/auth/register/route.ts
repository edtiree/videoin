import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      phone,
      pin,
      name,
      role,
      contractType,
      bankName,
      bankAccount,
      accountHolder,
      businessRegistrationUrl,
    } = body;

    if (!phone || !pin || !name || !contractType) {
      return NextResponse.json(
        { error: "필수 정보를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN은 4자리 숫자여야 합니다." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 중복 확인
    const { data: existing } = await supabase
      .from("workers")
      .select("id")
      .eq("phone", phone)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 등록된 휴대폰 번호입니다." },
        { status: 409 }
      );
    }

    // PIN 해시
    const hashedPin = await bcrypt.hash(pin, 10);

    const { data, error } = await supabase
      .from("workers")
      .insert({
        phone,
        pin: hashedPin,
        name,
        role: role || "촬영비",
        contract_type: contractType,
        bank_name: bankName || null,
        bank_account: bankAccount || null,
        account_holder: accountHolder || null,
        business_registration_url: businessRegistrationUrl || null,
        approved: false,
        allowed_services: ["settlement", "calendar", "review"],
      })
      .select()
      .single();

    if (error) {
      console.error("가입 오류:", error);
      return NextResponse.json(
        { error: "가입 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      worker: {
        id: data.id,
        name: data.name,
        role: data.role,
        contractType: data.contract_type,
        approved: data.approved,
      },
    });
  } catch (error) {
    console.error("가입 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
