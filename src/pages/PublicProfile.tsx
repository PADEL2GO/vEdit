import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, UserPlus, UserCheck, Clock, UserX, Shield, Trophy, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFriendships } from "@/hooks/useFriendships";
import { getExpertLevel, getProgressToNextLevel } from "@/lib/expertLevels";
import { cn } from "@/lib/utils";

interface ProfileData {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  play_credits: number;
  lifetime_credits: number;
  skill_level: number;
  games_played: number;
  member_since: string;
  expert_level: {
    name: string;
    gradient: string;
    emoji: string;
  };
  match_history: {
    wins: number;
    losses: number;
    draws: number;
    total: number;
    last5: string[];
  };
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    useFriendshipStatus, 
    sendRequest, 
    isSendingRequest,
    cancelRequest,
    isCancellingRequest
  } = useFriendships();

  // Fetch public profile data via Edge Function
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async (): Promise<ProfileData | null> => {
      if (!username) return null;

      const { data, error } = await supabase.functions.invoke("public-profile-api", {
        body: { action: "profile", username },
      });

      if (error) {
        console.error("Failed to fetch public profile:", error);
        throw error;
      }

      return data;
    },
    enabled: !!username,
  });

  // Get friendship status
  const { data: friendshipStatus } = useFriendshipStatus(profile?.user_id);

  const isOwnProfile = user?.id === profile?.user_id;

  const handleFriendAction = async () => {
    if (!profile?.user_id) return;

    if (friendshipStatus?.status === "none") {
      await sendRequest(profile.user_id);
    } else if (friendshipStatus?.status === "pending" && friendshipStatus.isRequester) {
      if (friendshipStatus.friendshipId) {
        await cancelRequest(friendshipStatus.friendshipId);
      }
    }
  };

  const isPendingSent = friendshipStatus?.status === "pending" && friendshipStatus.isRequester;
  const isPendingReceived = friendshipStatus?.status === "pending" && !friendshipStatus.isRequester;

  // Expert level from API or calculated locally
  const expertLevel = profile ? getExpertLevel(profile.play_credits) : null;
  const progress = profile ? getProgressToNextLevel(profile.play_credits) : null;

  // Gradient classes helper
  const getGradientClasses = (gradient: string) => {
    const gradientMap: Record<string, string> = {
      "from-zinc-400 to-zinc-500": "from-zinc-400 to-zinc-500",
      "from-amber-500 to-orange-500": "from-amber-500 to-orange-500",
      "from-blue-400 to-cyan-500": "from-blue-400 to-cyan-500",
      "from-lime-400 to-green-500": "from-lime-400 to-green-500",
      "from-orange-500 to-red-500": "from-orange-500 to-red-500",
      "from-purple-500 to-pink-500": "from-purple-500 to-pink-500",
      "from-cyan-400 to-violet-500": "from-cyan-400 to-violet-500",
      "from-yellow-400 to-lime-400": "from-yellow-400 to-lime-400",
    };
    return gradientMap[gradient] || "from-primary to-primary";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-lg mx-auto space-y-6">
          <Skeleton className="h-10 w-24" />
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <UserX className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Nutzer nicht gefunden</h1>
          <p className="text-muted-foreground mb-6">
            Der Nutzer @{username} existiert nicht.
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username;
  const initials = displayName?.slice(0, 2).toUpperCase() || "??";
  const apiGradient = profile.expert_level?.gradient || expertLevel?.gradient || "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">Profil</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Avatar & Name */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className={cn(
                "absolute inset-0 rounded-full bg-gradient-to-br blur-md opacity-60 scale-110",
                getGradientClasses(apiGradient)
              )} />
              <Avatar className="w-24 h-24 relative border-4 border-background">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-muted text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <h1 className="text-2xl font-bold mt-4">{displayName}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>

            {/* Expert Level Badge */}
            <Badge 
              variant="outline" 
              className={cn(
                "mt-3 px-4 py-2 bg-gradient-to-r text-white border-0 text-base",
                getGradientClasses(apiGradient)
              )}
            >
              {profile.expert_level?.emoji || "🎮"} {profile.expert_level?.name || expertLevel?.name}
            </Badge>
          </div>

          {/* Friend Action Button */}
          {!isOwnProfile && user && (
            <div className="flex justify-center">
              {friendshipStatus?.status === "accepted" ? (
                <Button variant="outline" disabled className="gap-2">
                  <UserCheck className="w-4 h-4" />
                  Ihr seid Freunde
                </Button>
              ) : isPendingSent ? (
                <Button 
                  variant="outline" 
                  onClick={handleFriendAction}
                  disabled={isCancellingRequest}
                  className="gap-2"
                >
                  <Clock className="w-4 h-4" />
                  {isCancellingRequest ? "..." : "Anfrage abbrechen"}
                </Button>
              ) : isPendingReceived ? (
                <Button variant="outline" disabled className="gap-2">
                  <Clock className="w-4 h-4" />
                  Hat dich angefragt
                </Button>
              ) : friendshipStatus?.status === "blocked" ? (
                <Button variant="outline" disabled className="gap-2">
                  <Shield className="w-4 h-4" />
                  Blockiert
                </Button>
              ) : (
                <Button 
                  onClick={handleFriendAction}
                  disabled={isSendingRequest}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {isSendingRequest ? "..." : "Freund hinzufügen"}
                </Button>
              )}
            </div>
          )}

          {/* Stats Card with W/L */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Statistiken</h2>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {profile.play_credits.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Play Credits</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.skill_level.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Skill Level</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{profile.games_played}</p>
                <p className="text-xs text-muted-foreground">Spiele</p>
              </div>
            </div>

            {/* W/L Stats Row */}
            {profile.match_history.total > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-green-500" />
                    <span className="font-bold text-green-500">{profile.match_history.wins}</span>
                    <span className="text-xs text-muted-foreground">Siege</span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                    <span className="font-bold text-red-500">{profile.match_history.losses}</span>
                    <span className="text-xs text-muted-foreground">Niederlagen</span>
                  </div>
                </div>
              </div>
            )}

            {/* Last 5 Matches */}
            {profile.match_history.last5.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Letzte Matches</p>
                <div className="flex items-center justify-center gap-2">
                  {profile.match_history.last5.map((result, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center font-bold text-white text-sm",
                        result === "W" && "bg-green-500",
                        result === "L" && "bg-red-500",
                        result === "D" && "bg-amber-500"
                      )}
                    >
                      {result}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress to next level */}
            {progress && progress.nextLevelName && (
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Fortschritt zu {progress.nextLevelName}</span>
                  <span>{Math.round(progress.percentage)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn("h-full rounded-full bg-gradient-to-r", getGradientClasses(apiGradient))}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Noch {progress.remaining.toLocaleString()} Credits
                </p>
              </div>
            )}
          </div>

          {/* Member Since */}
          <p className="text-center text-sm text-muted-foreground">
            Mitglied seit {new Date(profile.member_since).toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric"
            })}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
