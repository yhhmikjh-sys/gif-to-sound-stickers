chrome.storage.local.get({ stickers: [] }, ({ stickers }) => {
  document.getElementById("count").textContent = stickers.length ? `${stickers.length} sticker extension mein save hain.` : "Abhi koi sticker save nahi hai.";
});
document.getElementById("wa").onclick = () => chrome.tabs.create({ url: "https://web.whatsapp.com/" });
