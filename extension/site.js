// Runs on the StikDesi website: tells the page the extension is installed and saves stickers it sends.
document.documentElement.dataset.stikdesiExt = "1";
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.type !== "STIKDESI_ADD") return;
  const { title, dataUrl, id } = e.data;
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:video/")) return;
  chrome.storage.local.get({ stickers: [] }, ({ stickers }) => {
    stickers.unshift({ id: Date.now() + "-" + Math.random().toString(36).slice(2), title: String(title || "sticker").slice(0, 80), dataUrl });
    chrome.storage.local.set({ stickers: stickers.slice(0, 50) }, () => {
      window.postMessage({ type: "STIKDESI_ADDED", id, ok: !chrome.runtime.lastError }, "*");
    });
  });
});
