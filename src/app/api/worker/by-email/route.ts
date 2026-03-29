import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "이메일이 필요합니다." },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabase()
    .from("workers")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "등록되지 않은 이메일입니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    contractType: data.contract_type,
  });
}
