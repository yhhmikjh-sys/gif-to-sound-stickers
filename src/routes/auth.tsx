import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { useUser } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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
  const user = useUser();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // A session that shows up later (Google full-page redirect, email confirm) sends the user home.
  useEffect(() => {
    if (user) void navigate({ to: "/" });
  }, [user, navigate]);

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

  const google = async () => {
    setMsg(""); setGoogleBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setGoogleBusy(false);
    if (result.error) return setMsg(result.error.message);
    if (result.redirected) return;
    void navigate({ to: "/" });
  };

  const input = "mt-1 w-full rounded-2xl border-2 border-foreground bg-card px-4 py-3 text-foreground outline-hidden focus:ring-4 focus:ring-primary/40";
  return (
    <main className="min-h-screen pb-16">
      <TopNav />
      <div className="mx-auto mt-12 max-w-sm space-y-4 px-4">
        <h1 className="font-display text-4xl text-foreground">{mode === "in" ? "Sign in" : "Sign up"}</h1>
        <p className="text-sm text-muted-foreground">Account se aapke banaye stickers save rahenge aur extension mein dikhenge.</p>
        <GoogleButton busy={googleBusy} onClick={() => void google()} />
        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="h-px flex-1 bg-foreground/20" />ya<div className="h-px flex-1 bg-foreground/20" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-foreground">Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label>
          <label className="block text-sm font-semibold text-foreground">Password<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={input} /></label>
          <button disabled={busy} className="w-full rounded-full border-2 border-foreground bg-primary py-3 font-bold text-primary-foreground shadow-pop disabled:opacity-60">{busy ? "..." : mode === "in" ? "Sign in" : "Sign up"}</button>
        </form>
        {msg && <p className="text-sm text-foreground">{msg}</p>}
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="w-full text-sm font-semibold text-foreground underline">
          {mode === "in" ? "Naya account banao (Sign up)" : "Pehle se account hai? Sign in"}
        </button>
      </div>
    </main>
  );
}

// Google's branding rules fix this button's logo, colors, type and spacing, so it
// keeps its own inline styles instead of the app's button variants.
function GoogleButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="flex w-full items-center justify-center rounded-full disabled:opacity-60"
      style={{
        height: 44,
        padding: "0 12px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #747775",
        color: "#1F1F1F",
        fontFamily: "'Google Sans', system-ui, sans-serif",
        fontSize: 14,
        lineHeight: "20px",
        fontWeight: 500,
      }}
    >
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} style={{ marginRight: 10, flexShrink: 0 }}>
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
      </svg>
      Continue with Google
    </button>
  );
}
