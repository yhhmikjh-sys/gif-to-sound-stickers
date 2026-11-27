import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "StikDesi extension for WhatsApp Web" },
      { name: "description", content: "Install the StikDesi extension to send sound stickers from WhatsApp Web on your computer." },
      { property: "og:title", content: "StikDesi extension for WhatsApp Web" },
      { property: "og:description", content: "Install the StikDesi extension to send sound stickers from WhatsApp Web on your computer." },
    ],
  }),
  component: ExtensionPage,
});

function download() {
  fetch("/stikdesi-extension.zip")
    .then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.blob(); })
    .then((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "stikdesi-extension.zip"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 30_000); })
    .catch((e: Error) => alert(e.message));
}

const steps = [
  "Website par upar Sign in dabao aur account banao (Sign up).",
  "Neeche wala button dabake ZIP download karo aur unzip karo.",
  "Chrome mein chrome://extensions kholo (Edge mein edge://extensions), Developer mode on karo.",
  "Load unpacked dabao aur unzip kiya hua folder chuno. Puzzle 🧩 menu mein StikDesi Sender ko pin 📌 karo.",
  "Extension icon dabao aur wahi email-password se Sign in karo.",
  "Website par sticker banao — signed in ho to woh apne aap aapke account mein save hota hai.",
  "web.whatsapp.com kholo aur neeche daayein 🔊 StikDesi dabao. Viewer mein aapke banaye stickers aur Public mein sabke published stickers milenge.",
  "Chat kholo, kisi sticker par click karo — WhatsApp preview ke baad woh apne aap send ho jaata hai.",
];

function ExtensionPage() {
  return (
    <main className="min-h-screen pb-16">
      <TopNav />
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="mt-10 font-display text-5xl text-foreground">Computer se bhejo</h1>
        <p className="mt-3 text-muted-foreground">Yeh extension Chrome, Edge aur Brave par chalta hai. Phone par extension ki zaroorat nahi — wahan 📤 Share sticker dabao aur WhatsApp chuno.</p>
        <button type="button" onClick={download} className="mt-6 rounded-full border-2 border-foreground bg-primary px-6 py-3 font-bold text-primary-foreground shadow-pop">⬇ Download extension</button>
        <ol className="mt-8 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-2xl border-2 border-foreground bg-card p-4 text-foreground">
              <span className="font-display text-xl">{i + 1}</span><span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
