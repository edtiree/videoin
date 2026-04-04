"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseAuthBrowser } from "@/lib/supabase-auth-browser";
import TopNav from "@/components/TopNav";

const ROLE_OPTIONS = [
  { id: "크리에이터/사장", label: "크리에이터 / 사장", desc: "영상 제작을 의뢰하거나 팀을 운영" },
  { id: "편집자/스태프", label: "편집자 / 스태프", desc: "영상 편집, 촬영, 썸네일 등 작업" },
  { id: "배우/출연자", label: "배우 / 출연자", desc: "영상 출연이나 연기" },
];

const REGIONS = [
  "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주", "해외",
];

export default function ProfileEditPage() {
  const router = useRouter();
  const { isLoggedIn, profile, refreshProfile, openLoginModal } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState("");
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [region, setRegion] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!isLoggedIn) { openLoginModal(); return; }
    if (profile) {
      setNickname(profile.nickname || "");
      setRoles(new Set(profile.role || []));
      setRegion(profile.region || "");
      setPreviewImage(profile.profile_image || null);
    }
  }, [isLoggedIn, profile, openLoginModal]);

  const toggleRole = (id: string) => {
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!nickname.trim()) {
      setToast("닉네임을 입력해주세요");
      setTimeout(() => setToast(""), 2500);
      return;
    }

    setSaving(true);
    const supabase = getSupabaseAuthBrowser();

    let profileImageUrl = profile.profile_image;

    // 이미지 업로드 (R2 or Supabase Storage)
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const fileName = `profile_${profile.id}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageFile, { upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
        profileImageUrl = urlData.publicUrl;
      }
    }

    // 유저 프로필 업데이트
    const { error } = await supabase
      .from("users")
      .update({
        nickname: nickname.trim(),
        role: Array.from(roles),
        region: region || null,
        profile_image: profileImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      setToast("저장에 실패했습니다");
      setTimeout(() => setToast(""), 2500);
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    router.back();
  };

  if (!isLoggedIn || !profile) return <div className="min-h-full bg-gray-50" />;

  return (
    <>
      <TopNav title="프로필 편집" backHref="/profile" rightContent={
        <button onClick={handleSave} disabled={saving} className="text-[14px] font-semibold text-toss-blue disabled:opacity-50">
          {saving ? "저장 중" : "저장"}
        </button>
      } />

      <div className="max-w-[800px] mx-auto px-4 py-5 pb-20">
        {/* 프로필 이미지 */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            {previewImage ? (
              <img src={previewImage} alt="프로필" className="w-24 h-24 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-24 h-24 bg-toss-gray-200 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-toss-gray-400">{nickname?.[0] || "?"}</span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-toss-gray-900 rounded-full flex items-center justify-center border-2 border-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="text-[13px] text-toss-blue mt-2 font-medium">
            사진 변경
          </button>
        </div>

        <div className="space-y-6">
          {/* 닉네임 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-1.5 block">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
              className="w-full h-[48px] rounded-xl border border-toss-gray-200 px-4 text-[15px] focus:outline-none focus:border-toss-blue"
            />
            <p className="text-[11px] text-toss-gray-300 mt-1 text-right">{nickname.length}/20</p>
          </div>

          {/* 역할 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">역할 (복수 선택 가능)</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((role) => {
                const isSelected = roles.has(role.id);
                return (
                  <button
                    key={role.id}
                    onClick={() => toggleRole(role.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition text-left ${
                      isSelected ? "border-toss-blue bg-blue-50" : "border-toss-gray-100 hover:border-toss-gray-200"
                    }`}
                  >
                    <div>
                      <p className={`text-[14px] font-semibold ${isSelected ? "text-toss-blue" : "text-toss-gray-900"}`}>
                        {role.label}
                      </p>
                      <p className="text-[12px] text-toss-gray-400 mt-0.5">{role.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "border-toss-blue bg-toss-blue" : "border-toss-gray-200"
                    }`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 지역 */}
          <div>
            <label className="text-[13px] font-medium text-toss-gray-500 mb-2 block">활동 지역</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRegion("")}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition ${
                  !region ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                }`}
              >
                전체
              </button>
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition ${
                    region === r ? "bg-toss-blue text-white" : "bg-white border border-toss-gray-100 text-toss-gray-500"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 저장 버튼 (모바일) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-toss-gray-100 md:hidden pb-[env(safe-area-inset-bottom,16px)]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-[52px] rounded-xl bg-toss-blue text-white font-semibold text-[15px] disabled:opacity-50 transition"
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-toss-gray-900 text-white text-[14px] px-6 py-3 rounded-xl shadow-lg animate-slide-up z-[9999]">
          {toast}
        </div>
      )}
    </>
  );
}
