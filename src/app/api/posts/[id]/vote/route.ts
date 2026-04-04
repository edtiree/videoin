import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user_id, option_index } = await request.json();

  if (!user_id || option_index === undefined) {
    return NextResponse.json({ error: "user_id, option_index 필요" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: post, error } = await supabase.from("posts").select("poll_data").eq("id", id).single();

  if (error || !post?.poll_data) {
    return NextResponse.json({ error: "투표를 찾을 수 없습니다" }, { status: 404 });
  }

  const pollData = post.poll_data as {
    options: { label: string; votes: number }[];
    voters: Record<string, number>;
  };

  // 이미 투표했는지 확인
  const previousVote = pollData.voters[user_id];
  if (previousVote !== undefined) {
    // 같은 옵션 → 투표 취소
    if (previousVote === option_index) {
      pollData.options[previousVote].votes = Math.max(0, pollData.options[previousVote].votes - 1);
      delete pollData.voters[user_id];
    } else {
      // 다른 옵션 → 변경
      pollData.options[previousVote].votes = Math.max(0, pollData.options[previousVote].votes - 1);
      pollData.options[option_index].votes += 1;
      pollData.voters[user_id] = option_index;
    }
  } else {
    // 새 투표
    pollData.options[option_index].votes += 1;
    pollData.voters[user_id] = option_index;
  }

  await supabase.from("posts").update({ poll_data: pollData }).eq("id", id);

  return NextResponse.json({ poll_data: pollData });
}
