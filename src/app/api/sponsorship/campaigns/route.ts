import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: 캠페인 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const platform = searchParams.get("platform");
  const adType = searchParams.get("ad_type");
  const search = searchParams.get("search");
  const userId = searchParams.get("user_id");
  const status = searchParams.get("status") || "open";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const supabase = getSupabase();
  let query = supabase
    .from("ad_campaigns")
    .select("*", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.eq("target_category", category);
  if (platform) query = query.eq("target_platform", platform);
  if (adType) query = query.eq("target_ad_type", adType);
  if (userId) query = query.eq("user_id", userId);
  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 유저 정보 조인
  const userIds = [...new Set((data || []).map((p: { user_id: string }) => p.user_id))];
  const { data: users } = userIds.length > 0
    ? await supabase.from("users").select("id, nickname, profile_image").in("id", userIds)
    : { data: [] };
  const userMap = new Map((users || []).map((u: { id: string }) => [u.id, u]));

  const result = (data || []).map((p: { user_id: string }) => ({ ...p, users: userMap.get(p.user_id) || null }));
  return NextResponse.json({ data: result, total: count });
}

// POST: 캠페인 작성
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, title, description, product_name, brand_name, budget_type, budget_amount, budget_min, budget_max, target_category, target_min_subscribers, target_platform, target_ad_type, deadline, content_deadline } = body;

  if (!user_id || !title) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 프리 플랜 3개 제한
  const { data: user } = await supabase.from("users").select("plan").eq("id", user_id).single();
  if (user?.plan === "free") {
    const { count } = await supabase
      .from("ad_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("status", "open");
    if ((count || 0) >= 3) {
      return NextResponse.json({ error: "프리 플랜은 캠페인 3개까지 등록 가능합니다" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("ad_campaigns")
    .insert({
      user_id, title, description, product_name, brand_name,
      budget_type: budget_type || "negotiable",
      budget_amount, budget_min, budget_max,
      target_category, target_min_subscribers, target_platform, target_ad_type,
      deadline, content_deadline,
      status: "open",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
