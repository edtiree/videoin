"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getSupabaseAuthBrowser } from "@/lib/supabase-auth-browser";
import type { User, Session } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  auth_id: string;
  role: string[];
  plan: string;
  nickname: string | null;
  region: string | null;
  profile_image: string | null;
  worker_id: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  showLoginModal: boolean;
  showRoleModal: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  closeRoleModal: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  isLoggedIn: false,
  isLoading: true,
  showLoginModal: false,
  showRoleModal: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  closeRoleModal: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// 플랜에 따른 서비스 접근 권한 매핑
function getServicesFromPlan(plan: string): string[] {
  switch (plan) {
    case "enterprise":
      return ["settlement", "calendar", "review", "instagram-card", "youtube-title", "youtube-shorts", "screen-material", "ads"];
    case "team":
      return ["settlement", "calendar", "review", "instagram-card", "youtube-title", "youtube-shorts", "screen-material"];
    case "creator":
      return ["review", "instagram-card", "youtube-title", "youtube-shorts", "screen-material"];
    case "free":
    default:
      return [];
  }
}

// Supabase Auth 유저를 기존 localStorage("worker") 형식으로 브릿지
function bridgeToLocalStorage(user: User, profile: UserProfile) {
  const workerCompat = {
    id: profile.worker_id || profile.id,
    name: profile.nickname || user.user_metadata?.name || user.user_metadata?.full_name || "사용자",
    phone: user.phone || "",
    role: profile.role?.[0] || "",
    contractType: "프리랜서",
    approved: true,
    isAdmin: false,
    allowedServices: getServicesFromPlan(profile.plan),
    // 새 필드 (기존 코드에서 무시됨, 새 코드에서 활용)
    plan: profile.plan,
    nickname: profile.nickname,
    userRoles: profile.role,
    profileImage: profile.profile_image,
    authId: profile.auth_id,
    userId: profile.id,
  };
  localStorage.setItem("worker", JSON.stringify(workerCompat));
  window.dispatchEvent(new Event("worker-login"));
}

function clearBridge() {
  localStorage.removeItem("worker");
  window.dispatchEvent(new Event("worker-logout"));
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const supabase = getSupabaseAuthBrowser();

  const fetchProfile = useCallback(async (authUser: User): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authUser.id)
      .single();

    if (error && error.code === "PGRST116") {
      // 유저 프로필이 없으면 생성
      const newProfile = {
        auth_id: authUser.id,
        nickname: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
        profile_image: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        role: [],
        plan: "free",
        region: null,
        worker_id: null,
      };

      const { data: created, error: createError } = await supabase
        .from("users")
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error("유저 프로필 생성 실패:", createError);
        return null;
      }
      return created;
    }

    if (error) {
      console.error("유저 프로필 조회 실패:", error);
      return null;
    }

    return data;
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user);
    if (p) {
      setProfile(p);
      bridgeToLocalStorage(user, p);
    }
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    clearBridge();
  }, [supabase]);

  const openLoginModal = useCallback(() => setShowLoginModal(true), []);
  const closeLoginModal = useCallback(() => setShowLoginModal(false), []);
  const closeRoleModal = useCallback(() => setShowRoleModal(false), []);

  // 초기 세션 확인 + Auth 상태 변경 구독
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (currentSession?.user) {
        setUser(currentSession.user);
        setSession(currentSession);
        const p = await fetchProfile(currentSession.user);
        if (p) {
          setProfile(p);
          bridgeToLocalStorage(currentSession.user, p);
          // 첫 로그인이면 역할 선택 모달 표시
          if (p.role.length === 0) {
            setShowRoleModal(true);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === "SIGNED_IN" && newSession?.user) {
          setUser(newSession.user);
          setSession(newSession);
          const p = await fetchProfile(newSession.user);
          if (p) {
            setProfile(p);
            bridgeToLocalStorage(newSession.user, p);
            setShowLoginModal(false);
            if (p.role.length === 0) {
              setShowRoleModal(true);
            }
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setSession(null);
          clearBridge();
        } else if (event === "TOKEN_REFRESHED" && newSession) {
          setSession(newSession);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoggedIn: !!user && !!profile,
        isLoading,
        showLoginModal,
        showRoleModal,
        openLoginModal,
        closeLoginModal,
        closeRoleModal,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
