import { motion } from "framer-motion";
import { Calendar, Share2, Trophy, Flame, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";

interface QuickEarnTile {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  points: string;
  link: string;
  gradient: string;
  iconColor: string;
}

const quickEarnTiles: QuickEarnTile[] = [
  {
    id: "booking",
    title: "Buchungs-Payback",
    description: "5% Cashback auf jede Buchung",
    icon: Calendar,
    points: "5% Payback",
    link: "/dashboard/booking",
    gradient: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-500",
  },
  {
    id: "daily-login",
    title: "Tägliches Login",
    description: "Jeden Tag einloggen = Credits",
    icon: Flame,
    points: "+5 Credits",
    link: "/dashboard/p2g-points",
    gradient: "from-orange-500/20 to-orange-600/10",
    iconColor: "text-orange-500",
  },
  {
    id: "social",
    title: "Social Media Tag",
    description: "Tagge @padel2go auf Instagram",
    icon: Share2,
    points: "+30 Credits",
    link: "/dashboard/p2g-points",
    gradient: "from-pink-500/20 to-purple-600/10",
    iconColor: "text-pink-500",
  },
];

interface QuickEarnTilesProps {
  isGuest?: boolean;
}

export function QuickEarnTiles({ isGuest = false }: QuickEarnTilesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          So verdienst du Credits
        </h2>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {quickEarnTiles.map((tile, index) => (
          <motion.div
            key={tile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <NavLink to={isGuest ? "/auth" : tile.link} className="block h-full">
              <Card className={`h-full border-0 bg-gradient-to-br ${tile.gradient} hover:scale-[1.02] transition-transform cursor-pointer`}>
                <CardContent className="p-4">
                  <div className="flex flex-col h-full">
                    <div className={`w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center mb-3`}>
                      <tile.icon className={`h-5 w-5 ${tile.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{tile.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3 flex-1">
                      {tile.description}
                    </p>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${tile.iconColor} bg-background/50 w-fit`}>
                      <Coins className="h-3 w-3" />
                      {tile.points}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </NavLink>
          </motion.div>
        ))}
      </div>

      {/* Streak Bonus Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-0 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                <Trophy className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Wochen-Streak Bonus</h3>
                <p className="text-xs text-muted-foreground">
                  Buche jede Woche und erhalte extra Credits: 3 Wochen = +25, 5 Wochen = +50, 10 Wochen = +100
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
