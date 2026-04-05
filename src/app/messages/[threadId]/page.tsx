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
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h < 12 ? "오전" : "오후"} ${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m}`;
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
  const [source, setSource] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!profile) return;
    const res = await fetch(`/api/messages/${threadId}?user_id=${profile.id}`);
    const data = await res.json();
    setMessages(data);
    if (data.length > 0) {
      const oid = data[0].sender_id === profile.id ? data[0].receiver_id : data[0].sender_id;
      setOtherId(oid);
      if (!otherName) {
        fetch(`/api/community/user/${oid}`)
          .then(r => r.json())
          .then(u => { if (u.nickname) setOtherName(u.nickname); })
          .catch(() => {});
      }
    }
  }, [threadId, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // 스레드 source 가져오기
  useEffect(() => {
    if (!profile) return;
    fetch(`/api/messages?user_id=${profile.id}`)
      .then(r => r.json())
      .then((threads: { id: string; source: string | null; source_id: string | null; source_title: string | null }[]) => {
        const t = threads.find(t => t.id === threadId);
        if (t?.source) { setSource(t.source); setSourceId(t.source_id); setSourceTitle(t.source_title); }
      })
      .catch(() => {});
  }, [threadId, profile]);

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

    let raf: number;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        // top은 항상 0 고정, height만 조정
        el.style.height = `${vv.height}px`;
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    };

    // iOS에서 키보드가 페이지를 밀어올리는 걸 방지
    const preventScroll = () => {
      window.scrollTo(0, 0);
    };

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", preventScroll);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", preventScroll);
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
        <div style={{ flexShrink: 0, background: "#fff", zIndex: 10, willChange: "transform" }}>
          <div style={{ height: "env(safe-area-inset-top, 0px)" }} />
          <div className="flex items-center px-5 border-b border-toss-gray-100" style={{ height: 52 }}>
            <button onClick={() => router.push("/messages")} className="w-9 h-9 flex items-center justify-center text-toss-gray-700 -ml-2 mr-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h2 className="text-[18px] font-extrabold text-toss-gray-900 flex-1">{otherName}</h2>
            {otherId && (
              <button
                onClick={() => router.push(`/community/user/${otherId}`)}
                className="w-9 h-9 flex items-center justify-center text-toss-gray-400"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* 출처 컨텍스트 바 */}
        {source && (
          <div style={{ flexShrink: 0 }}>
            <button
              onClick={() => {
                if (source === "community" && otherId) router.push(`/community/user/${otherId}`);
                else if (source === "job" && sourceId) router.push(`/jobs/${sourceId}`);
                else if (source === "job") router.push("/jobs");
                else if (source === "sponsorship" && sourceId) router.push(`/sponsorship/campaigns/${sourceId}`);
                else if (source === "sponsorship") router.push("/sponsorship");
              }}
              className="w-full flex items-center gap-2 px-5 py-2 border-b border-toss-gray-100 bg-toss-gray-50 active:bg-toss-gray-100 transition"
            >
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
                source === "community" ? "text-toss-blue bg-blue-50" :
                source === "job" ? "text-green-600 bg-green-50" :
                "text-toss-orange bg-orange-50"
              }`}>
                {source === "community" ? "커뮤니티" : source === "job" ? "구인구직" : "광고매칭"}
              </span>
              <span className="text-[13px] text-toss-gray-600 flex-1 truncate">
                {sourceTitle || (source === "community" ? "프로필에서 시작된 대화" : source === "job" ? "공고에서 시작된 대화" : "광고매칭에서 시작된 대화")}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-toss-gray-300 flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}

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
              <div key={msg.id} className={`flex items-end gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                {/* 내 메시지: 시간이 왼쪽 */}
                {isMine && isLast && (
                  <span className="text-[10px] text-toss-gray-300 mb-1 flex-shrink-0">
                    {msg.is_read && "읽음 "}{formatTime(msg.created_at)}
                  </span>
                )}
                <div className="max-w-[70%]">
                  <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                    isMine
                      ? "bg-toss-blue text-white rounded-br-md"
                      : "bg-toss-gray-50 border border-toss-gray-100 text-toss-gray-900 rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                </div>
                {/* 상대 메시지: 시간이 오른쪽 */}
                {!isMine && isLast && (
                  <span className="text-[10px] text-toss-gray-300 mb-1 flex-shrink-0">
                    {formatTime(msg.created_at)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* 입력창 - 커뮤니티 댓글 입력창과 동일 */}
        <div style={{ flexShrink: 0 }} className="bg-white border-t border-toss-gray-100">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <button className="flex-shrink-0 p-1 text-toss-gray-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
              placeholder="메시지를 입력해주세요.."
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
          <div className="pb-[env(safe-area-inset-bottom,4px)]" />
        </div>
      </div>
    </>
  );
}
