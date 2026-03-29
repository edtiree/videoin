import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await getSupabase()
    .from("workers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "직원 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    role: data.role,
    contractType: data.contract_type,
    categories: data.categories || ["촬영PD", "편집자"],
  });
}
