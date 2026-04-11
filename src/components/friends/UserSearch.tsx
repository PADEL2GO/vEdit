import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, Clock, Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFriendships } from "@/hooks/useFriendships";

interface SearchResult {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function UserSearchResultCard({ result }: { result: SearchResult }) {
  const navigate = useNavigate();
  const { sendRequest, isSendingRequest, useFriendshipStatus } = useFriendships();
  const { data: friendshipStatus, isLoading: isLoadingStatus } = useFriendshipStatus(result.id);

  const initials = result.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || result.username?.[0]?.toUpperCase() || "?";

  const handleProfileClick = () => {
    if (result.username) {
      navigate(`/u/${result.username}`);
    }
  };

  const renderActionButton = () => {
    if (isLoadingStatus) {
      return (
        <Button size="sm" variant="outline" disabled>
          <Loader2 className="w-4 h-4 animate-spin" />
        </Button>
      );
    }

    switch (friendshipStatus?.status) {
      case "accepted":
        return (
          <Button size="sm" variant="outline" className="text-primary border-primary/50" disabled>
            <Users className="w-4 h-4 mr-1" />
            Freund
          </Button>
        );
      case "pending":
        return (
          <Button size="sm" variant="outline" className="text-muted-foreground" disabled>
            <Clock className="w-4 h-4 mr-1" />
            {friendshipStatus.isRequester ? "Angefragt" : "Anfrage erhalten"}
          </Button>
        );
      case "blocked":
        return (
          <Button size="sm" variant="outline" disabled>
            Blockiert
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            variant="lime"
            onClick={(e) => {
              e.stopPropagation();
              sendRequest(result.id);
            }}
            disabled={isSendingRequest}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Hinzufügen
          </Button>
        );
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors">
      {/* Avatar - Clickable */}
      <button onClick={handleProfileClick} className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full">
        <Avatar className="w-12 h-12 border-2 border-muted cursor-pointer hover:border-primary/50 transition-colors">
          <AvatarImage src={result.avatar_url || undefined} alt={result.display_name || result.username || "User"} />
          <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Info - Clickable */}
      <button onClick={handleProfileClick} className="flex-1 min-w-0 text-left focus:outline-none group">
        <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {result.display_name || result.username || "Unbekannt"}
        </h3>
        {result.username && (
          <p className="text-xs text-muted-foreground">@{result.username}</p>
        )}
      </button>

      {renderActionButton()}
    </div>
  );
}

export function UserSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounceValue(query, 300);

  useEffect(() => {
    const searchUsers = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const { data, error } = await supabase.functions.invoke("user-search", {
          body: { query: debouncedQuery },
        });

        if (error) throw error;

        // Filter out current user
        const filteredResults = (data?.users || []).filter(
          (u: SearchResult) => u.id !== user?.id
        );
        setResults(filteredResults);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchUsers();
  }, [debouncedQuery, user?.id]);

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Suche nach Benutzername oder Name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 text-base"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
                <div className="h-8 bg-muted rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.length} Ergebnis{results.length !== 1 ? "se" : ""} gefunden
          </p>
          {results.map((result) => (
            <UserSearchResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : hasSearched ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Keine Ergebnisse</h3>
          <p className="text-xs text-muted-foreground">
            Versuche einen anderen Suchbegriff
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-foreground mb-1">Spieler finden</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Gib mindestens 2 Zeichen ein, um nach Spielern zu suchen
          </p>
        </div>
      )}
    </div>
  );
}
