import { motion } from "framer-motion";
import { Coins, Zap, Award, Trophy, Calendar, ShoppingBag, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Wallet } from "./types";

interface AccountRewardsCardProps {
  wallet: Wallet;
}

export function AccountRewardsCard({ wallet }: AccountRewardsCardProps) {
  const redeemableCredits = wallet.play_credits + wallet.reward_credits;

  const formatLastGameDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: de });
    } catch {
      return null;
    }
  };

  const lastGameDateFormatted = formatLastGameDate(wallet.last_game_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Coins className="w-5 h-5 text-primary" /> P2G Points
      </h2>
      
      {/* Einlösbares Guthaben */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 rounded-xl p-4 mb-4 border border-emerald-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Einlösbar im Marketplace
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Guthaben</p>
            <p className="text-4xl font-bold text-emerald-400">{redeemableCredits}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Coins className="w-7 h-7 text-emerald-400" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-emerald-500/20 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400/70" />
            <div>
              <p className="text-xs text-muted-foreground">Play Points</p>
              <p className="text-sm font-semibold">{wallet.play_credits}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400/70" />
            <div>
              <p className="text-xs text-muted-foreground">Reward Points</p>
              <p className="text-sm font-semibold">{wallet.reward_credits}</p>
            </div>
          </div>
        </div>
        
        {/* Marketplace Link */}
        <div className="mt-4 pt-3 border-t border-emerald-500/20">
          <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link to="/dashboard/marketplace" className="flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Im Marketplace einlösen</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Lifetime Points für Liga */}
      <div className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 rounded-xl p-4 mb-4 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Liga-Ranking
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Gesammelte Points</p>
            <p className="text-4xl font-bold text-amber-400">{wallet.lifetime_credits}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Diese Points zählen für dein Liga-Ranking und werden nie reduziert
        </p>
      </div>

      {/* Letztes Spiel */}
      {(wallet.last_game_credits !== null || wallet.last_game_date !== null) && (
        <div className="bg-secondary/50 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Letztes Spiel</p>
              <div className="flex items-center gap-2">
                {wallet.last_game_credits !== null && (
                  <span className="text-lg font-bold text-primary">
                    +{wallet.last_game_credits} Points
                  </span>
                )}
              </div>
            </div>
            {lastGameDateFormatted && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{lastGameDateFormatted}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kein Spiel noch */}
      {wallet.last_game_credits === null && wallet.last_game_date === null && (
        <div className="bg-secondary/30 rounded-xl p-4 border border-border/50 text-center">
          <Zap className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Noch kein Spiel gespielt</p>
          <p className="text-xs text-muted-foreground/70">Spiele dein erstes Match und verdiene Points!</p>
        </div>
      )}
    </motion.div>
  );
}
