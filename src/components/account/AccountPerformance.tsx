import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { mockPerformance } from "@/lib/mockData";

export function AccountPerformance() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" /> Performance
      </h2>

      {/* Last Game */}
      <div className="bg-secondary/50 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Letztes Spiel</p>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${mockPerformance.lastGame.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {mockPerformance.lastGame.won ? 'Gewonnen' : 'Verloren'}
          </span>
        </div>
        <p className="text-3xl font-bold">
          {mockPerformance.lastGame.score} <span className="text-muted-foreground">-</span> {mockPerformance.lastGame.opponentScore}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{mockPerformance.lastGame.date}</p>
      </div>

      {/* Last 3 Games */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-3">Letzte 3 Spiele</p>
        <div className="flex gap-2">
          {mockPerformance.lastThreeGames.map((game, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className={`flex-1 rounded-xl p-3 text-center ${game.won ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}
            >
              {game.won ? (
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-400" />
              )}
              <p className="text-sm font-medium">{game.score}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-primary">{mockPerformance.winRate}%</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Ø Score</p>
          <p className="text-2xl font-bold">{mockPerformance.avgScore}</p>
        </div>
      </div>
    </motion.div>
  );
}
