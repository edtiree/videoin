import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 공고 목록 (필터/검색)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const region = searchParams.get("region");
  const isRemote = searchParams.get("is_remote");
  const search = searchParams.get("search");
  const userId = searchParams.get("user_id");
  const status = searchParams.get("status") || "open";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const supabase = getSupabase();
  let query = supabase
    .from("jobs")
    .select("*, users!jobs_user_id_fkey(nickname, profile_image)", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.eq("category", category);
  if (region) query = query.eq("region", region);
  if (isRemote === "true") query = query.eq("is_remote", true);
  if (userId) query = query.eq("user_id", userId);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count });
}

// POST: 공고 작성
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, title, description, category, budget_type, budget_amount, budget_min, budget_max, region, is_remote, deadline, deadline_type } = body;

  if (!user_id || !title || !category) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 플랜 확인 (free는 3개 제한)
  const { data: user } = await supabase.from("users").select("plan").eq("id", user_id).single();
  if (user?.plan === "free") {
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("status", "open");
    if ((count || 0) >= 3) {
      return NextResponse.json({ error: "프리 플랜은 공고 3개까지 등록 가능합니다" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id, title, description, category,
      budget_type: budget_type || "negotiable",
      budget_amount, budget_min, budget_max,
      region, is_remote: is_remote ?? true,
      deadline, deadline_type: deadline_type || "always",
      status: "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
