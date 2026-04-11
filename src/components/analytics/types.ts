export interface MatchOverview {
  total_rallies: number;
  total_shots: number;
  time_in_play_seconds: number;
  avg_shots_per_rally: number;
  avg_rally_duration_seconds: number;
  longest_rally_shots: number;
  trends: {
    last_match: { rallies: number; time: number; avg_duration: number };
    last_10: { rallies: number; time: number; avg_duration: number };
    season: { rallies: number; time: number; avg_duration: number };
    all_time: { rallies: number; time: number; avg_duration: number };
  };
}

export interface ServePerformance {
  accuracy_in_percent: number;
  accuracy_out_percent: number;
  distribution: { wide: number; body: number; t: number };
  speed_avg_kmh: number;
  speed_min_kmh: number;
  speed_max_kmh: number;
}

export interface StrokePerformance {
  accuracy_in_percent: number;
  accuracy_out_percent: number;
  distribution: { forehand: number; backhand: number; volley: number; lob: number };
  uncovered_areas_percent: number;
  pair_shots_percent: number;
}

export interface MovementStats {
  total_distance_meters: number;
  zone_time: { net: number; mid: number; baseline: number };
  coverage_vertical_percent: number;
  coverage_horizontal_percent: number;
}

export interface TeamShape {
  tilt_vertical_percent: number;
  tilt_horizontal_percent: number;
  tilt_direction: string;
}

export interface PlayerAnalyticsData {
  match_overview: MatchOverview;
  serve_performance: ServePerformance;
  stroke_performance: StrokePerformance;
  movement: MovementStats;
  team_shape: TeamShape;
}
