import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isTomorrow, parseISO, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import {
  Calendar, Clock, MapPin, Coins, Trophy, Star, TrendingUp,
  ArrowRight, Users, ShoppingBag, Target, Zap, Bell,
  UserPlus, CheckCircle, XCircle, CalendarCheck, Gamepad2,
  Sparkles, ChevronRight, LayoutGrid, Flame, X, Megaphone,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useAuth } from "@/hooks/useAuth";
import { useAccountData } from "@/hooks/useAccountData";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { supabase } from "@/integrations/supabase/client";
import { getExpertLevel, getProgressToNextLevel, getExpertLevelEmoji } from "@/lib/expertLevels";
import { getStreakLabel, getStreakColor } from "@/lib/bookingCredits";
import { useWeeklyBookingStreak } from "@/hooks/useWeeklyBookingStreak";
import {
  useNextBooking,
  usePendingInvites,
  useUpcomingEvents,
  useUnreadNotifications,
  usePendingFriendRequests,
  useMonthlyBookingCount,
  useOnlineLocations,
  useAdminBroadcasts,
  useFriendActivity,
} from "@/hooks/useDashboardSummary";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

interface SkillLevelInfo {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
}

function getSkillLevelInfo(level: number): SkillLevelInfo {
  if (level >= 8.5) return { label: "Profi", emoji: "💎", color: "text-yellow-300", bg: "bg-yellow-500/20", border: "border-yellow-500/40", ring: "ring-yellow-400/50" };
  if (level >= 7)   return { label: "Experte", emoji: "🔥", color: "text-lime-400", bg: "bg-lime-500/20", border: "border-lime-500/40", ring: "ring-lime-400/50" };
  if (level >= 5)   return { label: "Fortgeschritten", emoji: "⚡", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40", ring: "ring-blue-400/50" };
  if (level >= 3)   return { label: "Einsteiger", emoji: "🎾", color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/40", ring: "ring-cyan-400/50" };
  return { label: "Anfänger", emoji: "🌱", color: "text-zinc-400", bg: "bg-zinc-500/20", border: "border-zinc-500/40", ring: "ring-zinc-400/40" };
}

function formatBookingTime(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return `Heute · ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Morgen · ${format(d, "HH:mm")}`;
  return format(d, "EEE dd. MMM · HH:mm", { locale: de });
}

function notificationIcon(type: string) {
  const map: Record<string, React.ElementType> = {
    booking: CalendarCheck,
    friend_request: UserPlus,
    reward: Sparkles,
    broadcast: Megaphone,
    match: Gamepad2,
  };
  const Icon = map[type] ?? Bell;
  return <Icon className="w-4 h-4" />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, wallet, skillStats, loading: accountLoading } = useAccountData(user);
  const features = useFeatureToggles();

  // Live notifications
  useRealtimeNotifications(user?.id);

  const { data: nextBooking } = useNextBooking(user?.id);
  const { data: pendingInvites = [] } = usePendingInvites(user?.id);
  const { data: upcomingEvents = [] } = useUpcomingEvents(3);
  const { data: notifications = [] } = useUnreadNotifications(user?.id, 6);
  const { data: friendRequests = [] } = usePendingFriendRequests(user?.id);
  const { data: monthlyCount = 0 } = useMonthlyBookingCount(user?.id);
  const { data: locations = [] } = useOnlineLocations(profile?.shipping_city);
  const { data: broadcasts = [] } = useAdminBroadcasts();
  const { data: streakData } = useWeeklyBookingStreak(user?.id);
  const { data: friendActivity = [] } = useFriendActivity(user?.id);

  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("p2g_dismissed_broadcasts") || "[]");
    } catch {
      return [];
    }
  });

  const dismissBroadcast = (id: string) => {
    const next = [...dismissedBroadcasts, id];
    setDismissedBroadcasts(next);
    localStorage.setItem("p2g_dismissed_broadcasts", JSON.stringify(next));
  };

  const visibleBroadcasts = broadcasts.filter((b) => !dismissedBroadcasts.includes(b.id));

  const playCredits = wallet?.play_credits ?? 0;
  const rewardCredits = wallet?.reward_credits ?? 0;
  const levelInfo = getExpertLevel(playCredits);
  const levelProgress = getProgressToNextLevel(playCredits);
  const levelEmoji = getExpertLevelEmoji(levelInfo.name);
  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "Spieler";
  const streak = streakData?.weekStreak ?? 0;
  const streakMultiplier = streakData?.multiplier ?? 1;
  const pendingActions = pendingInvites.length + friendRequests.length;
  const skillValue = skillStats?.skill_level ?? 0;
  const skillInfo = getSkillLevelInfo(skillValue);

  // Onboarding state
  const hasDisplayName = !!profile?.display_name;
  const hasAvatar = !!profile?.avatar_url;
  const hasBooking = monthlyCount > 0 || !!nextBooking;
  const hasFriend = false; // derived from friendActivity (has friends if activity exists)
  const showOnboarding = !hasDisplayName || !hasAvatar || !hasBooking;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const acceptInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("booking_participants")
        .update({ status: "accepted" })
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-pending-invites"] });
      toast.success("Einladung angenommen!");
    },
  });

  const declineInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("booking_participants")
        .update({ status: "declined" })
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-pending-invites"] });
      toast.success("Einladung abgelehnt.");
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-friend-activity"] });
      toast.success("Freundschaft bestätigt!");
    },
  });

  const declineFriendMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-friend-requests"] });
      toast.success("Anfrage abgelehnt.");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user!.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-notifications"] });
    },
  });

  const markNotificationRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-notifications"] });
    },
  });

  // ── Feature tiles ──────────────────────────────────────────────────────────

  // Primary tiles — full-width 3-col row, solid vivid colors
  const primaryTiles = [
    { to: "/dashboard/booking", icon: Calendar, label: "Court buchen", cardBg: "bg-[#C7F011]", iconBg: "bg-black/15", iconColor: "text-black", labelColor: "text-black font-bold" },
    { to: "/dashboard/rewards", icon: Coins, label: "Rewards", cardBg: "bg-amber-400", iconBg: "bg-black/15", iconColor: "text-black", labelColor: "text-black font-bold" },
    { to: "/dashboard/friends", icon: Users, label: "Freunde", cardBg: "bg-blue-600", iconBg: "bg-white/20", iconColor: "text-white", labelColor: "text-white font-bold", badge: friendRequests.length },
  ];

  // Secondary tiles — feature-flag gated, compact 4-col row
  const secondaryTiles = [
    { to: "/dashboard/p2g-points", icon: Gamepad2, label: "P2G Points", iconBg: "bg-purple-500/20", iconColor: "text-purple-300", border: "border-purple-500/20", show: features.p2g_enabled },
    { to: "/dashboard/league", icon: Trophy, label: "Liga", iconBg: "bg-yellow-500/20", iconColor: "text-yellow-300", border: "border-yellow-500/20", show: features.league_enabled },
    { to: "/dashboard/events", icon: Star, label: "Events", iconBg: "bg-rose-500/20", iconColor: "text-rose-300", border: "border-rose-500/20", show: features.events_enabled },
    { to: "/dashboard/marketplace", icon: ShoppingBag, label: "Markt", iconBg: "bg-teal-500/20", iconColor: "text-teal-300", border: "border-teal-500/20", show: features.marketplace_enabled },
    { to: "/lobbies", icon: Target, label: "Lobbies", iconBg: "bg-orange-500/20", iconColor: "text-orange-300", border: "border-orange-500/20", show: features.lobbies_enabled },
  ].filter((t) => t.show);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <Helmet>
        <title>Mein P2G | PADEL2GO</title>
      </Helmet>

      <div className="pb-24">

        {/* ── Welcome Hero ────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-background border-b border-border/50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#C7F011_0%,_transparent_55%)] opacity-10 pointer-events-none" />
          <div className="container mx-auto max-w-5xl px-4 py-8 md:py-10 relative z-10">

            {/* Profile identity */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-7">
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full ring-4 ring-primary/30 ring-offset-2 ring-offset-background overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover w-full h-full" />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold w-full h-full flex items-center justify-center">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {streak >= 2 && (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-500 border-2 border-background flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">{getGreeting()}</p>
                <h1 className="text-3xl md:text-4xl font-bold">{displayName}</h1>
                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold border ${levelInfo.borderColor} ${levelInfo.textColor}`}>
                  <span>{levelEmoji}</span>
                  <span>{levelInfo.name}</span>
                  {streak >= 3 && (
                    <span className="ml-1.5 flex items-center gap-0.5 text-orange-400">
                      <Flame className="w-3 h-3" />{streak}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats — large number cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#C7F011]/15 border border-[#C7F011]/30">
                <Coins className="w-5 h-5 text-[#C7F011] mb-2" />
                <p className="text-2xl font-bold text-[#C7F011] leading-none">{playCredits.toLocaleString("de")}</p>
                <p className="text-xs text-white/50 mt-1">Play Credits</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30">
                <Zap className="w-5 h-5 text-amber-300 mb-2" />
                <p className="text-2xl font-bold text-amber-300 leading-none">{rewardCredits.toLocaleString("de")}</p>
                <p className="text-xs text-white/50 mt-1">Reward Credits</p>
              </div>
              <div className={`p-4 rounded-2xl ${skillValue > 0 ? skillInfo.bg : "bg-zinc-500/15"} border ${skillValue > 0 ? skillInfo.border : "border-zinc-500/30"}`}>
                <span className="text-lg mb-1 block">{skillValue > 0 ? skillInfo.emoji : "🎮"}</span>
                <p className={`text-2xl font-bold leading-none ${skillValue > 0 ? skillInfo.color : "text-zinc-400"}`}>
                  {skillValue > 0 ? skillValue.toFixed(1) : "–"}
                </p>
                <p className="text-xs text-white/50 mt-1">{skillValue > 0 ? skillInfo.label : "Skill (KI)"}</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30">
                <Calendar className="w-5 h-5 text-rose-300 mb-2" />
                <p className="text-2xl font-bold text-rose-300 leading-none">{monthlyCount}</p>
                <p className="text-xs text-white/50 mt-1">Buchungen / Monat</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">

          {/* ── Admin News Banners ────────────────────────────────────── */}
          <AnimatePresence>
            {visibleBroadcasts.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start justify-between gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <Megaphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">{b.title}</p>
                    <p className="text-sm text-muted-foreground">{b.message}</p>
                    {b.cta_url && b.cta_label && (
                      <a
                        href={b.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-1 hover:underline"
                      >
                        {b.cta_label} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  onClick={() => dismissBroadcast(b.id)}
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ── Onboarding Checklist ──────────────────────────────────── */}
          {showOnboarding && (
            <OnboardingChecklist
              hasDisplayName={hasDisplayName}
              hasAvatar={hasAvatar}
              hasBooking={hasBooking}
              hasFriend={hasFriend}
            />
          )}

          {/* ── Pending Actions ───────────────────────────────────────── */}
          {pendingActions > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-primary" /> Offene Aktionen ({pendingActions})
              </p>

              {pendingInvites.map((invite) => (
                <motion.div
                  key={invite.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-primary/20"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarCheck className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {invite.inviter?.display_name || invite.inviter?.username || "Jemand"} lädt dich ein
                      </p>
                      {invite.booking && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatBookingTime(invite.booking.start_time)}
                          {" · "}
                          {(invite.booking.location as any)?.name ?? ""}
                          {invite.share_price_cents != null
                            ? ` · ${(invite.share_price_cents / 100).toFixed(2)} €`
                            : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm" variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => declineInviteMutation.mutate(invite.id)}
                      disabled={declineInviteMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Ablehnen
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => acceptInviteMutation.mutate(invite.id)}
                      disabled={acceptInviteMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Annehmen
                    </Button>
                  </div>
                </motion.div>
              ))}

              {friendRequests.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-sm font-semibold">
                      {friendRequests.length === 1
                        ? `${friendRequests[0].profile?.display_name || friendRequests[0].profile?.username || "Jemand"} möchte dein Freund sein`
                        : `${friendRequests.length} Freundschaftsanfragen`}
                    </p>
                  </div>
                  {friendRequests.length === 1 ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => declineFriendMutation.mutate(friendRequests[0].id)}
                        disabled={declineFriendMutation.isPending}>
                        <XCircle className="w-4 h-4 mr-1" /> Ablehnen
                      </Button>
                      <Button size="sm"
                        onClick={() => acceptFriendMutation.mutate(friendRequests[0].id)}
                        disabled={acceptFriendMutation.isPending}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Annehmen
                      </Button>
                    </div>
                  ) : (
                    <NavLink to="/dashboard/friends">
                      <Button size="sm" variant="outline">
                        Alle anzeigen <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Feature Nav Hub ──────────────────────────────────────── */}
          {/* ── Primary Action Tiles ─────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {primaryTiles.map((tile) => (
              <NavLink key={tile.to} to={tile.to} className="min-w-0">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex flex-col items-center justify-center gap-2.5 py-4 px-2 rounded-2xl transition-all cursor-pointer text-center ${tile.cardBg} shadow-lg`}
                >
                  {"badge" in tile && tile.badge != null && tile.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center z-10">
                      {tile.badge > 9 ? "9+" : tile.badge}
                    </span>
                  )}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tile.iconBg}`}>
                    <tile.icon className={`w-5 h-5 ${tile.iconColor}`} />
                  </div>
                  <span className={`text-xs leading-tight w-full truncate px-1 ${tile.labelColor}`}>{tile.label}</span>
                </motion.div>
              </NavLink>
            ))}
          </div>

          {/* ── Secondary Tiles ──────────────────────────────────────── */}
          {secondaryTiles.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {secondaryTiles.map((tile) => (
                <NavLink key={tile.to} to={tile.to} className="min-w-0">
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className={`relative flex flex-col items-center justify-center gap-2 p-2 sm:p-3 rounded-xl bg-card border transition-all cursor-pointer text-center hover:brightness-110 ${tile.border}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tile.iconBg}`}>
                      <tile.icon className={`w-4 h-4 ${tile.iconColor}`} />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-semibold leading-tight text-white/70 w-full truncate px-0.5">{tile.label}</span>
                  </motion.div>
                </NavLink>
              ))}
            </div>
          )}

          {/* ── Main Grid ─────────────────────────────────────────────── */}
          <div className="grid md:grid-cols-3 gap-5">

            {/* LEFT: 2/3 — order-2 on mobile so sidebar comes first */}
            <div className="md:col-span-2 space-y-5 order-2 md:order-1">

              {/* Next booking */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nächste Buchung</h2>
                  <NavLink to="/dashboard/booking" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                    Alle <ChevronRight className="w-3 h-3" />
                  </NavLink>
                </div>
                {nextBooking ? (
                  <Card className="border-primary/20">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold">{(nextBooking.court as any)?.name ?? "Court"}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {formatBookingTime(nextBooking.start_time)} – {format(parseISO(nextBooking.end_time), "HH:mm")}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {(nextBooking.location as any)?.name ?? ""}
                              {(nextBooking.location as any)?.city ? `, ${(nextBooking.location as any).city}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant={nextBooking.status === "confirmed" ? "default" : "secondary"}>
                            {nextBooking.status === "confirmed" ? "Bestätigt"
                              : nextBooking.status === "pending_payment" ? "Zahlung ausstehend"
                              : "Ausstehend"}
                          </Badge>
                          {nextBooking.price_cents != null && (
                            <p className="text-sm font-semibold mt-1">{(nextBooking.price_cents / 100).toFixed(2)} €</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed border-primary/20">
                    <CardContent className="p-6 text-center">
                      <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">Keine anstehenden Buchungen.</p>
                      <NavLink to="/dashboard/booking">
                        <Button size="sm">Court buchen <ArrowRight className="w-4 h-4 ml-2" /></Button>
                      </NavLink>
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* Court suggestions (city-based) */}
              {locations.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {profile?.shipping_city ? `Courts in ${profile.shipping_city}` : "Verfügbare Courts"}
                    </h2>
                    <NavLink to="/dashboard/booking" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                      Alle <ChevronRight className="w-3 h-3" />
                    </NavLink>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {locations.slice(0, 2).map((loc) => (
                      <NavLink key={loc.id} to="/dashboard/booking">
                        <Card className="overflow-hidden hover:border-primary/30 transition-colors cursor-pointer h-full">
                          <CardContent className="p-0">
                            {loc.main_image_url ? (
                              <img src={loc.main_image_url} alt={loc.name}
                                className="w-full h-28 object-cover" />
                            ) : (
                              <div className="w-full h-28 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                                <LayoutGrid className="w-8 h-8 text-primary/30" />
                              </div>
                            )}
                            <div className="p-3">
                              <p className="font-semibold text-sm leading-snug">{loc.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />{loc.city}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </NavLink>
                    ))}
                  </div>
                </section>
              )}

              {/* Friend activity feed */}
              {friendActivity.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Freunde Aktivität
                  </h2>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      {friendActivity.slice(0, 5).map((match) => (
                        <div key={match.id} className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={match.profile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs bg-muted">
                              {(match.profile?.display_name || match.profile?.username || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">
                              {match.profile?.display_name || match.profile?.username || "Spieler"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {match.result === "W" ? "✅ Gewonnen" : match.result === "L" ? "❌ Verloren" : "🎾 Gespielt"}
                              {" · "}+{match.credits_awarded} Credits
                              {" · Skill "}{match.skill_level_snapshot?.toFixed(1)}
                            </p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(parseISO(match.created_at), { locale: de, addSuffix: true })}
                          </span>
                        </div>
                      ))}
                      <NavLink to="/dashboard/friends" className="block text-center pt-1">
                        <Button variant="ghost" size="sm" className="text-xs text-primary h-7">
                          Alle Freunde <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </NavLink>
                    </CardContent>
                  </Card>
                </section>
              )}

              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kommende Events</h2>
                    {features.events_enabled && (
                      <NavLink to="/dashboard/events" className="text-xs text-primary flex items-center gap-0.5 hover:underline">
                        Alle <ChevronRight className="w-3 h-3" />
                      </NavLink>
                    )}
                  </div>
                  <div className="space-y-2">
                    {upcomingEvents.map((event, i) => (
                      <motion.div key={event.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <Card className="hover:border-primary/30 transition-colors overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex items-center gap-4 p-4">
                              {event.image_url ? (
                                <img src={event.image_url} alt={event.title}
                                  className="w-14 h-14 rounded-xl object-cover shrink-0" />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                                  <Star className="w-5 h-5 text-rose-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{event.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {event.start_at && format(parseISO(event.start_at), "EEE dd. MMM · HH:mm", { locale: de })}
                                  {event.city && ` · ${event.city}`}
                                </p>
                              </div>
                              {event.ticket_url && (
                                <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="shrink-0 h-8 text-xs">
                                    Tickets
                                  </Button>
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* RIGHT: 1/3 — order-1 on mobile so it appears above the long feed */}
            <div className="space-y-5 order-1 md:order-2">

              {/* Level & Progress */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dein Level</h2>
                    <NavLink to="/dashboard/rewards">
                      <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2">
                        Details <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </NavLink>
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${levelInfo.bgGradient} border ${levelInfo.borderColor} mb-4`}>
                    <span className="text-2xl">{levelEmoji}</span>
                    <div>
                      <p className={`font-bold text-sm ${levelInfo.textColor}`}>{levelInfo.name}</p>
                      <p className="text-xs text-muted-foreground">{playCredits.toLocaleString("de")} Play Credits</p>
                    </div>
                  </div>
                  {levelProgress.nextLevelName ? (
                    <>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                        <span>→ {levelProgress.nextLevelName}</span>
                        <span>{levelProgress.remaining.toLocaleString("de")} fehlen</span>
                      </div>
                      <Progress value={levelProgress.percentage} className="h-2 rounded-full" />
                    </>
                  ) : (
                    <p className="text-xs text-primary font-semibold text-center">🏆 Max Level!</p>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Streak Widget */}
              <Card className={streak >= 4 ? "border-orange-500/40" : streak >= 2 ? "border-amber-500/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Flame className={`w-4 h-4 ${streak >= 2 ? "text-orange-400" : "text-muted-foreground"}`} />
                      Wochenserie
                    </h2>
                    {streak >= 2 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 ${getStreakColor(streak)}`}>
                        {getStreakLabel(streak)} Multiplikator
                      </span>
                    )}
                  </div>

                  <div className="text-center py-2">
                    <p className={`text-5xl font-bold ${streak >= 4 ? "text-orange-400" : streak >= 2 ? "text-amber-400" : streak > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {streak}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {streak === 0 ? "Noch keine aktive Wochenserie"
                        : streak === 1 ? "Woche in Folge"
                        : "Wochen in Folge"}
                    </p>
                    {streak >= 4 && <p className="text-xs text-orange-400 font-semibold mt-1">🔥 Max Multiplikator erreicht!</p>}
                    {streak >= 2 && streak < 4 && (
                      <p className="text-xs text-amber-400 font-semibold mt-1">
                        Noch {4 - streak} {4 - streak === 1 ? "Woche" : "Wochen"} bis 2.5x
                      </p>
                    )}
                    {streak === 0 && (
                      <NavLink to="/dashboard/booking">
                        <Button size="sm" variant="outline" className="mt-3 h-7 text-xs">
                          Jetzt buchen
                        </Button>
                      </NavLink>
                    )}
                  </div>

                  {/* Multiplier progress bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1x</span><span>1.5x</span><span>2x</span><span>2.5x</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          streak >= 4 ? "bg-orange-400" : streak >= 2 ? "bg-amber-400" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(100, (Math.min(streak, 4) / 4) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {Math.round(100 * streakMultiplier)} Punkte / Stunde aktuell
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      Benachrichtigungen
                      {notifications.length > 0 && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{notifications.length}</Badge>
                      )}
                    </h2>
                    {notifications.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-muted-foreground"
                        onClick={() => markAllReadMutation.mutate()}>
                        Alle lesen
                      </Button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Keine neuen Benachrichtigungen.</p>
                  ) : (
                    <ul className="space-y-1">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <button
                            className="w-full text-left flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              markNotificationRead.mutate(n.id);
                              if (n.cta_url) navigate(n.cta_url);
                            }}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                              {notificationIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{n.title}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{n.message}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* KI Skill Card */}
              {skillValue > 0 && (
                <Card className={`border ${skillInfo.border}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-bold flex items-center gap-1.5">
                        <span>{skillInfo.emoji}</span> KI-Skill
                      </h2>
                      {features.p2g_enabled && (
                        <NavLink to="/dashboard/p2g-points">
                          <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2">
                            Details <ChevronRight className="w-3 h-3 ml-0.5" />
                          </Button>
                        </NavLink>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full ${skillInfo.bg} border-2 ${skillInfo.border} ring-4 ${skillInfo.ring} flex items-center justify-center shrink-0`}>
                        <span className={`text-xl font-bold ${skillInfo.color}`}>{skillValue.toFixed(1)}</span>
                      </div>
                      <div>
                        <p className={`text-base font-bold ${skillInfo.color}`}>{skillInfo.label}</p>
                        <p className="text-xs text-muted-foreground">KI-basiert · Skala 0–10</p>
                        {skillStats?.ai_rank && (
                          <p className="text-xs text-primary font-semibold mt-1">Rang #{skillStats.ai_rank}</p>
                        )}
                      </div>
                    </div>
                    {/* Skill bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>0</span><span>5</span><span>10</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${skillInfo.bg}`}
                          style={{ width: `${Math.min(100, (skillValue / 10) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
