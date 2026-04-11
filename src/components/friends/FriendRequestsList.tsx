import { useNavigate } from "react-router-dom";
import { Clock, Check, X, Undo2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFriendships, FriendRequest } from "@/hooks/useFriendships";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

function ReceivedRequestCard({ request }: { request: FriendRequest }) {
  const navigate = useNavigate();
  const { acceptRequest, declineRequest, isAcceptingRequest, isDecliningRequest } = useFriendships();

  const initials = request.displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || request.username?.[0]?.toUpperCase() || "?";

  const handleProfileClick = () => {
    if (request.username) {
      navigate(`/u/${request.username}`);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
      {/* Avatar - Clickable */}
      <button onClick={handleProfileClick} className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full">
        <Avatar className="w-12 h-12 border-2 border-primary/20 cursor-pointer hover:border-primary/50 transition-colors">
          <AvatarImage src={request.avatarUrl || undefined} alt={request.displayName || request.username || "User"} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Info - Clickable */}
      <button onClick={handleProfileClick} className="flex-1 min-w-0 text-left focus:outline-none group">
        <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {request.displayName || request.username || "Unbekannt"}
        </h3>
        {request.username && request.displayName && (
          <p className="text-xs text-muted-foreground">@{request.username}</p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          vor {formatDistanceToNow(new Date(request.createdAt), { locale: de })}
        </p>
      </button>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={() => declineRequest(request.id)}
          disabled={isDecliningRequest || isAcceptingRequest}
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="lime"
          onClick={() => acceptRequest(request.id)}
          disabled={isAcceptingRequest || isDecliningRequest}
        >
          <Check className="w-4 h-4 mr-1" />
          Annehmen
        </Button>
      </div>
    </div>
  );
}

function SentRequestCard({ request }: { request: FriendRequest }) {
  const navigate = useNavigate();
  const { cancelRequest, isCancellingRequest } = useFriendships();

  const initials = request.displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || request.username?.[0]?.toUpperCase() || "?";

  const handleProfileClick = () => {
    if (request.username) {
      navigate(`/u/${request.username}`);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card">
      {/* Avatar - Clickable */}
      <button onClick={handleProfileClick} className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full">
        <Avatar className="w-12 h-12 border-2 border-muted cursor-pointer hover:border-primary/50 transition-colors">
          <AvatarImage src={request.avatarUrl || undefined} alt={request.displayName || request.username || "User"} />
          <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Info - Clickable */}
      <button onClick={handleProfileClick} className="flex-1 min-w-0 text-left focus:outline-none group">
        <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {request.displayName || request.username || "Unbekannt"}
        </h3>
        {request.username && request.displayName && (
          <p className="text-xs text-muted-foreground">@{request.username}</p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Gesendet vor {formatDistanceToNow(new Date(request.createdAt), { locale: de })}
        </p>
      </button>

      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => cancelRequest(request.id)}
        disabled={isCancellingRequest}
      >
        <Undo2 className="w-4 h-4 mr-1" />
        Zurückziehen
      </Button>
    </div>
  );
}

export function FriendRequestsList() {
  const { pendingReceived, pendingSent, isLoadingRequests } = useFriendships();

  if (isLoadingRequests) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-border/50 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
              <div className="h-8 bg-muted rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasAnyRequests = pendingReceived.length > 0 || pendingSent.length > 0;

  if (!hasAnyRequests) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Keine offenen Anfragen</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Hier siehst du eingehende und ausgehende Freundschaftsanfragen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Received Requests */}
      {pendingReceived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Eingegangen ({pendingReceived.length})
          </h2>
          {pendingReceived.map((request) => (
            <ReceivedRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}

      {/* Sent Requests */}
      {pendingSent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Gesendet ({pendingSent.length})
          </h2>
          {pendingSent.map((request) => (
            <SentRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}
