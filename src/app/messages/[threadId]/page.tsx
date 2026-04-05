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
  const containerRef = useRef<HTMLDivElement>(null);
  const [otherName, setOtherName] = useState(searchParams.get("name") || "");

  const fetchMessages = useCallback(async () => {
    if (!profile) return;
    const res = await fetch(`/api/messages/${threadId}?user_id=${profile.id}`);
    const data = await res.json();
    setMessages(data);
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

  // iOS visualViewport 기반 레이아웃 조정
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !containerRef.current) return;

    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      // visualViewport의 offsetTop은 키보드가 올라와서 화면이 밀린 양
      el.style.top = `${vv.offsetTop}px`;
      el.style.height = `${vv.height}px`;
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 30);
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
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
    <>
      <style jsx global>{`
        .chat-active .overflow-y-auto { overflow: hidden !important; }
        .chat-active .pb-14 { padding-bottom: 0 !important; }
        .chat-active > nav { display: none !important; }
      `}</style>
      <div
        ref={containerRef}
        className="chat-active"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          height: "100%",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div style={{ flexShrink: 0, background: "#fff", zIndex: 10 }}>
          <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
          <div className="flex items-center px-5 border-b border-toss-gray-100" style={{ height: 52 }}>
            <button onClick={() => router.push("/messages")} className="w-9 h-9 flex items-center justify-center text-toss-gray-700 -ml-2 mr-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h2 className="text-[18px] font-extrabold text-toss-gray-900">{otherName}</h2>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div
          ref={scrollRef}
          className="px-4 py-4 space-y-1"
          style={{ flex: 1, overflowY: "scroll", WebkitOverflowScrolling: "touch", minHeight: 0 }}
        >
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

        {/* 입력창 */}
        <div style={{ flexShrink: 0, background: "#fff", borderTop: "1px solid #f2f4f6" }}>
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
        </div>
      </div>
    </>
  );
}
