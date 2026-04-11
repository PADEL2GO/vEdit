import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, UserPlus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFriendships, Friend } from "@/hooks/useFriendships";

interface InviteFriendsStepProps {
  selectedFriends: string[];
  onSelectionChange: (friendIds: string[]) => void;
  maxInvites?: number;
}

export function InviteFriendsStep({ 
  selectedFriends, 
  onSelectionChange, 
  maxInvites = 3 
}: InviteFriendsStepProps) {
  const { friends, isLoadingFriends } = useFriendships();

  const handleToggle = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      onSelectionChange(selectedFriends.filter((id) => id !== friendId));
    } else if (selectedFriends.length < maxInvites) {
      onSelectionChange([...selectedFriends, friendId]);
    }
  };

  if (isLoadingFriends) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (friends.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            Freunde einladen (optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-2">
            Füge Freunde hinzu, um sie zu Buchungen einzuladen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Freunde einladen (optional)
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {selectedFriends.length}/{maxInvites} ausgewählt
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Ausgewählte Freunde erhalten eine Benachrichtigung und können ihren Anteil separat bezahlen.
        </p>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <AnimatePresence>
            {friends.slice(0, 10).map((friend, index) => {
              const isSelected = selectedFriends.includes(friend.id);
              const isDisabled = !isSelected && selectedFriends.length >= maxInvites;
              
              const initials = friend.displayName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || friend.username?.[0]?.toUpperCase() || "?";

              return (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => !isDisabled && handleToggle(friend.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-lg transition-all cursor-pointer ${
                    isSelected 
                      ? "bg-primary/10 border border-primary/30" 
                      : isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <Checkbox 
                    checked={isSelected}
                    disabled={isDisabled}
                    className="pointer-events-none"
                  />
                  
                  <Avatar className="w-8 h-8 border border-border/50">
                    <AvatarImage src={friend.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {friend.displayName || friend.username || "Unbekannt"}
                    </p>
                    {friend.username && friend.displayName && (
                      <p className="text-xs text-muted-foreground">@{friend.username}</p>
                    )}
                  </div>

                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="p-1 rounded-full bg-primary/20"
                    >
                      <Check className="h-3 w-3 text-primary" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {selectedFriends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="pt-2 mt-2 border-t border-border/50"
          >
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground"
              onClick={() => onSelectionChange([])}
            >
              Auswahl zurücksetzen
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
