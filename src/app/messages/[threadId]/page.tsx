"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import TopNav from "@/components/TopNav";

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
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!profile) return;
    const res = await fetch(`/api/messages/${threadId}?user_id=${profile.id}`);
    const data = await res.json();
    setMessages(data);
  }, [threadId, profile]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // 5초 폴링
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !profile) return;
    setSending(true);

    // 수신자 찾기 (마지막 메시지에서)
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
      <TopNav title="쪽지" backHref="/messages" />

      <div className="flex flex-col h-[calc(100dvh-52px-56px)] md:h-[calc(100dvh-52px)] max-w-[800px] mx-auto">
        {/* 메시지 영역 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender_id === profile.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] ${isMine ? "order-2" : ""}`}>
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
          })}
        </div>

        {/* 입력창 */}
        <div className="border-t border-toss-gray-100 bg-white px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
              placeholder="메시지를 입력하세요"
              className="flex-1 h-[44px] rounded-xl border border-toss-gray-200 px-4 text-[14px] focus:outline-none focus:border-toss-blue"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-[44px] h-[44px] rounded-xl bg-toss-blue text-white flex items-center justify-center disabled:opacity-50 transition flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
