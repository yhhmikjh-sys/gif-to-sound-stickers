import { useEffect, useState } from "react";
import { WA_APPS, openWhatsAppApp, phoneOs } from "@/lib/send-to-whatsapp";

// Phone only: open WhatsApp or WhatsApp Business directly (Android picks the app by package name).
export function WhatsAppAppButtons({ title, link, small }: { title: string; link: string; small?: boolean }) {
  const [os, setOs] = useState<"android" | "ios" | null>(null);
  useEffect(() => setOs(phoneOs()), []);
  if (!os) return null;
  const apps = os === "android" ? WA_APPS : WA_APPS.slice(0, 1); // iOS has one shared whatsapp:// link
  return (
    <>
      {apps.map((a) => (
        <button key={a.pkg} type="button" onClick={() => openWhatsAppApp(a.pkg, title, link)}
          className={small ? "mt-1 block w-full rounded-full border-2 border-foreground bg-card py-1 text-xs font-semibold text-foreground" : "rounded-full border-2 border-foreground bg-card px-4 py-2 text-sm font-semibold text-foreground"}>
          💬 {a.label}
        </button>
      ))}
    </>
  );
}
