import { useState } from "react";
import { Bell, Check, CheckCheck, X, ExternalLink, UserCheck, UserX, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useFriendships } from "@/hooks/useFriendships";
import { cn } from "@/lib/utils";

// Notification type icons/colors
const notificationConfig: Record<string, { icon: string; color: string }> = {
  friend_request_received: { icon: "👋", color: "bg-blue-500/20 text-blue-400" },
  friend_request_accepted: { icon: "🤝", color: "bg-green-500/20 text-green-400" },
  booking_confirmed: { icon: "✅", color: "bg-primary/20 text-primary" },
  booking_reminder: { icon: "⏰", color: "bg-orange-500/20 text-orange-400" },
  reward_earned: { icon: "🎉", color: "bg-yellow-500/20 text-yellow-400" },
  level_up: { icon: "🚀", color: "bg-purple-500/20 text-purple-400" },
  invite_received: { icon: "📩", color: "bg-cyan-500/20 text-cyan-400" },
  match_invite: { icon: "🎾", color: "bg-pink-500/20 text-pink-400" },
  admin_broadcast: { icon: "📢", color: "bg-primary/20 text-primary" },
  // Lobby notifications
  lobby_member_joined: { icon: "👤", color: "bg-blue-500/20 text-blue-400" },
  lobby_member_paid: { icon: "💰", color: "bg-green-500/20 text-green-400" },
  lobby_full: { icon: "🎾", color: "bg-primary/20 text-primary" },
  lobby_spot_opened: { icon: "🔓", color: "bg-orange-500/20 text-orange-400" },
  lobby_cancelled: { icon: "❌", color: "bg-destructive/20 text-destructive" },
  default: { icon: "🔔", color: "bg-muted text-muted-foreground" },
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigate: (url: string | null) => void;
  onAcceptFriendRequest?: (friendshipId: string) => void;
  onDeclineFriendRequest?: (friendshipId: string) => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onNavigate,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  isAccepting,
  isDeclining
}: NotificationItemProps) {
  const config = notificationConfig[notification.type] || notificationConfig.default;
  const isUnread = !notification.read_at;
  const isFriendRequest = notification.type === "friend_request_received";
  const friendshipId = notification.entity_id;

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
    if (notification.cta_url) {
      onNavigate(notification.cta_url);
    }
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (friendshipId && onAcceptFriendRequest) {
      onAcceptFriendRequest(friendshipId);
      onMarkAsRead(notification.id);
    }
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (friendshipId && onDeclineFriendRequest) {
      onDeclineFriendRequest(friendshipId);
      onMarkAsRead(notification.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer",
        isUnread 
          ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
          : "bg-card border-border/50 hover:bg-muted/50"
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {isUnread && (
        <span className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0", config.color)}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "text-sm font-medium truncate",
            isUnread ? "text-foreground" : "text-muted-foreground"
          )}>
            {notification.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: de })}
          </p>

          {/* Friend Request Actions */}
          {isFriendRequest && isUnread && friendshipId && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs"
                onClick={handleAccept}
                disabled={isAccepting || isDeclining}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                {isAccepting ? "..." : "Annehmen"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={handleDecline}
                disabled={isAccepting || isDeclining}
              >
                <UserX className="w-3.5 h-3.5 mr-1" />
                {isDeclining ? "..." : "Ablehnen"}
              </Button>
            </div>
          )}
        </div>

        {/* CTA indicator */}
        {notification.cta_url && !isFriendRequest && (
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        )}
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"accept" | "decline" | null>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteAll } = useNotifications();
  const { acceptRequest, declineRequest } = useFriendships();

  const handleAcceptFriendRequest = async (friendshipId: string) => {
    setProcessingId(friendshipId);
    setProcessingAction("accept");
    try {
      await acceptRequest(friendshipId);
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleDeclineFriendRequest = async (friendshipId: string) => {
    setProcessingId(friendshipId);
    setProcessingAction("decline");
    try {
      await declineRequest(friendshipId);
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleNavigate = (url: string | null) => {
    if (url) {
      setOpen(false);
      // Handle internal vs external URLs
      if (url.startsWith("/")) {
        navigate(url);
      } else {
        window.open(url, "_blank");
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative rounded-full px-3 border border-border/50 bg-background/60 backdrop-blur-xl hover:bg-primary/10 hover:text-primary"
        >
          <Bell className="w-4 h-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center px-1"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Benachrichtigungen
              {unreadCount > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {unreadCount} neu
                </span>
              )}
            </SheetTitle>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={() => markAllAsRead()}
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Alle lesen
                </Button>
              )}
              {notifications.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Alle löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Alle Benachrichtigungen löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Alle Benachrichtigungen werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteAll()}
                      >
                        Alle löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/50 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              // Empty state
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">Keine Benachrichtigungen</h3>
                <p className="text-xs text-muted-foreground">
                  Hier erscheinen deine Benachrichtigungen
                </p>
              </div>
            ) : (
              // Notification list
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onNavigate={handleNavigate}
                    onAcceptFriendRequest={handleAcceptFriendRequest}
                    onDeclineFriendRequest={handleDeclineFriendRequest}
                    isAccepting={processingId === notification.entity_id && processingAction === "accept"}
                    isDeclining={processingId === notification.entity_id && processingAction === "decline"}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
