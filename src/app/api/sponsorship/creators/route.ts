import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: 크리에이터 광고 프로필 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const platform = searchParams.get("platform");
  const search = searchParams.get("search");
  const userId = searchParams.get("user_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const sort = searchParams.get("sort"); // "subscribers", "price_low", "recent"

  const supabase = getSupabase();
  let query = supabase
    .from("creator_ad_profiles")
    .select("*", { count: "exact" })
    .eq("available", true);

  if (category) query = query.eq("content_category", category);
  if (userId) query = query.eq("user_id", userId);
  if (search) query = query.ilike("bio", `%${search}%`);

  // 플랫폼 필터: JSONB 배열에서 platform 키 검색
  if (platform) {
    query = query.contains("platforms", [{ platform }]);
  }

  if (sort === "price_low") {
    query = query.order("price_per_content", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range((page - 1) * limit, page * limit - 1);

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

// POST: 크리에이터 광고 프로필 등록/수정 (upsert)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, platforms, content_category, ad_types, pricing_type, price_per_content, price_min, price_max, bio, past_brands, portfolio_urls } = body;

  if (!user_id || !content_category) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("creator_ad_profiles")
    .upsert({
      user_id,
      platforms: platforms || [],
      content_category,
      ad_types: ad_types || [],
      pricing_type: pricing_type || "negotiable",
      price_per_content,
      price_min,
      price_max,
      bio,
      past_brands: past_brands || [],
      portfolio_urls: portfolio_urls || [],
      available: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
