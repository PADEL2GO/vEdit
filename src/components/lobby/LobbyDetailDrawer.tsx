import { useState, useEffect } from "react";
import { format, differenceInSeconds } from "date-fns";
import { de } from "date-fns/locale";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  UserPlus,
  Zap,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPrice } from "@/lib/pricing";
import { useAuth } from "@/hooks/useAuth";
import { useLobbyDetail, useJoinLobby, useLeaveLobby } from "@/hooks/useLobbies";
import type { Lobby, LobbyMember } from "@/types/lobby";

interface LobbyDetailDrawerProps {
  lobbyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CountdownTimer({ until }: { until: string }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const diff = differenceInSeconds(new Date(until), new Date());
      setSecondsLeft(Math.max(0, diff));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [until]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <span className="font-mono font-bold text-primary">
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

function MemberItem({ member }: { member: LobbyMember }) {
  const statusConfig = {
    paid: { label: "Bezahlt", variant: "default" as const, icon: CheckCircle },
    reserved: { label: "Reserviert", variant: "outline" as const, icon: Clock },
    joined: { label: "Beigetreten", variant: "secondary" as const, icon: Users },
    cancelled: { label: "Abgesagt", variant: "destructive" as const, icon: X },
    expired: { label: "Abgelaufen", variant: "outline" as const, icon: AlertCircle },
  };

  const config = statusConfig[member.status] || statusConfig.joined;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.profiles?.avatar_url || undefined} />
        <AvatarFallback>
          {member.profiles?.display_name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member.profiles?.display_name || member.profiles?.username || "Spieler"}
        </p>
        {member.skill_level && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            Skill {member.skill_level}
          </p>
        )}
      </div>
      <Badge variant={config.variant} className="shrink-0">
        <StatusIcon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    </div>
  );
}

export function LobbyDetailDrawer({
  lobbyId,
  open,
  onOpenChange,
}: LobbyDetailDrawerProps) {
  const { user } = useAuth();
  const { data: lobby, isLoading } = useLobbyDetail(lobbyId || undefined);
  const joinMutation = useJoinLobby();
  const leaveMutation = useLeaveLobby();

  if (!lobbyId) return null;

  const members = lobby?.members || [];
  const membersCount = members.filter(m => 
    m.status === "paid" || m.status === "joined" || m.status === "reserved"
  ).length;
  const freeSpots = lobby ? lobby.capacity - membersCount : 0;

  // Check user's membership status
  const userMembership = members.find((m) => m.user_id === user?.id);
  const isHost = lobby?.host_user_id === user?.id;
  const canJoin = lobby?.status === "open" && !userMembership && !isHost && freeSpots > 0;
  const canLeave = userMembership && userMembership.status !== "paid";
  const needsPayment = userMembership?.status === "reserved";

  const handleJoin = () => {
    if (lobbyId) {
      joinMutation.mutate(lobbyId);
    }
  };

  const handleLeave = () => {
    if (lobbyId) {
      leaveMutation.mutate(lobbyId);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : lobby ? (
          <>
            <SheetHeader className="p-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl">
                    {lobby.locations?.name || "Lobby"}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {lobby.courts?.name}
                    {lobby.locations?.address && ` • ${lobby.locations.address}`}
                  </p>
                </div>
                <Badge variant={lobby.status === "open" ? "default" : "secondary"}>
                  {lobby.status === "open" ? "Offen" : lobby.status}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Date & Time */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(lobby.start_time), "EEEE, dd. MMMM yyyy", { locale: de })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(lobby.start_time), "HH:mm", { locale: de })} –{" "}
                    {format(new Date(lobby.end_time), "HH:mm 'Uhr'", { locale: de })}
                  </span>
                </div>
              </div>

              {/* Skill Range & Progress */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">
                      Skill-Range: {lobby.skill_min}–{lobby.skill_max}
                    </span>
                  </div>
                  {lobby.avg_skill && (
                    <span className="text-sm text-muted-foreground">
                      Ø {lobby.avg_skill}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Teilnehmer</span>
                    <span className="font-medium">
                      {membersCount}/{lobby.capacity}
                      {freeSpots > 0 && (
                        <span className="text-primary ml-1">
                          ({freeSpots} frei)
                        </span>
                      )}
                    </span>
                  </div>
                  <Progress value={(membersCount / lobby.capacity) * 100} className="h-2" />
                </div>
              </div>

              {/* Reservation Warning */}
              {needsPayment && userMembership.reserved_until && (
                <Alert className="border-primary/50 bg-primary/5">
                  <Clock className="h-4 w-4 text-primary" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Dein Platz ist reserviert für</span>
                    <CountdownTimer until={userMembership.reserved_until} />
                  </AlertDescription>
                </Alert>
              )}

              {/* Members List */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Teilnehmer ({membersCount}/{lobby.capacity})
                </h3>

                <div className="space-y-2">
                  {members
                    .filter((m) => m.status !== "cancelled" && m.status !== "expired")
                    .map((member) => (
                      <MemberItem key={member.id} member={member} />
                    ))}

                  {/* Empty slots */}
                  {Array.from({ length: freeSpots }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/50 opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Freier Platz
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {lobby.description && (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-sm text-muted-foreground">{lobby.description}</p>
                </div>
              )}
            </div>

            {/* Sticky Footer CTA */}
            <div className="p-6 border-t border-border bg-background">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Dein Anteil</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(lobby.price_per_player_cents, lobby.currency)}
                </span>
              </div>

              {canJoin && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Beitreten...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Beitreten & Bezahlen
                    </>
                  )}
                </Button>
              )}

              {needsPayment && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Jetzt bezahlen"
                  )}
                </Button>
              )}

              {canLeave && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={handleLeave}
                  disabled={leaveMutation.isPending}
                >
                  {leaveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Lobby verlassen"
                  )}
                </Button>
              )}

              {lobby.status === "full" && !userMembership && (
                <Button className="w-full" size="lg" disabled>
                  Lobby ist voll
                </Button>
              )}

              {isHost && (
                <p className="text-sm text-center text-muted-foreground mt-2">
                  Du bist der Host dieser Lobby
                </p>
              )}

              {userMembership?.status === "paid" && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-500 mt-2">
                  <CheckCircle className="w-4 h-4" />
                  Du bist dabei!
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Lobby nicht gefunden
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
