"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  job_id: string | null;
  is_read: boolean;
  created_at: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function ChatPage() {
  const { threadId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [otherName, setOtherName] = useState(searchParams.get("name") || "");

  const fetchMessages = useCallback(async () => {
    if (!profile) return;
    const res = await fetch(`/api/messages/${threadId}?user_id=${profile.id}`);
    const data = await res.json();
    setMessages(data);
    // 상대 닉네임 가져오기
    if (data.length > 0 && !otherName) {
      const otherId = data[0].sender_id === profile.id ? data[0].receiver_id : data[0].sender_id;
      fetch(`/api/community/user/${otherId}`)
        .then(r => r.json())
        .then(u => { if (u.nickname) setOtherName(u.nickname); })
        .catch(() => {});
    }
  }, [threadId, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, 100);
  }, [messages]);

  // iOS 키보드 감지
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending || !profile) return;
    setSending(true);

    const lastMsg = messages[messages.length - 1];
    const receiverId = lastMsg
      ? (lastMsg.sender_id === profile.id ? lastMsg.receiver_id : lastMsg.sender_id)
      : null;

    if (!receiverId) { setSending(false); return; }

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_id: profile.id,
        receiver_id: receiverId,
        content: input.trim(),
      }),
    });

    if (res.ok) {
      setInput("");
      fetchMessages();
    }
    setSending(false);
  };

  if (!profile) return null;

  return (
    <div className="h-[100dvh] flex flex-col bg-white">
      {/* 헤더 - 고정 */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-white">
        <div className="pt-[env(safe-area-inset-top,0px)]" />
        <div className="flex items-center px-5 h-[52px] border-b border-toss-gray-100">
          <button onClick={() => router.push("/messages")} className="w-9 h-9 flex items-center justify-center text-toss-gray-700 -ml-2 mr-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2 className="text-[18px] font-extrabold text-toss-gray-900">{otherName}</h2>
        </div>
      </div>
      {/* 헤더 스페이서 */}
      <div className="flex-shrink-0 h-[calc(52px+env(safe-area-inset-top,0px))]" />

      {/* 메시지 영역 - 스크롤 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === profile.id;
          const next = messages[idx + 1];
          const isLast = !next || next.sender_id !== msg.sender_id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[75%]">
                <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                  isMine
                    ? "bg-toss-blue text-white rounded-br-md"
                    : "bg-toss-gray-50 border border-toss-gray-100 text-toss-gray-900 rounded-bl-md"
                }`}>
                  {msg.content}
                </div>
                {isLast && (
                <p className={`text-[10px] text-toss-gray-300 mt-1 mb-2 ${isMine ? "text-right" : "text-left"}`}>
                  {formatTime(msg.created_at)}
                  {isMine && msg.is_read && " · 읽음"}
                </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 입력창 - 하단 고정 */}
      <div className="flex-shrink-0 bg-white border-t border-toss-gray-100">
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
            placeholder="메시지를 입력하세요"
            className="flex-1 h-[36px] bg-toss-gray-50 rounded-full px-4 text-[14px] border-none focus:outline-none placeholder:text-toss-gray-300"
          />
          {input.trim() && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-shrink-0 text-toss-blue font-semibold text-[14px] disabled:opacity-50"
            >
              전송
            </button>
          )}
        </div>
        {!keyboardOpen && <div className="pb-[env(safe-area-inset-bottom,4px)]" />}
      </div>
    </div>
  );
}
