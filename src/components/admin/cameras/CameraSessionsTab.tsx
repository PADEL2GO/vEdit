import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Users, Clock, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface CameraSession {
  id: string;
  session_id: string;
  court_id: string;
  booking_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
  courts?: { name: string; locations?: { name: string } };
  camera_session_players?: Array<{
    user_id: string;
    team: number;
    position: string;
    profiles?: { display_name: string; username: string };
  }>;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Wartend", className: "border-[hsl(41_100%_65%/0.3)] bg-[hsl(41_100%_65%/0.1)] text-[#FFC44D]" },
  ACTIVE: { label: "Aktiv", className: "border-primary/30 bg-primary/10 text-primary" },
  PROCESSING: { label: "Verarbeitung", className: "border-[hsl(200_100%_75%/0.3)] bg-[hsl(200_100%_75%/0.1)] text-[#7FD4FF]" },
  COMPLETED: { label: "Abgeschlossen", className: "border-primary/30 bg-primary/10 text-primary" },
  FAILED: { label: "Fehler", className: "border-[hsl(0_100%_71%/0.3)] bg-[hsl(0_100%_71%/0.1)] text-[#FF6B6B]" },
};

const SEG_TRIGGER_CLASSES =
  "gap-2 rounded-lg px-3.5 py-[6px] text-[12.5px] font-bold text-[hsl(0_0%_62%)] transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none";

export function CameraSessionsTab() {
  const [view, setView] = useState<"active" | "history">("active");

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ["camera-sessions", view],
    queryFn: async () => {
      let query = supabase
        .from("camera_sessions")
        .select(`
          *,
          courts (
            name,
            locations (name)
          ),
          camera_session_players (
            user_id,
            team,
            position
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (view === "active") {
        query = query.in("status", ["PENDING", "ACTIVE", "PROCESSING"]);
      } else {
        query = query.in("status", ["COMPLETED", "FAILED"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CameraSession[];
    },
    refetchInterval: view === "active" ? 10000 : false, // Auto-refresh active sessions
  });

  const activeSessions = sessions?.filter(s => ["PENDING", "ACTIVE", "PROCESSING"].includes(s.status)) || [];
  const completedSessions = sessions?.filter(s => ["COMPLETED", "FAILED"].includes(s.status)) || [];

  return (
    <Card className="rounded-2xl border-border bg-gradient-card p-5 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex min-w-0 flex-col gap-[3px]">
            <h3 className="font-display text-base font-bold tracking-tight text-foreground">
              Kamera Sessions
            </h3>
            <p className="text-xs text-muted-foreground">
              Übersicht über aktive und abgeschlossene Match-Sessions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 flex-none gap-1.5 rounded-[9px] border-[hsl(0_0%_16%)] bg-white/5 px-3 text-xs font-bold text-[hsl(0_0%_75%)] hover:border-primary/40 hover:bg-white/5 hover:text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Aktualisieren
          </Button>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "active" | "history")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="h-auto gap-[3px] rounded-[11px] border border-[hsl(0_0%_14%)] bg-white/[0.04] p-[3px]">
              <TabsTrigger value="active" className={SEG_TRIGGER_CLASSES}>
                <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
                Aktiv ({activeSessions.length})
              </TabsTrigger>
              <TabsTrigger value="history" className={SEG_TRIGGER_CLASSES}>
                Historie
              </TabsTrigger>
            </TabsList>
            {view === "active" && (
              <span className="inline-flex items-center gap-[7px] whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Auto-Refresh 10 s
              </span>
            )}
          </div>

          <TabsContent value="active" className="mt-4">
            {isLoading ? (
              <div className="py-8 text-center text-[13.5px] text-muted-foreground">Lade Sessions...</div>
            ) : activeSessions.length === 0 ? (
              <div className="flex flex-col items-center rounded-[14px] border border-[hsl(0_0%_12%)] bg-white/[0.02] px-4 py-12 text-center">
                <span className="mb-4 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]">
                  <Video className="h-4 w-4" />
                </span>
                <h3 className="mb-1 text-sm font-semibold text-foreground">Keine aktiven Sessions</h3>
                <p className="text-xs text-muted-foreground">
                  Wenn ein Match gestartet wird, erscheint es hier
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-[9px]">
                {activeSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {isLoading ? (
              <div className="py-8 text-center text-[13.5px] text-muted-foreground">Lade Sessions...</div>
            ) : completedSessions.length === 0 ? (
              <div className="flex flex-col items-center rounded-[14px] border border-[hsl(0_0%_12%)] bg-white/[0.02] px-4 py-12 text-center">
                <span className="mb-4 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]">
                  <Video className="h-4 w-4" />
                </span>
                <h3 className="mb-1 text-sm font-semibold text-foreground">Keine abgeschlossenen Sessions</h3>
                <p className="text-xs text-muted-foreground">
                  Abgeschlossene Matches erscheinen hier
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-[9px]">
                {completedSessions.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
}

function SessionCard({ session }: { session: CameraSession }) {
  const status = statusConfig[session.status] || {
    label: session.status,
    className: "border-[hsl(0_0%_16%)] bg-white/5 text-muted-foreground",
  };
  const playerCount = session.camera_session_players?.length || 0;

  return (
    <div className="flex flex-col gap-2 rounded-[13px] border border-[hsl(0_0%_12%)] bg-white/[0.028] px-3.5 py-[13px]">
      <div className="flex items-center gap-3">
        <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-[hsl(0_0%_16%)] bg-white/5 text-[hsl(0_0%_72%)]">
          <Video className="h-[15px] w-[15px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13.5px] font-semibold text-foreground">
            {session.courts?.name || "Court"}
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {session.courts?.locations?.name || "Standort"} • Session: {session.session_id.substring(0, 16)}...
          </span>
        </div>
        <span className="inline-flex flex-none items-center gap-1 font-mono text-[11.5px] text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {playerCount}/4
        </span>
        <Badge
          variant="outline"
          className={cn(
            "flex-none whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold",
            status.className
          )}
        >
          {status.label}
        </Badge>
      </div>
      {(session.started_at || session.ended_at || session.error_message) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:pl-[46px]">
          {session.started_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Gestartet {formatDistanceToNow(new Date(session.started_at), {
                addSuffix: true,
                locale: de
              })}
            </span>
          )}
          {session.ended_at && (
            <span>
              Beendet: {format(new Date(session.ended_at), "HH:mm", { locale: de })}
            </span>
          )}
          {session.error_message && (
            <span className="text-[#FF6B6B]">{session.error_message}</span>
          )}
        </div>
      )}
    </div>
  );
}
