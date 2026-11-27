import { useEffect, useState } from "react";
import { WA_APPS, phoneOs, prepareShare, sendToWhatsApp } from "@/lib/send-to-whatsapp";

// Phone only: sends the sticker FILE (never a link). A web page cannot hand a file to one specific package,
// so this opens the phone's share sheet with the file; the user taps WhatsApp or WhatsApp Business there.
export function WhatsAppAppButtons({ url, title, small }: { url: string; title: string; small?: boolean }) {
  const [os, setOs] = useState<"android" | "ios" | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => setOs(phoneOs()), []);
  if (!os) return null;
  const apps = os === "android" ? WA_APPS : WA_APPS.slice(0, 1);
  return (
    <>
      {apps.map((a) => (
        <button key={a.pkg} type="button"
          onPointerDown={() => void prepareShare(url, title).catch(() => {})}
          onClick={() => { setErr(""); sendToWhatsApp(url, title).catch((e: Error) => e.name !== "AbortError" && setErr(e.message)); }}
          className={small ? "mt-1 block w-full rounded-full border-2 border-foreground bg-card py-1 text-xs font-semibold text-foreground" : "rounded-full border-2 border-foreground bg-card px-4 py-2 text-sm font-semibold text-foreground"}>
          💬 {a.label}
        </button>
      ))}
      {err && <span className="block text-xs text-destructive">{err}</span>}
    </>
  );
}
