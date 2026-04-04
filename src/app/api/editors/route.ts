import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 편집자 프로필 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const available = searchParams.get("available");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const supabase = getSupabase();
  let query = supabase
    .from("editor_profiles")
    .select("*, users!editor_profiles_user_id_fkey(nickname, profile_image)", { count: "exact" })
    .order("rating_avg", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.contains("categories", [category]);
  if (available === "true") query = query.eq("available", true);
  if (search) query = query.ilike("display_name", `%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count });
}
