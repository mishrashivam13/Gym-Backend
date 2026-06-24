/* Centrum Gym Chatbot Widget — embed with:
   <script src="http://localhost:3000/chatbot-widget.js"></script>
*/
(function () {
  "use strict";

  const API = "http://localhost:5000/api/chat";
  const ACCENT = "#f59e0b";
  const DARK   = "#18181b";
  const DARKER = "#09090b";

  /* ── Inject CSS ── */
  const style = document.createElement("style");
  style.textContent = `
    #cg-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #cg-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 99999;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${ACCENT}; border: none; cursor: pointer;
      box-shadow: 0 4px 20px rgba(245,158,11,.5);
      display: flex; align-items: center; justify-content: center;
      transition: transform .2s, box-shadow .2s;
    }
    #cg-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(245,158,11,.6); }
    #cg-fab svg { width: 26px; height: 26px; }
    #cg-badge {
      position: absolute; top: -4px; right: -4px;
      background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
      width: 18px; height: 18px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff;
    }
    #cg-box {
      position: fixed; bottom: 92px; right: 24px; z-index: 99998;
      width: 360px; max-height: 540px;
      background: ${DARK}; border: 1px solid #3f3f46; border-radius: 20px;
      display: none; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,.6);
      overflow: hidden; animation: cgSlideUp .2s ease;
    }
    #cg-box.open { display: flex; }
    @keyframes cgSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    #cg-header {
      background: ${DARKER}; padding: 14px 16px;
      display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid #3f3f46;
    }
    #cg-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(245,158,11,.15); border: 1.5px solid rgba(245,158,11,.3);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    #cg-header-info p { margin: 0; }
    #cg-header-info .name { color: #fff; font-weight: 700; font-size: 14px; }
    #cg-header-info .sub  { color: #71717a; font-size: 11px; display: flex; align-items: center; gap: 5px; }
    #cg-header-info .dot  { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; display: inline-block; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
    #cg-close {
      margin-left: auto; background: none; border: none; cursor: pointer;
      color: #52525b; font-size: 20px; line-height: 1; padding: 2px 4px;
    }
    #cg-close:hover { color: #fff; }
    #cg-msgs {
      flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
      max-height: 360px;
    }
    #cg-msgs::-webkit-scrollbar { width: 4px; }
    #cg-msgs::-webkit-scrollbar-track { background: transparent; }
    #cg-msgs::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
    .cg-msg { display: flex; gap: 8px; animation: cgFadeIn .15s ease; }
    .cg-msg.user { flex-direction: row-reverse; }
    @keyframes cgFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; } }
    .cg-bubble {
      max-width: 80%; padding: 10px 14px; border-radius: 16px;
      font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
    }
    .cg-msg.bot  .cg-bubble { background: #27272a; color: #e4e4e7; border-top-left-radius: 4px; }
    .cg-msg.user .cg-bubble { background: #2563eb; color: #fff; border-top-right-radius: 4px; }
    .cg-av {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 13px;
    }
    .cg-msg.bot  .cg-av { background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.2); }
    .cg-msg.user .cg-av { background: rgba(37,99,235,.2); border: 1px solid rgba(37,99,235,.3); }
    #cg-typing { display: none; gap: 8px; }
    #cg-typing .cg-dots { display: flex; gap: 4px; padding: 10px 14px; }
    .cg-dot { width: 7px; height: 7px; border-radius: 50%; background: #52525b; animation: cgDot 1.2s infinite; }
    .cg-dot:nth-child(2) { animation-delay: .2s; }
    .cg-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes cgDot { 0%,80%,100% { transform: scale(1); } 40% { transform: scale(1.3); background: ${ACCENT}; } }
    #cg-lead-ok {
      background: rgba(34,197,94,.08); border-top: 1px solid rgba(34,197,94,.2);
      color: #4ade80; font-size: 12px; font-weight: 600;
      padding: 8px 14px; display: none; align-items: center; gap: 6px;
    }
    #cg-footer { padding: 10px 12px; border-top: 1px solid #3f3f46; display: flex; gap: 8px; }
    #cg-input {
      flex: 1; background: #27272a; border: 1px solid #3f3f46; border-radius: 12px;
      padding: 9px 14px; color: #e4e4e7; font-size: 13px; outline: none;
      transition: border-color .2s;
    }
    #cg-input:focus { border-color: ${ACCENT}; }
    #cg-input::placeholder { color: #52525b; }
    #cg-send {
      width: 38px; height: 38px; border-radius: 12px; background: ${ACCENT};
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background .2s; align-self: flex-end;
    }
    #cg-send:hover { background: #fbbf24; }
    #cg-send:disabled { opacity: .4; cursor: not-allowed; }
    @media (max-width: 400px) { #cg-box { width: calc(100vw - 20px); right: 10px; bottom: 80px; } }
  `;
  document.head.appendChild(style);

  /* ── Build DOM ── */
  const wrap = document.createElement("div");
  wrap.id = "cg-widget";
  wrap.innerHTML = `
    <!-- FAB -->
    <button id="cg-fab" aria-label="Open Centrum Gym Chat">
      <div id="cg-badge">1</div>
      <svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>

    <!-- Chat box -->
    <div id="cg-box" role="dialog" aria-label="Centrum Gym Chat">
      <div id="cg-header">
        <div id="cg-avatar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${ACCENT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M3 12c0-2 1.5-6 3.5-6S9 4 12 4s3.5 2 5.5 2 3.5 4 3.5 6-1.5 6-3.5 6S15 20 12 20s-3.5-2-5.5-2S3 14 3 12z"/>
          </svg>
        </div>
        <div id="cg-header-info">
          <p class="name">Shivam — Centrum Gym</p>
          <p class="sub"><span class="dot"></span> Online · Gym Counselor</p>
        </div>
        <button id="cg-close" aria-label="Close">&#x2715;</button>
      </div>

      <div id="cg-msgs"></div>

      <div id="cg-typing" class="cg-msg bot">
        <div class="cg-av">🏋️</div>
        <div class="cg-dots">
          <div class="cg-dot"></div><div class="cg-dot"></div><div class="cg-dot"></div>
        </div>
      </div>

      <div id="cg-lead-ok">✅ Enquiry save ho gayi! Team jald contact karega.</div>

      <div id="cg-footer">
        <input id="cg-input" type="text" placeholder="Apna sawaal likhen…" autocomplete="off" />
        <button id="cg-send" aria-label="Send" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  /* ── State ── */
  const history = [];
  let open = false;
  let loading = false;

  const fab    = document.getElementById("cg-fab");
  const box    = document.getElementById("cg-box");
  const msgs   = document.getElementById("cg-msgs");
  const input  = document.getElementById("cg-input");
  const sendBtn= document.getElementById("cg-send");
  const badge  = document.getElementById("cg-badge");
  const typing = document.getElementById("cg-typing");
  const leadOk = document.getElementById("cg-lead-ok");

  /* ── Welcome message ── */
  addMsg("bot", "Hello! � I'm Shivam, your gym counselor at Centrum Gym, Jaipur.\n\nI can help you with membership plans, timings, facilities, or any gym-related questions. What would you like to know?");

  /* ── Toggle ── */
  fab.addEventListener("click", () => {
    open = !open;
    box.classList.toggle("open", open);
    badge.style.display = open ? "none" : "flex";
    if (open) input.focus();
  });
  document.getElementById("cg-close").addEventListener("click", () => {
    open = false; box.classList.remove("open");
  });

  /* ── Input ── */
  input.addEventListener("input", () => {
    sendBtn.disabled = !input.value.trim() || loading;
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !sendBtn.disabled) { e.preventDefault(); sendMsg(); }
  });
  sendBtn.addEventListener("click", sendMsg);

  /* ── Send ── */
  async function sendMsg() {
    const text = input.value.trim();
    if (!text || loading) return;
    input.value = ""; sendBtn.disabled = true;
    addMsg("user", text);
    history.push({ role: "user", content: text });
    setLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-10) }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, kuch error hua. Baad mein try karein.";
      addMsg("bot", reply);
      history.push({ role: "assistant", content: reply });
      if (data.leadCaptured) {
        leadOk.style.display = "flex";
      }
    } catch {
      addMsg("bot", "Server se connect nahi ho pa raha. Please call karein: +91 78780 58724");
    } finally {
      setLoading(false);
    }
  }

  function addMsg(role, text) {
    const row = document.createElement("div");
    row.className = "cg-msg " + role;
    row.innerHTML = `
      <div class="cg-av">${role === "bot" ? "🏋️" : "👤"}</div>
      <div class="cg-bubble">${escHtml(text)}</div>
    `;
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function setLoading(v) {
    loading = v;
    typing.style.display = v ? "flex" : "none";
    sendBtn.disabled = v || !input.value.trim();
    if (!v) msgs.scrollTop = msgs.scrollHeight;
  }

  function escHtml(s) {
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
  }
})();
