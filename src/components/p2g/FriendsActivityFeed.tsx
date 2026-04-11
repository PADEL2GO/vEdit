import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, TrendingUp, Flame, Award, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: "level_up" | "credits_earned" | "streak_milestone";
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  points?: number;
  description: string;
  createdAt: string;
}

export function FriendsActivityFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["friends-activity", user?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!user) return [];

      // Get friend IDs
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (!friendships || friendships.length === 0) return [];

      const friendIds = friendships.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Get recent ledger entries for friends (last 7 days, significant amounts)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: ledgerEntries } = await supabase
        .from("points_ledger")
        .select("id, user_id, delta_points, description, entry_type, created_at")
        .in("user_id", friendIds)
        .gte("created_at", weekAgo.toISOString())
        .gte("delta_points", 20) // Only show significant gains
        .order("created_at", { ascending: false })
        .limit(10);

      if (!ledgerEntries || ledgerEntries.length === 0) return [];

      // Get profiles for friend IDs
      const uniqueUserIds = [...new Set(ledgerEntries.map((e) => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", uniqueUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return ledgerEntries.map((entry) => {
        const profile = profileMap.get(entry.user_id);
        let type: ActivityItem["type"] = "credits_earned";
        
        if (entry.description?.toLowerCase().includes("streak")) {
          type = "streak_milestone";
        } else if (entry.description?.toLowerCase().includes("level")) {
          type = "level_up";
        }

        return {
          id: entry.id,
          type,
          userId: entry.user_id,
          username: profile?.username || null,
          displayName: profile?.display_name || null,
          avatarUrl: profile?.avatar_url || null,
          points: entry.delta_points,
          description: entry.description || `+${entry.delta_points} Credits verdient`,
          createdAt: entry.created_at,
        };
      });
    },
    enabled: !!user,
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Freunde-Aktivität
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Aktivitäten von Freunden in den letzten 7 Tagen.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "level_up":
        return <Award className="h-4 w-4 text-purple-400" />;
      case "streak_milestone":
        return <Flame className="h-4 w-4 text-orange-400" />;
      default:
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Freunde-Aktivität
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.slice(0, 5).map((activity, index) => {
          const initials = activity.displayName
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() || activity.username?.[0]?.toUpperCase() || "?";

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => activity.username && navigate(`/u/${activity.username}`)}
            >
              <Avatar className="w-8 h-8 border border-border/50">
                <AvatarImage src={activity.avatarUrl || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-foreground">
                    {activity.displayName || activity.username || "Unbekannt"}
                  </span>
                  <span className="text-muted-foreground ml-1.5">
                    {activity.description}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {formatDistanceToNow(new Date(activity.createdAt), { locale: de, addSuffix: true })}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {getActivityIcon(activity.type)}
                {activity.points && (
                  <span className="text-xs font-medium text-emerald-400">
                    +{activity.points}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
