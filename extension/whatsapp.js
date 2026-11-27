// Runs on WhatsApp Web: a floating panel with saved stickers. Clicking one drops it into the open chat;
// WhatsApp then shows its normal preview where you press Send.
(() => {
  const btn = document.createElement("button");
  btn.textContent = "🔊 StikDesi";
  Object.assign(btn.style, { position: "fixed", right: "20px", bottom: "90px", zIndex: 99999, padding: "10px 16px", borderRadius: "999px", border: "2px solid #111", background: "#25D366", color: "#fff", fontWeight: "700", cursor: "pointer", boxShadow: "3px 3px 0 #111" });
  const panel = document.createElement("div");
  Object.assign(panel.style, { position: "fixed", right: "20px", bottom: "140px", zIndex: 99999, width: "320px", maxHeight: "60vh", overflow: "auto", background: "#fff", color: "#111", border: "2px solid #111", borderRadius: "16px", padding: "10px", display: "none", fontFamily: "sans-serif", boxShadow: "4px 4px 0 #111" });
  document.body.append(btn, panel);

  const toast = (t) => { const p = panel.querySelector("[data-msg]"); if (p) p.textContent = t; };

  // After the paste, WhatsApp opens its preview; press its Send button for the user.
  function autoSend() {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const icon = [...document.querySelectorAll('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')].find((el) => !el.closest("footer"));
      const btn = icon?.closest('div[role="button"], button') || document.querySelector('div[role="button"][aria-label="Send"]:not(footer *)');
      if (btn) { clearInterval(iv); btn.click(); }
      else if (Date.now() - t0 > 15000) clearInterval(iv);
    }, 300);
  }

  async function toFile(s) {
    if (s.dataUrl) {
      const [head, b64] = s.dataUrl.split(",");
      const mime = head.slice(5, head.indexOf(";"));
      return new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], `${s.title}.${mime.includes("webm") ? "webm" : "mp4"}`, { type: mime });
    }
    const b = await (await fetch(s.url)).blob();
    return new File([b], `${s.title}.${(s.mime || b.type).includes("webm") ? "webm" : "mp4"}`, { type: s.mime || b.type || "video/mp4" });
  }

  async function dropIntoChat(s) {
    const box = document.querySelector('footer div[contenteditable="true"]');
    if (!box) { toast("Pehle koi chat kholo, phir sticker chuno."); return; }
    toast("Bhej raha hoon…");
    let file;
    try { file = await toFile(s); } catch { toast("Sticker load nahi hua, dobara try karo."); return; }
    const dt = new DataTransfer();
    dt.items.add(file);
    box.focus();
    box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    panel.style.display = "none";
    autoSend();
  }

  async function render() {
    let mine = [], signedIn = true;
    try { mine = await sbMyStickers(); } catch (e) { signedIn = false; }
    chrome.storage.local.get({ stickers: [] }, ({ stickers: local }) => {
      const stickers = [...mine, ...local];
      panel.innerHTML = '<b>Sound stickers</b><p data-msg style="font-size:12px;color:#555;margin:4px 0 8px">Chat kholo → sticker par click → apne aap send ho jaayega</p>';
      if (!signedIn) panel.insertAdjacentHTML("beforeend", '<p style="font-size:12px;color:#b00">Apne account ke stickers ke liye extension icon dabake Sign in karo.</p>');
      if (!stickers.length) panel.insertAdjacentHTML("beforeend", '<p style="font-size:13px">Abhi koi sticker nahi. StikDesi website par sign in karke sticker banao.</p>');
      const grid = document.createElement("div");
      Object.assign(grid.style, { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" });
      for (const s of stickers) {
        const card = document.createElement("div");
        Object.assign(card.style, { border: "1px solid #ddd", borderRadius: "10px", overflow: "hidden", position: "relative" });
        const v = document.createElement("video");
        Object.assign(v, { src: s.dataUrl || s.url, muted: true, loop: true, autoplay: true, playsInline: true });
        Object.assign(v.style, { width: "100%", aspectRatio: "1", objectFit: "contain", cursor: "pointer", display: "block", background: "#fff" });
        v.title = s.title;
        v.onclick = () => dropIntoChat(s);
        const del = document.createElement("button");
        del.textContent = "✕";
        Object.assign(del.style, { position: "absolute", top: "4px", right: "4px", border: "none", borderRadius: "999px", background: "#0008", color: "#fff", cursor: "pointer" });
        del.onclick = () => chrome.storage.local.set({ stickers: local.filter((x) => x.id !== s.id) }, render);
        if (!s.dataUrl) del.style.display = "none";
        const t = document.createElement("div");
        t.textContent = s.title;
        Object.assign(t.style, { fontSize: "11px", padding: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
        card.append(v, del, t);
        grid.append(card);
      }
      panel.append(grid);
    });
  }

  btn.onclick = () => { const open = panel.style.display === "none"; panel.style.display = open ? "block" : "none"; if (open) render(); };
  chrome.storage.onChanged.addListener(() => { if (panel.style.display !== "none") void render(); });
})();
