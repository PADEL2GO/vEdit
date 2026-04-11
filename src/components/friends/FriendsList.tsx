import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MoreHorizontal, UserMinus, Trophy, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFriendships, Friend } from "@/hooks/useFriendships";
import { FriendProfileCard } from "./FriendProfileCard";
import { getExpertLevel, getExpertLevelEmoji } from "@/lib/expertLevels";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

function FriendCard({ friend, onOpenProfile }: { friend: Friend; onOpenProfile: (username: string) => void }) {
  const { removeFriend, isRemovingFriend } = useFriendships();

  const initials = friend.displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || friend.username?.[0]?.toUpperCase() || "?";

  const handleCardClick = () => {
    if (friend.username) {
      onOpenProfile(friend.username);
    }
  };

  // Get expert level from play credits
  const expertLevel = getExpertLevel(friend.playCredits);
  const expertEmoji = getExpertLevelEmoji(expertLevel.name);

  // Get gradient classes for border
  const getBorderGradientClass = (gradient: string) => {
    // Map gradient strings to actual border classes
    if (gradient.includes("zinc")) return "border-zinc-400/50";
    if (gradient.includes("amber") || gradient.includes("orange")) return "border-amber-400/50";
    if (gradient.includes("blue") || gradient.includes("cyan")) return "border-blue-400/50";
    if (gradient.includes("lime") || gradient.includes("green")) return "border-lime-400/50";
    if (gradient.includes("red")) return "border-orange-400/50";
    if (gradient.includes("purple") || gradient.includes("pink")) return "border-purple-400/50";
    if (gradient.includes("violet")) return "border-cyan-400/50";
    if (gradient.includes("yellow")) return "border-yellow-400/50";
    return "border-border/50";
  };

  const getAvatarRingClass = (gradient: string) => {
    if (gradient.includes("zinc")) return "ring-zinc-400/60";
    if (gradient.includes("amber") || gradient.includes("orange")) return "ring-amber-400/60";
    if (gradient.includes("blue") || gradient.includes("cyan")) return "ring-blue-400/60";
    if (gradient.includes("lime") || gradient.includes("green")) return "ring-lime-400/60";
    if (gradient.includes("red")) return "ring-orange-400/60";
    if (gradient.includes("purple") || gradient.includes("pink")) return "ring-purple-400/60";
    if (gradient.includes("violet")) return "ring-cyan-400/60";
    if (gradient.includes("yellow")) return "ring-yellow-400/60";
    return "ring-primary/30";
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border-2 bg-card transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.01] cursor-pointer",
        getBorderGradientClass(expertLevel.gradient)
      )}
    >
      {/* Avatar - Clickable with Expert Level ring */}
      <button 
        onClick={handleCardClick} 
        className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
      >
        <Avatar 
          className={cn(
            "w-12 h-12 ring-2 cursor-pointer transition-all hover:ring-4",
            getAvatarRingClass(expertLevel.gradient)
          )}
        >
          <AvatarImage src={friend.avatarUrl || undefined} alt={friend.displayName || friend.username || "User"} />
          <AvatarFallback className="bg-muted text-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Info - Clickable */}
      <button onClick={handleCardClick} className="flex-1 min-w-0 text-left focus:outline-none group">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {friend.displayName || friend.username || "Unbekannt"}
          </h3>
          {/* Expert Level Badge */}
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs px-1.5 py-0 h-5 shrink-0",
              expertLevel.textColor,
              expertLevel.borderColor
            )}
          >
            {expertEmoji} {expertLevel.name}
          </Badge>
        </div>
        {friend.username && friend.displayName && (
          <p className="text-xs text-muted-foreground">@{friend.username}</p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Freunde seit {formatDistanceToNow(new Date(friend.friendsSince), { locale: de })}
        </p>
      </button>

      {/* Stats - Skill Level + W/L compact */}
      <div className="hidden sm:flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Skill</span>
          <span className="text-sm font-bold text-primary">{friend.skillLevel.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{friend.playCredits.toLocaleString()} Credits</span>
        </div>
      </div>

      {/* Actions - Stop propagation to prevent card click */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              className="text-destructive" 
              onClick={() => removeFriend(friend.friendshipId)} 
              disabled={isRemovingFriend}
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Freund entfernen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function FriendsList() {
  const { friends, isLoadingFriends } = useFriendships();
  const [selectedFriendUsername, setSelectedFriendUsername] = useState<string | null>(null);

  // Additional frontend deduplication as safety net
  const uniqueFriends = friends.filter((friend, index, self) =>
    index === self.findIndex(f => f.id === friend.id)
  );

  const handleOpenProfile = (username: string) => {
    setSelectedFriendUsername(username);
  };

  const handleCloseProfile = () => {
    setSelectedFriendUsername(null);
  };

  if (isLoadingFriends) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-border/50 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (uniqueFriends.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Users className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Noch keine Freunde</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Suche nach Spielern und sende Freundschaftsanfragen, um dein Netzwerk aufzubauen.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {uniqueFriends.length} {uniqueFriends.length === 1 ? "Freund" : "Freunde"}
          </h2>
        </div>
        {uniqueFriends.map((friend) => (
          <FriendCard 
            key={friend.id} 
            friend={friend} 
            onOpenProfile={handleOpenProfile}
          />
        ))}
      </div>

      {/* Friend Profile Card Drawer */}
      <FriendProfileCard
        username={selectedFriendUsername || ""}
        isOpen={!!selectedFriendUsername}
        onClose={handleCloseProfile}
      />
    </>
  );
}
