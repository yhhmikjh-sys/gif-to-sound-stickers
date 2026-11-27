import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — StikDesi" },
      { name: "description", content: "Sign in to keep your sound stickers and send them from WhatsApp Web." },
      { property: "og:title", content: "Sign in — StikDesi" },
      { property: "og:description", content: "Sign in to keep your sound stickers and send them from WhatsApp Web." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setBusy(true);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) return setMsg(error.message);
      if (!data.session) return setMsg("Email check karo aur link dabake account confirm karo. Phir yahan sign in karo.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg(error.message);
    }
    void navigate({ to: "/" });
  };
  const input = "mt-1 w-full rounded-2xl border-2 border-foreground bg-card px-4 py-3 text-foreground outline-hidden focus:ring-4 focus:ring-primary/40";
  return (
    <main className="min-h-screen pb-16">
      <TopNav />
      <form onSubmit={submit} className="mx-auto mt-12 max-w-sm space-y-4 px-4">
        <h1 className="font-display text-4xl text-foreground">{mode === "in" ? "Sign in" : "Sign up"}</h1>
        <p className="text-sm text-muted-foreground">Account se aapke banaye stickers save rahenge aur extension mein dikhenge.</p>
        <label className="block text-sm font-semibold text-foreground">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label>
        <label className="block text-sm font-semibold text-foreground">Password<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={input} /></label>
        <button disabled={busy} className="w-full rounded-full border-2 border-foreground bg-primary py-3 font-bold text-primary-foreground shadow-pop disabled:opacity-60">{busy ? "..." : mode === "in" ? "Sign in" : "Sign up"}</button>
        {msg && <p className="text-sm text-foreground">{msg}</p>}
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="w-full text-sm font-semibold text-foreground underline">
          {mode === "in" ? "Naya account banao (Sign up)" : "Pehle se account hai? Sign in"}
        </button>
      </form>
    </main>
  );
}
