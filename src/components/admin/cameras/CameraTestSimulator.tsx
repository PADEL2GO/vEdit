import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Play, Loader2, CheckCircle, AlertCircle, Zap } from "lucide-react";

interface Court {
  id: string;
  name: string;
  location_id: string;
  locations?: { name: string };
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

interface CameraApiKey {
  id: string;
  name: string;
  location_id: string;
  locations?: { name: string };
}

// Generate random AI score between min and max
function randomScore(min = 40, max = 95): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate mock match analysis data
function generateMockAnalysis(userId: string, team: number, aiScore: number) {
  return {
    user_id: userId,
    team,
    ai_score: aiScore,
    match_overview: {
      total_rallies: Math.floor(Math.random() * 100) + 80,
      total_shots: Math.floor(Math.random() * 800) + 600,
      time_in_play_seconds: Math.floor(Math.random() * 1800) + 1200,
      avg_shots_per_rally: Math.round((Math.random() * 5 + 6) * 10) / 10,
      longest_rally_shots: Math.floor(Math.random() * 20) + 10,
    },
    serve_performance: {
      accuracy_in_percent: Math.floor(Math.random() * 30) + 55,
      distribution: { wide: 35, body: 40, t: 25 },
      speed_avg_kmh: Math.floor(Math.random() * 20) + 75,
      speed_max_kmh: Math.floor(Math.random() * 30) + 100,
    },
    stroke_performance: {
      accuracy_in_percent: Math.floor(Math.random() * 25) + 55,
      distribution: { 
        forehand: Math.floor(Math.random() * 15) + 35, 
        backhand: Math.floor(Math.random() * 15) + 25, 
        volley: Math.floor(Math.random() * 10) + 15, 
        lob: Math.floor(Math.random() * 10) + 5 
      },
      uncovered_areas_percent: Math.floor(Math.random() * 15) + 5,
    },
    movement: {
      total_distance_meters: Math.floor(Math.random() * 1500) + 1500,
      zone_time: { 
        net: Math.floor(Math.random() * 20) + 25, 
        mid: Math.floor(Math.random() * 20) + 35, 
        baseline: Math.floor(Math.random() * 15) + 15 
      },
      coverage_vertical_percent: Math.floor(Math.random() * 20) + 70,
      coverage_horizontal_percent: Math.floor(Math.random() * 20) + 70,
    },
  };
}

export function CameraTestSimulator() {
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>("");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(["", "", "", ""]);
  const [testApiKey, setTestApiKey] = useState("");
  const [team1Score, setTeam1Score] = useState(6);
  const [team2Score, setTeam2Score] = useState(4);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [simulationStep, setSimulationStep] = useState<string>("");

  // Fetch API keys with location info
  const { data: apiKeys } = useQuery({
    queryKey: ["admin-camera-api-keys-for-test"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camera_api_keys")
        .select("id, name, location_id, locations(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as CameraApiKey[];
    },
  });

  // Get selected API key's location_id
  const selectedApiKeyRecord = apiKeys?.find(k => k.id === selectedApiKeyId);
  const selectedLocationId = selectedApiKeyRecord?.location_id;

  // Fetch courts filtered by selected API key's location
  const { data: courts } = useQuery({
    queryKey: ["admin-courts-for-test", selectedLocationId],
    queryFn: async () => {
      let query = supabase
        .from("courts")
        .select("id, name, location_id, locations(name)")
        .eq("is_active", true)
        .order("name");
      
      if (selectedLocationId) {
        query = query.eq("location_id", selectedLocationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Court[];
    },
    enabled: !!selectedLocationId,
  });

  // Reset court selection when API key changes
  useEffect(() => {
    setSelectedCourtId("");
  }, [selectedApiKeyId]);

  // Fetch users with profiles
  const { data: users } = useQuery({
    queryKey: ["admin-users-for-test"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username")
        .not("username", "is", null)
        .order("username")
        .limit(100);
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Run simulation mutation
  const simulateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourtId || !testApiKey) {
        throw new Error("Bitte wähle einen API Key und Court aus");
      }

      const validPlayers = selectedPlayers.filter(p => p);
      if (validPlayers.length < 2) {
        throw new Error("Mindestens 2 Spieler erforderlich");
      }

      // Check for duplicate players
      const uniquePlayers = new Set(validPlayers);
      if (uniquePlayers.size !== validPlayers.length) {
        throw new Error("Jeder Spieler kann nur einmal ausgewählt werden");
      }

      setSimulationStep("Session wird erstellt...");
      const sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Step 1: Start session
      const startResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camera-webhook/start-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Camera-API-Key": testApiKey,
          },
          body: JSON.stringify({
            session_id: sessionId,
            court_id: selectedCourtId,
            players: validPlayers.map((userId, index) => ({
              user_id: userId,
              team: index < 2 ? 1 : 2,
              position: index % 2 === 0 ? "LEFT" : "RIGHT",
            })),
          }),
        }
      );

      if (!startResponse.ok) {
        const error = await startResponse.json();
        throw new Error(`Session Start: ${error.error || "Unbekannter Fehler"}`);
      }

      const startResult = await startResponse.json();

      setSimulationStep("Match wird verarbeitet...");
      
      // Step 2: Complete match with mock data
      const playerAnalyses = validPlayers.map((userId, index) => 
        generateMockAnalysis(userId, index < 2 ? 1 : 2, randomScore())
      );

      const completeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/camera-webhook/match-complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Camera-API-Key": testApiKey,
          },
          body: JSON.stringify({
            session_id: sessionId,
            match_duration_seconds: Math.floor(Math.random() * 1800) + 2400,
            final_score: { team1: team1Score, team2: team2Score },
            player_analyses: playerAnalyses,
          }),
        }
      );

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(`Match Complete: ${error.error || "Unbekannter Fehler"}`);
      }

      const completeResult = await completeResponse.json();
      setSimulationStep("");
      
      return {
        session: startResult,
        completion: completeResult,
      };
    },
    onSuccess: (result) => {
      setSimulationResult(result);
      toast.success(`Test erfolgreich! ${result.completion.players_processed} Spieler verarbeitet`);
    },
    onError: (error) => {
      setSimulationStep("");
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const handlePlayerChange = (index: number, value: string) => {
    const newPlayers = [...selectedPlayers];
    newPlayers[index] = value;
    setSelectedPlayers(newPlayers);
  };

  const selectedCourt = courts?.find(c => c.id === selectedCourtId);

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Match-Simulation (Test-Modus)</CardTitle>
        </div>
        <CardDescription>
          Simuliere Kamera-Daten um die Integration zu testen. Credits werden real vergeben!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Key Selection */}
        <div className="space-y-2">
          <Label>API Key auswählen</Label>
          <Select value={selectedApiKeyId} onValueChange={setSelectedApiKeyId}>
            <SelectTrigger>
              <SelectValue placeholder="API Key wählen" />
            </SelectTrigger>
            <SelectContent>
              {apiKeys?.map((key) => (
                <SelectItem key={key.id} value={key.id}>
                  {key.name} ({key.locations?.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedApiKeyId && (
            <div className="space-y-2">
              <Label className="text-xs">API Key Wert eingeben</Label>
              <Input
                type="password"
                placeholder="p2g_cam_xxxx-xxxx-xxxx-xxxx"
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Du musst den Key-Wert von oben kopieren (wird nur einmal angezeigt)
              </p>
            </div>
          )}
        </div>

        {/* Court Selection */}
        <div className="space-y-2">
          <Label>Court auswählen</Label>
          <Select 
            value={selectedCourtId} 
            onValueChange={setSelectedCourtId}
            disabled={!selectedApiKeyId}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedApiKeyId ? "Court wählen" : "Erst API Key wählen"} />
            </SelectTrigger>
            <SelectContent>
              {courts?.map((court) => (
                <SelectItem key={court.id} value={court.id}>
                  {court.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedApiKeyId && courts?.length === 0 && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Keine aktiven Courts für diese Location
            </p>
          )}
        </div>

        {/* Player Selection */}
        <div className="space-y-3">
          <Label>Spieler zuweisen</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Team 1</p>
              {[0, 1].map((index) => (
                <Select
                  key={index}
                  value={selectedPlayers[index]}
                  onValueChange={(v) => handlePlayerChange(index, v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={`Spieler ${index + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.display_name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Team 2</p>
              {[2, 3].map((index) => (
                <Select
                  key={index}
                  value={selectedPlayers[index]}
                  onValueChange={(v) => handlePlayerChange(index, v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={`Spieler ${index + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.display_name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          </div>
        </div>

        {/* Score Selection */}
        <div className="space-y-3">
          <Label>Endstand</Label>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">Team 1</p>
              <Input
                type="number"
                min={0}
                max={10}
                value={team1Score}
                onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                className="text-center text-lg font-bold"
              />
            </div>
            <span className="text-xl font-bold text-muted-foreground">:</span>
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">Team 2</p>
              <Input
                type="number"
                min={0}
                max={10}
                value={team2Score}
                onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                className="text-center text-lg font-bold"
              />
            </div>
          </div>
        </div>

        {/* Run Button */}
        <Button
          onClick={() => simulateMutation.mutate()}
          disabled={simulateMutation.isPending || !selectedCourtId || !testApiKey || !selectedApiKeyId}
          className="w-full"
        >
          {simulateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {simulationStep || "Simulation läuft..."}
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Match simulieren
            </>
          )}
        </Button>

        {/* Result Display */}
        {simulationResult && (
          <div className="p-4 bg-background rounded-lg border space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <CheckCircle className="h-4 w-4" />
              Simulation erfolgreich!
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Session:</strong> {simulationResult.session.session_id}</p>
              <p><strong>Spieler verarbeitet:</strong> {simulationResult.completion.players_processed}</p>
              <div className="space-y-1">
                <p className="font-medium">Credits vergeben:</p>
                {simulationResult.completion.results?.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded">
                    <span className="font-mono">{r.user_id.substring(0, 8)}...</span>
                    <Badge variant="secondary">+{r.credits_awarded} Credits</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
