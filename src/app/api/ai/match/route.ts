import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const { user_id, type } = await request.json();

  if (!user_id || !type) {
    return NextResponse.json({ error: "user_id와 type 필요" }, { status: 400 });
  }

  const supabase = getSupabase();

  // 유저 정보 가져오기
  const { data: user } = await supabase.from("users").select("*").eq("id", user_id).single();
  if (!user) return NextResponse.json({ error: "유저를 찾을 수 없습니다" }, { status: 404 });

  try {
    if (type === "editor") {
      // 크리에이터에게 편집자 추천
      const { data: editors } = await supabase
        .from("editor_profiles")
        .select("id, display_name, categories, experience_years, hourly_rate, rating_avg, bio, available")
        .eq("available", true)
        .order("rating_avg", { ascending: false })
        .limit(20);

      if (!editors || editors.length === 0) {
        return NextResponse.json({ recommendations: [] });
      }

      const client = new Anthropic();
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `사용자 역할: ${user.role?.join(", ") || "미설정"}
사용자 지역: ${user.region || "미설정"}

아래 편집자 목록에서 이 사용자에게 가장 추천할 만한 편집자 3명을 골라주세요.
JSON 배열로 응답해주세요. 형식: [{"id": "...", "reason": "추천 이유 한 줄"}]

편집자 목록:
${editors.map(e => `- ID: ${e.id}, 이름: ${e.display_name}, 분야: ${e.categories?.join("/")}, 경력: ${e.experience_years}년, 평점: ${e.rating_avg}`).join("\n")}`,
        }],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      const match = text.match(/\[[\s\S]*\]/);
      const recommendations = match ? JSON.parse(match[0]) : [];

      return NextResponse.json({ recommendations });
    } else {
      // 편집자에게 공고 추천
      const { data: editorProfile } = await supabase
        .from("editor_profiles")
        .select("*")
        .eq("user_id", user_id)
        .single();

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, category, budget_type, budget_min, budget_max, region, is_remote, deadline_type")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!jobs || jobs.length === 0) {
        return NextResponse.json({ recommendations: [] });
      }

      const client = new Anthropic();
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `편집자 프로필:
- 분야: ${editorProfile?.categories?.join(", ") || "미설정"}
- 경력: ${editorProfile?.experience_years || "미설정"}년
- 희망 단가: ${editorProfile?.hourly_rate || "미설정"}원
- 지역: ${user.region || "미설정"}

아래 공고 목록에서 이 편집자에게 가장 추천할 만한 공고 3개를 골라주세요.
JSON 배열로 응답해주세요. 형식: [{"id": "...", "reason": "추천 이유 한 줄"}]

공고 목록:
${jobs.map(j => `- ID: ${j.id}, 제목: ${j.title}, 분야: ${j.category}, 예산: ${j.budget_min || "협의"}~${j.budget_max || "협의"}, 재택: ${j.is_remote ? "O" : "X"}`).join("\n")}`,
        }],
      });

      const text = message.content[0].type === "text" ? message.content[0].text : "";
      const match = text.match(/\[[\s\S]*\]/);
      const recommendations = match ? JSON.parse(match[0]) : [];

      return NextResponse.json({ recommendations });
    }
  } catch (err) {
    console.error("AI 매칭 오류:", err);
    return NextResponse.json({ recommendations: [] });
  }
}
