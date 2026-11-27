import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";

export function TopNav() {
  const user = useUser();
  const qc = useQueryClient();
  return (
    <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-5">
      <Link to="/" className="font-display text-2xl text-foreground">StikDesi</Link>
      <div className="flex gap-2 text-sm font-semibold">
        <Link to="/" className="rounded-full px-3 py-1.5" inactiveProps={{ className: "text-foreground" }} activeProps={{ className: "bg-foreground text-background" }} activeOptions={{ exact: true }}>Home</Link>
        <Link to="/explore" search={{ q: "" }} className="rounded-full px-3 py-1.5" inactiveProps={{ className: "text-foreground" }} activeProps={{ className: "bg-foreground text-background" }}>Public stickers</Link>
        <Link to="/extension" className="hidden rounded-full px-3 py-1.5 sm:inline" inactiveProps={{ className: "text-foreground" }} activeProps={{ className: "bg-foreground text-background" }}>Extension</Link>
        {user
          ? <button type="button" onClick={() => { void supabase.auth.signOut().then(() => qc.clear()); }} className="rounded-full border-2 border-foreground px-3 py-1 text-foreground">Sign out</button>
          : <Link to="/auth" className="rounded-full border-2 border-foreground px-3 py-1 text-foreground">Sign in</Link>}
      </div>
    </nav>
  );
}
