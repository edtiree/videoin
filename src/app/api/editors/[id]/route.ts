import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 편집자 프로필 상세
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: profile, error } = await supabase
    .from("editor_profiles")
    .select("*, users!editor_profiles_user_id_fkey(nickname, profile_image)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });

  // 포트폴리오 영상 로드
  const { data: videos } = await supabase
    .from("portfolio_videos")
    .select("*")
    .eq("editor_profile_id", id)
    .order("sort_order");

  // 리뷰 로드
  const { data: reviews } = await supabase
    .from("job_reviews")
    .select("*, users!job_reviews_reviewer_id_fkey(nickname, profile_image)")
    .eq("target_user_id", profile.user_id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ ...profile, portfolio_videos: videos || [], reviews: reviews || [] });
}
