import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface UserSuggestion {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface InvitedPlayer {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface PlayerInviteInputProps {
  invitedPlayers: InvitedPlayer[];
  onAddPlayer: (player: InvitedPlayer) => void;
  onRemovePlayer: (userId: string) => void;
  maxPlayers?: number;
  currentUserId: string;
  disabled?: boolean;
}

export function PlayerInviteInput({
  invitedPlayers,
  onAddPlayer,
  onRemovePlayer,
  maxPlayers = 3,
  currentUserId,
  disabled = false,
}: PlayerInviteInputProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchUsers = async (searchQuery: string) => {
    if (searchQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-search?query=${encodeURIComponent(searchQuery)}&limit=10`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Search failed");

      const result = await response.json();
      
      // Filter out already invited players
      const invitedIds = new Set(invitedPlayers.map((p) => p.user_id));
      const filtered = (result.users || []).filter(
        (u: UserSuggestion) => !invitedIds.has(u.user_id)
      );
      
      setSuggestions(filtered);
    } catch (err) {
      console.error("Search error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowDropdown(true);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchUsers(value);
    }, 250);
  };

  const handleSelectUser = (user: UserSuggestion) => {
    onAddPlayer({
      user_id: user.user_id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
    });
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  const canAddMore = invitedPlayers.length < maxPlayers;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <UserPlus className="w-4 h-4" />
        Spieler einladen (max. {maxPlayers})
      </label>

      {/* Invited players badges */}
      {invitedPlayers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {invitedPlayers.map((player) => (
            <Badge
              key={player.user_id}
              variant="secondary"
              className="flex items-center gap-2 py-1.5 px-3"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={player.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {player.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span>@{player.username}</span>
              <button
                type="button"
                onClick={() => onRemovePlayer(player.user_id)}
                className="ml-1 hover:text-destructive transition-colors"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input */}
      {canAddMore && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Username eingeben..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => query.length >= 1 && setShowDropdown(true)}
              className="pl-10"
              disabled={disabled}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
            >
              {suggestions.map((user) => (
                <button
                  key={user.user_id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
                  onClick={() => handleSelectUser(user)}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">@{user.username}</p>
                    {user.display_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.display_name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {showDropdown && query.length >= 1 && !loading && suggestions.length === 0 && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-center text-sm text-muted-foreground"
            >
              Keine Spieler gefunden
            </div>
          )}
        </div>
      )}

      {!canAddMore && (
        <p className="text-sm text-muted-foreground">
          Maximale Anzahl an Einladungen erreicht.
        </p>
      )}
    </div>
  );
}
