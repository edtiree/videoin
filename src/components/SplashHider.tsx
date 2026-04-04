"use client";

import { useEffect } from "react";

export default function SplashHider() {
  useEffect(() => {
    // 재방문이면 스플래시 표시 안 함
    try {
      if (sessionStorage.getItem("sp")) return;
      sessionStorage.setItem("sp", "1");
    } catch {
      return;
    }

    // 첫 방문: 스플래시를 JS로 생성
    const sp = document.createElement("div");
    sp.id = "sp";
    Object.assign(sp.style, {
      position: "fixed",
      top: "0", left: "0", right: "0", bottom: "0",
      zIndex: "9999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#3182f6",
    });
    sp.innerHTML = `<div style="text-align:center">
      <h1 style="color:white;font-size:36px;font-weight:800;letter-spacing:-0.02em;margin:0">에디트리</h1>
      <p style="color:rgba(255,255,255,0.6);font-size:14px;font-weight:500;margin-top:8px">영상 제작팀</p>
    </div>`;
    document.body.prepend(sp);

    // dismissSplash 호출 또는 4초 후 페이드아웃
    const start = Date.now();
    let done = false;

    function dismiss() {
      if (done) return;
      done = true;
      const wait = Math.max(0, 800 - (Date.now() - start));
      setTimeout(() => {
        sp.style.transition = "opacity 0.5s";
        sp.style.opacity = "0";
        setTimeout(() => { sp.remove(); }, 550);
      }, wait);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).dismissSplash = dismiss;
    const fallback = setTimeout(dismiss, 4000);
    return () => clearTimeout(fallback);
  }, []);

  return null;
}
