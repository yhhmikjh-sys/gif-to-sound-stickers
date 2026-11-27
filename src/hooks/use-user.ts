import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Browser session (localStorage); null on the server and when signed out.
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT" || e === "USER_UPDATED" || e === "INITIAL_SESSION") setUser(s?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}
