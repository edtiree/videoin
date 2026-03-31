import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });
  }
  return NextResponse.json({ key });
}
