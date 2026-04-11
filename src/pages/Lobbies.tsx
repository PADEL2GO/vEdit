import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { addDays } from "date-fns";
import { Users, Plus, Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import DashboardNavigation from "@/components/DashboardNavigation";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { LobbyCard, LobbyFilters, LobbyDetailDrawer } from "@/components/lobby";
import { useLobbies } from "@/hooks/useLobbies";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { LobbyFilters as LobbyFiltersType } from "@/types/lobby";

export default function Lobbies() {
  const navigate = useNavigate();
  const { id: lobbyIdParam } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(lobbyIdParam || null);
  const [drawerOpen, setDrawerOpen] = useState(!!lobbyIdParam);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [userSkillLevel, setUserSkillLevel] = useState<number>(5);

  const [filters, setFilters] = useState<LobbyFiltersType>({
    date_from: new Date().toISOString(),
    date_to: addDays(new Date(), 7).toISOString(),
    only_available: true,
  });

  const { data: lobbies, isLoading, error } = useLobbies(filters);

  // Fetch locations for filter dropdown
  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_online", true);
      if (data) setLocations(data);
    };
    fetchLocations();
  }, []);

  // Fetch user skill level
  useEffect(() => {
    if (!user) return;
    const fetchSkill = async () => {
      const { data } = await supabase
        .from("skill_stats")
        .select("skill_level")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.skill_level) setUserSkillLevel(data.skill_level);
    };
    fetchSkill();
  }, [user]);

  // Handle URL param for lobby detail
  useEffect(() => {
    if (lobbyIdParam) {
      setSelectedLobbyId(lobbyIdParam);
      setDrawerOpen(true);
    }
  }, [lobbyIdParam]);

  const handleDrawerOpenChange = (open: boolean) => {
    setDrawerOpen(open);
    if (!open) {
      setSelectedLobbyId(null);
      // Remove lobby ID from URL if present
      if (lobbyIdParam) {
        navigate("/lobbies", { replace: true });
      }
    }
  };

  const handleLobbyClick = (lobbyId: string) => {
    setSelectedLobbyId(lobbyId);
    setDrawerOpen(true);
  };


  // Main content (without navigation/footer) for Coming Soon overlay
  const mainContent = (
    <main className="min-h-screen pt-24 pb-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Offene Lobbys
            </h1>
            <p className="text-muted-foreground mt-1">
              Finde Mitspieler für dein nächstes Match
            </p>
          </div>
          <Button onClick={() => navigate("/booking")} variant="lime">
            <Plus className="w-4 h-4 mr-2" />
            Court buchen & Lobby erstellen
          </Button>
        </div>

        {/* Filters */}
        <LobbyFilters
          filters={filters}
          onFiltersChange={setFilters}
          locations={locations}
          userSkillLevel={userSkillLevel}
        />

        {/* Content */}
        <div className="mt-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-20 text-destructive">
              Fehler beim Laden der Lobbys
            </div>
          ) : lobbies && lobbies.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lobbies.map((lobby, index) => (
                <div key={lobby.id} onClick={() => handleLobbyClick(lobby.id)}>
                  <LobbyCard lobby={lobby} index={index} />
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Keine passenden Lobbys gefunden
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Es gibt aktuell keine offenen Lobbys, die deinen Filterkriterien
                entsprechen. Erstelle selbst eine Lobby bei deiner nächsten
                Buchung!
              </p>
              <Button onClick={() => navigate("/booking")} variant="lime">
                <Plus className="w-4 h-4 mr-2" />
                Court buchen
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );

  // Auth check
  if (!user) {
    navigate("/auth?redirect=/lobbies");
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Lobbys finden | PADEL2GO</title>
        <meta
          name="description"
          content="Finde offene Padel-Lobbys in deiner Nähe und spiele mit anderen Spielern auf deinem Level."
        />
      </Helmet>

      <DashboardNavigation />

      {mainContent}

      {/* Lobby Detail Drawer */}
      <LobbyDetailDrawer
        lobbyId={selectedLobbyId}
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
      />

      <Footer />
    </>
  );
}
