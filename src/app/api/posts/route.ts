import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const userId = searchParams.get("user_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const supabase = getSupabase();
  let query = supabase
    .from("posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category && category !== "전체") query = query.eq("category", category);
  if (userId) query = query.eq("user_id", userId);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 유저 정보 별도 조회
  const userIds = [...new Set((data || []).map((p: { user_id: string }) => p.user_id))];
  const { data: users } = userIds.length > 0
    ? await supabase.from("users").select("id, nickname, profile_image").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users || []).map((u: { id: string }) => [u.id, u]));

  const result = (data || []).map((p: { user_id: string }) => ({ ...p, users: userMap.get(p.user_id) || null }));
  return NextResponse.json({ data: result, total: count });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, category, title, content, image_urls } = body;

  if (!user_id || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id, category: category || "자유", title: title.trim(), content: content.trim(), image_urls: image_urls || [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
