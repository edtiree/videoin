"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

interface Thread {
  id: string;
  last_message_preview: string | null;
  last_message_at: string;
  other_user: { id: string; nickname: string | null; profile_image: string | null } | null;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "방금";
  if (d < 60) return `${d}분 전`;
  const h = Math.floor(d / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, profile, openLoginModal } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // PC 전용: 선택된 스레드 + 메시지
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn) { openLoginModal(); return; }
    const toUserId = searchParams.get("to");
    const jobId = searchParams.get("job");

    if (toUserId && profile) {
      // 기존 스레드 찾기
      fetch(`/api/messages?user_id=${profile.id}`)
        .then((r) => r.json())
        .then(async (data: Thread[]) => {
          const existing = data.find((t) => t.other_user?.id === toUserId);
          if (existing) {
            router.replace(`/messages/${existing.id}?name=${encodeURIComponent(existing.other_user?.nickname || "")}`);
          } else {
            // 새 스레드 생성 (빈 인사 메시지)
            const res = await fetch("/api/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sender_id: profile.id,
                receiver_id: toUserId,
                content: "안녕하세요! 커뮤니티에서 프로필 보고 연락드려요 😊",
                ...(jobId ? { job_id: jobId } : {}),
              }),
            });
            const result = await res.json();
            if (result.thread_id) {
              router.replace(`/messages/${result.thread_id}?name=${encodeURIComponent(result.other_nickname || "")}`);
            }
          }
        });
    }
  }, [isLoggedIn, profile, searchParams, router, openLoginModal]);

  const fetchThreads = useCallback(async () => {
    if (!profile) return;
    const res = await fetch(`/api/messages?user_id=${profile.id}`);
    const data = await res.json();
    setThreads(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  // PC: 메시지 로드
  const fetchMessages = useCallback(async () => {
    if (!profile || !selectedThread) return;
    const res = await fetch(`/api/messages/${selectedThread}?user_id=${profile.id}`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  }, [profile, selectedThread]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedThread, fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!chatInput.trim() || sending || !profile || !selectedThread) return;
    setSending(true);

    const lastMsg = messages[messages.length - 1];
    const receiverId = lastMsg
      ? (lastMsg.sender_id === profile.id ? lastMsg.receiver_id : lastMsg.sender_id)
      : null;

    if (!receiverId) { setSending(false); return; }

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_id: profile.id, receiver_id: receiverId, content: chatInput.trim() }),
    });

    if (res.ok) {
      setChatInput("");
      fetchMessages();
      fetchThreads();
    }
    setSending(false);
  };

  const filteredThreads = filter === "unread" ? threads.filter((t) => t.unread_count > 0) : threads;
  const selectedThreadData = threads.find((t) => t.id === selectedThread);

  if (!isLoggedIn) return null;

  return (
    <>
      {/* MobileTopNav가 "채팅" 표시 */}

      <div className="max-w-[1200px] mx-auto md:px-6 md:py-6">
        <div className="md:flex md:h-[calc(100vh-160px)] md:border md:border-toss-gray-100 md:rounded-2xl md:overflow-hidden md:bg-white">

          {/* ====== 좌측: 채팅 목록 ====== */}
          <div className="md:w-[340px] md:border-r md:border-toss-gray-100 md:flex md:flex-col">
            {/* PC 헤더 */}
            <div className="hidden md:block px-5 py-4 border-b border-toss-gray-100">
              <h2 className="text-[18px] font-bold text-toss-gray-900">채팅</h2>
            </div>

            {/* 필터 탭 */}
            <div className="hidden md:flex gap-2 px-5 py-3 border-b border-toss-gray-50">
              {(["all", "unread"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition ${
                    filter === f ? "bg-toss-gray-900 text-white" : "bg-toss-gray-50 text-toss-gray-500"
                  }`}>
                  {f === "all" ? "전체" : "안 읽음"}
                </button>
              ))}
            </div>

            {/* 스레드 목록 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-20 px-5">
                  <p className="text-toss-gray-400 text-[15px]">주고받은 채팅이 없습니다</p>
                  <p className="text-toss-gray-300 text-[13px] mt-1">공고나 편집자 프로필에서 채팅을 시작해보세요</p>
                </div>
              ) : (
                <div className="divide-y divide-toss-gray-50">
                  {filteredThreads.map((thread) => (
                    <SwipeableThread
                      key={thread.id}
                      thread={thread}
                      isSelected={selectedThread === thread.id}
                      onOpen={() => {
                        if (window.innerWidth < 768) {
                          router.push(`/messages/${thread.id}?name=${encodeURIComponent(thread.other_user?.nickname || "")}`);
                        } else {
                          setSelectedThread(thread.id);
                          setMessages([]);
                        }
                      }}
                      onDelete={async () => {
                        await fetch(`/api/messages/${thread.id}`, { method: "DELETE" });
                        fetchThreads();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ====== 우측: 대화창 (PC 전용) ====== */}
          <div className="hidden md:flex md:flex-1 md:flex-col">
            {!selectedThread ? (
              /* 미선택 상태 */
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-toss-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-toss-gray-300" strokeLinecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-[16px] font-semibold text-toss-gray-900 mb-1">채팅을 선택해주세요</p>
                <p className="text-[13px] text-toss-gray-400">왼쪽 목록에서 대화를 선택하면<br />여기에 메시지가 표시됩니다</p>
              </div>
            ) : (
              <>
                {/* 대화 헤더 */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-toss-gray-100">
                  {selectedThreadData?.other_user?.profile_image ? (
                    <img src={selectedThreadData.other_user.profile_image} alt="" className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-toss-gray-100 flex items-center justify-center">
                      <span className="text-[14px] font-bold text-toss-gray-400">{selectedThreadData?.other_user?.nickname?.[0] || "?"}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-[15px] font-semibold text-toss-gray-900">{selectedThreadData?.other_user?.nickname || "알 수 없음"}</p>
                  </div>
                </div>

                {/* 메시지 영역 */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-toss-gray-50">
                  {messages.length === 0 ? (
                    <div className="flex justify-center py-10">
                      <div className="w-6 h-6 border-2 border-toss-gray-200 border-t-toss-blue rounded-full animate-spin" />
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === profile?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[60%]">
                            <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                              isMine
                                ? "bg-toss-blue text-white rounded-br-md"
                                : "bg-white border border-toss-gray-100 text-toss-gray-900 rounded-bl-md"
                            }`}>
                              {msg.content}
                            </div>
                            <p className={`text-[10px] text-toss-gray-300 mt-1 ${isMine ? "text-right" : "text-left"}`}>
                              {formatTime(msg.created_at)}
                              {isMine && msg.is_read && " · 읽음"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 입력창 */}
                <div className="border-t border-toss-gray-100 bg-white px-6 py-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
                      placeholder="메시지를 입력하세요. (Enter: 전송)"
                      className="flex-1 h-[44px] rounded-xl border border-toss-gray-200 px-4 text-[14px] focus:outline-none focus:border-toss-blue"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!chatInput.trim() || sending}
                      className="px-5 h-[44px] rounded-xl bg-toss-blue text-white text-[14px] font-semibold disabled:opacity-50 transition flex-shrink-0"
                    >
                      전송
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SwipeableThread({ thread, isSelected, onOpen, onDelete }: {
  thread: { id: string; last_message_preview: string | null; last_message_at: string; other_user: { id: string; nickname: string | null; profile_image: string | null } | null; unread_count: number };
  isSelected: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    // 가로 움직임이 세로보다 크면 스와이프
    if (!swiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      swiping.current = true;
    }
    if (swiping.current) {
      // 왼쪽 스와이프: 알림끄기 + 삭제 (최대 -140)
      // 오른쪽 스와이프: 고정 (최대 70)
      const clamped = Math.max(-140, Math.min(70, dx));
      setOffsetX(clamped);
    }
  };

  const onTouchEnd = () => {
    if (offsetX < -70) setOffsetX(-140); // 왼쪽 열림
    else if (offsetX > 35) setOffsetX(70); // 오른쪽 열림
    else setOffsetX(0); // 닫힘
    swiping.current = false;
  };

  const handleClick = () => {
    if (offsetX !== 0) { setOffsetX(0); return; }
    onOpen();
  };

  return (
    <div className="relative overflow-hidden">
      {/* 왼쪽 배경: 고정 (오른쪽 스와이프) */}
      <div className="absolute left-0 top-0 bottom-0 flex">
        <button
          onClick={() => { setOffsetX(0); alert("채팅방이 고정되었습니다"); }}
          className="w-[70px] bg-toss-blue flex flex-col items-center justify-center text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
          <span className="text-[10px] mt-0.5">고정</span>
        </button>
      </div>

      {/* 오른쪽 배경: 알림끄기 + 삭제 (왼쪽 스와이프) */}
      <div className="absolute right-0 top-0 bottom-0 flex">
        <button
          onClick={() => { setOffsetX(0); alert("알림이 꺼졌습니다"); }}
          className="w-[70px] bg-toss-gray-400 flex flex-col items-center justify-center text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          <span className="text-[10px] mt-0.5">알림끄기</span>
        </button>
        <button
          onClick={() => { if (confirm("채팅방을 삭제할까요?")) { setOffsetX(0); onDelete(); } }}
          className="w-[70px] bg-toss-red flex flex-col items-center justify-center text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          <span className="text-[10px] mt-0.5">삭제</span>
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <div
        className={`relative bg-white flex items-center gap-3 px-5 py-4 text-left ${isSelected ? "bg-blue-50" : ""}`}
        style={{ transform: `translateX(${offsetX}px)`, transition: swiping.current ? "none" : "transform 0.3s ease" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
      >
        {thread.other_user?.profile_image ? (
          <img src={thread.other_user.profile_image} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-toss-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-[16px] font-bold text-toss-gray-400">{thread.other_user?.nickname?.[0] || "?"}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-toss-gray-900">{thread.other_user?.nickname || "알 수 없음"}</span>
            <span className="text-[11px] text-toss-gray-300 flex-shrink-0">{timeAgo(thread.last_message_at)}</span>
          </div>
          <p className="text-[13px] text-toss-gray-400 truncate mt-0.5">{thread.last_message_preview || "..."}</p>
        </div>
        {thread.unread_count > 0 && (
          <span className="w-5 h-5 rounded-full bg-toss-red text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
            {thread.unread_count > 9 ? "9+" : thread.unread_count}
          </span>
        )}
      </div>
    </div>
  );
}
