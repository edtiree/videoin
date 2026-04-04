import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET: 리뷰 목록
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("target_user_id");

  if (!targetUserId) return NextResponse.json({ error: "target_user_id 필요" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("job_reviews")
    .select("*, users!job_reviews_reviewer_id_fkey(nickname, profile_image)")
    .eq("target_user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST: 리뷰 작성
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { reviewer_id, target_user_id, job_id, rating, content } = body;

  if (!reviewer_id || !target_user_id || !rating) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "평점은 1~5 사이여야 합니다" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("job_reviews")
    .insert({ reviewer_id, target_user_id, job_id, rating, content })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 평균 평점 갱신
  const { data: reviews } = await supabase
    .from("job_reviews")
    .select("rating")
    .eq("target_user_id", target_user_id);

  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await supabase
      .from("editor_profiles")
      .update({ rating_avg: Math.round(avg * 10) / 10, review_count: reviews.length })
      .eq("user_id", target_user_id);
  }

  return NextResponse.json(data, { status: 201 });
}
