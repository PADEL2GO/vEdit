import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Users, Clock, ChevronRight, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Wartend", variant: "outline" },
  ACTIVE: { label: "Aktiv", variant: "default" },
  PROCESSING: { label: "Verarbeitung", variant: "secondary" },
  COMPLETED: { label: "Abgeschlossen", variant: "default" },
  FAILED: { label: "Fehler", variant: "destructive" },
};

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kamera Sessions</h3>
          <p className="text-sm text-muted-foreground">
            Übersicht über aktive und abgeschlossene Match-Sessions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "active" | "history")}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Aktiv ({activeSessions.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Historie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Lade Sessions...</div>
          ) : activeSessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Keine aktiven Sessions</h3>
                <p className="text-sm text-muted-foreground">
                  Wenn ein Match gestartet wird, erscheint es hier
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Lade Sessions...</div>
          ) : completedSessions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Keine abgeschlossenen Sessions</h3>
                <p className="text-sm text-muted-foreground">
                  Abgeschlossene Matches erscheinen hier
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SessionCard({ session }: { session: CameraSession }) {
  const status = statusConfig[session.status] || { label: session.status, variant: "secondary" as const };
  const playerCount = session.camera_session_players?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                {session.courts?.name || "Court"}
              </CardTitle>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <CardDescription>
              {session.courts?.locations?.name || "Standort"} • Session: {session.session_id.substring(0, 16)}...
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{playerCount}/4</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {session.started_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  Gestartet {formatDistanceToNow(new Date(session.started_at), { 
                    addSuffix: true, 
                    locale: de 
                  })}
                </span>
              </div>
            )}
            {session.ended_at && (
              <span>
                Beendet: {format(new Date(session.ended_at), "HH:mm", { locale: de })}
              </span>
            )}
          </div>
          {session.error_message && (
            <span className="text-sm text-destructive">{session.error_message}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
