import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLobbyByBookingMap } from "@/hooks/useLobbies";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { CreateLobbyDialog, type BookingForLobby } from "./CreateLobbyDialog";

interface LobbyActionButtonProps {
  booking: BookingForLobby;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "lime" | "secondary" | "ghost";
  className?: string;
}

/**
 * Shows "Lobby öffnen" if this booking already has a lobby,
 * otherwise opens the create-lobby dialog.
 */
export function LobbyActionButton({
  booking,
  size = "sm",
  variant = "outline",
  className,
}: LobbyActionButtonProps) {
  const { t } = useTranslation("social");
  const navigate = useNavigate();
  const { data: lobbyMap } = useLobbyByBookingMap();
  const { canSee } = useFeatureToggles();
  const [dialogOpen, setDialogOpen] = useState(false);

  const existing = lobbyMap?.get(booking.id);

  if (existing) {
    return (
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={() => navigate(`/lobbies/${existing.id}`)}
      >
        <ExternalLink className="w-4 h-4 mr-1" />
        {t("lobbyActionButton.openLobby")}
      </Button>
    );
  }

  // Create-lobby entry point stays hidden while the lobbies feature isn't
  // visible to this user (hidden/demo-for-admins-only, per canSee).
  if (!canSee("lobbies")) {
    return null;
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={() => setDialogOpen(true)}
      >
        <Users className="w-4 h-4 mr-1" />
        {t("lobbyActionButton.createLobby")}
      </Button>
      <CreateLobbyDialog
        booking={booking}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
