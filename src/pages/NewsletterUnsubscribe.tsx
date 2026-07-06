import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function NewsletterUnsubscribe() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState("error");
      return;
    }
    supabase.functions
      .invoke("newsletter-unsubscribe", { body: { token } })
      .then(({ data, error }) =>
        setState(!error && (data as { success?: boolean } | null)?.success ? "ok" : "error"),
      )
      .catch(() => setState("error"));
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md w-full rounded-2xl border border-border/60 bg-gradient-card p-8 flex flex-col items-center gap-4">
        <div className="text-2xl font-display font-bold tracking-tight text-foreground">
          PADEL<span className="text-primary">2</span>GO
        </div>
        {state === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Wird abgemeldet…</p>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Abgemeldet</h1>
            <p className="text-muted-foreground">Du wurdest abgemeldet. Schade, dass du gehst!</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="w-10 h-10 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Link ungültig</h1>
            <p className="text-muted-foreground">
              Dieser Abmelde-Link ist ungültig oder abgelaufen.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
