import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { hasExtension, sendToExtension } from "@/lib/extension";

// Computer only: sends the sticker to the StikDesi Sender extension, or links to its install steps.
export function ExtensionButton({ url, title, small }: { url: string; title: string; small?: boolean }) {
  const [state, setState] = useState<"none" | "ready" | "sending" | "done" | "mobile">("none");
  const [err, setErr] = useState("");
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return setState("mobile");
    setState(hasExtension() ? "ready" : "none");
  }, []);
  if (state === "mobile") return null;
  const cls = small
    ? "mt-1 block w-full rounded-full border-2 border-foreground bg-card py-1 text-center text-xs font-semibold text-foreground"
    : "rounded-full border-2 border-foreground bg-card px-4 py-2 text-sm font-semibold text-foreground";
  if (state === "none") return <Link to="/extension" className={cls}>🧩 Get extension</Link>;
  return (
    <span className={small ? "block" : "contents"}>
      <button type="button" disabled={state === "sending"} className={`${cls} disabled:opacity-60`}
        onClick={() => { setErr(""); setState("sending"); sendToExtension(url, title).then(() => setState("done")).catch((e: Error) => { setErr(e.message); setState("ready"); }); }}>
        {state === "sending" ? "Sending..." : state === "done" ? "✓ In extension — open WhatsApp Web" : "🧩 Send to extension"}
      </button>
      {err && <span className="block text-xs text-destructive">{err}</span>}
    </span>
  );
}
