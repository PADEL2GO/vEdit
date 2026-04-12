import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "react-router-dom";
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp, Rocket, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ONBOARDING_POINTS } from "@/lib/bookingCredits";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  to: string;
  cta: string;
  done: boolean;
  bonus: number;
  walletFlag: keyof typeof WALLET_FLAGS | null;
}

const WALLET_FLAGS = {
  profile: "onboarding_profile_credited",
  booking: "onboarding_booking_credited",
  friend:  "onboarding_friend_credited",
} as const;

interface OnboardingChecklistProps {
  hasDisplayName: boolean;
  hasAvatar: boolean;
  hasBooking: boolean;
  hasFriend: boolean;
}

const DISMISSED_KEY = "p2g_onboarding_dismissed";

export function OnboardingChecklist({
  hasDisplayName,
  hasAvatar,
  hasBooking,
  hasFriend,
}: OnboardingChecklistProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");
  const [collapsed, setCollapsed] = useState(false);
  const [credited, setCredited] = useState<Record<string, boolean>>({});

  const items: ChecklistItem[] = [
    {
      id: "profile",
      label: "Profil vervollständigen",
      description: "Füge deinen Namen und ein Profilbild hinzu.",
      to: "/account",
      cta: "Zum Profil",
      done: hasDisplayName && hasAvatar,
      bonus: ONBOARDING_POINTS.profile,
      walletFlag: "profile",
    },
    {
      id: "booking",
      label: "Ersten Court buchen",
      description: "Such dir einen Court und buche deine erste Session.",
      to: "/dashboard/booking",
      cta: "Court buchen",
      done: hasBooking,
      bonus: ONBOARDING_POINTS.booking,
      walletFlag: "booking",
    },
    {
      id: "friend",
      label: "Freund hinzufügen",
      description: "Verbinde dich mit Mitspielern in der P2G Community.",
      to: "/dashboard/friends",
      cta: "Freunde finden",
      done: hasFriend,
      bonus: ONBOARDING_POINTS.friend,
      walletFlag: "friend",
    },
    {
      id: "event",
      label: "Event entdecken",
      description: "Schau dir kommende Turniere und Events an.",
      to: "/dashboard/events",
      cta: "Events ansehen",
      done: false,
      bonus: 0,
      walletFlag: null,
    },
  ];

  // Award credits for newly completed steps (frontend-triggered for profile/friend;
  // booking bonus is handled server-side in the stripe webhook)
  useEffect(() => {
    if (!user) return;

    const awardOnboarding = async (flag: typeof WALLET_FLAGS[keyof typeof WALLET_FLAGS], points: number, label: string) => {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("play_credits, lifetime_credits")
        .eq("user_id", user.id)
        .maybeSingle();

      const { error } = await supabase
        .from("wallets")
        .upsert({
          user_id: user.id,
          play_credits: (wallet?.play_credits ?? 0) + points,
          lifetime_credits: (wallet?.lifetime_credits ?? 0) + points,
          [flag]: true,
        }, { onConflict: "user_id" });

      if (!error) {
        setCredited(prev => ({ ...prev, [flag]: true }));
        toast.success(`+${points} Punkte`, { description: `${label} abgeschlossen!` });
        queryClient.invalidateQueries({ queryKey: ["account-data"] });
      }
    };

    const checkAndAward = async () => {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("onboarding_profile_credited, onboarding_booking_credited, onboarding_friend_credited")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet) return;

      if (hasDisplayName && hasAvatar && !wallet.onboarding_profile_credited) {
        await awardOnboarding("onboarding_profile_credited", ONBOARDING_POINTS.profile, "Profil vervollständigt");
      }
      if (hasFriend && !wallet.onboarding_friend_credited) {
        await awardOnboarding("onboarding_friend_credited", ONBOARDING_POINTS.friend, "Ersten Freund hinzugefügt");
      }

      setCredited({
        onboarding_profile_credited: wallet.onboarding_profile_credited ?? false,
        onboarding_booking_credited: wallet.onboarding_booking_credited ?? false,
        onboarding_friend_credited:  wallet.onboarding_friend_credited  ?? false,
      });
    };

    checkAndAward();
  }, [user, hasDisplayName, hasAvatar, hasBooking, hasFriend]);

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;
  const progress = Math.round((completedCount / items.length) * 100);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="rounded-2xl bg-card border border-primary/20 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Willkommen bei PADEL2GO!</p>
              <p className="text-xs text-muted-foreground">
                {allDone
                  ? "Du bist startklar 🎉"
                  : `${completedCount} von ${items.length} erledigt`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-medium text-primary">{progress}%</span>
            </div>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setCollapsed(c => !c)}>
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Checklist */}
        <AnimatePresence>
          {!collapsed && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="divide-y divide-border/50"
            >
              {items.map((item) => {
                const alreadyCredited = item.walletFlag
                  ? (credited[WALLET_FLAGS[item.walletFlag]] ?? false)
                  : false;

                return (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between gap-4 px-5 py-3 transition-colors ${
                      item.done ? "opacity-50" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {item.done ? (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${item.done ? "line-through" : ""}`}>
                          {item.label}
                        </p>
                        {!item.done && (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        )}
                        {item.bonus > 0 && (
                          <p className={`text-xs font-semibold flex items-center gap-1 mt-0.5 ${
                            alreadyCredited ? "text-muted-foreground line-through" : "text-primary"
                          }`}>
                            <Coins className="w-3 h-3" />
                            +{item.bonus} Punkte
                            {alreadyCredited && " (bereits erhalten)"}
                          </p>
                        )}
                      </div>
                    </div>
                    {!item.done && (
                      <NavLink to={item.to} className="shrink-0">
                        <Button variant="outline" size="sm" className="text-xs h-7 px-3">
                          {item.cta}
                        </Button>
                      </NavLink>
                    )}
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        {allDone && !collapsed && (
          <div className="px-5 py-3 text-center">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleDismiss}>
              Checkliste ausblenden
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
