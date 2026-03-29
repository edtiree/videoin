import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const supabase = getSupabase();
  const fileName = `${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("receipts")
    .upload(fileName, file, { contentType: file.type });

  if (error) {
    console.error("업로드 오류:", error);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("receipts")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: urlData.publicUrl });
}
