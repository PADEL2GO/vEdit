import { motion } from "framer-motion";
import { Timer, Activity, Target, Footprints, Users, BarChart3, Zap } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { DonutChart } from "./DonutChart";
import { GaugeChart } from "./GaugeChart";
import { CourtHeatmap } from "./CourtHeatmap";
import { RadarCoverage } from "./RadarCoverage";
import { TiltIndicator } from "./TiltIndicator";
import type { PlayerAnalyticsData } from "./types";

interface AnalyticsSectionProps {
  data: PlayerAnalyticsData;
}

export const AnalyticsSection = ({ data }: AnalyticsSectionProps) => {
  const { match_overview, serve_performance, stroke_performance, movement, team_shape } = data;

  return (
    <div className="space-y-6 mt-6">
      {/* Match Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-secondary/20 rounded-xl p-4 border border-border/50"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Match Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard 
            label="Time in Play" 
            value={match_overview.time_in_play_seconds} 
            icon={Timer}
            color="from-blue-500 to-blue-600"
            format="time"
            delay={0}
          />
          <KpiCard 
            label="Total Rallies" 
            value={match_overview.total_rallies} 
            icon={Activity}
            color="from-purple-500 to-purple-600"
            delay={0.1}
          />
          <KpiCard 
            label="Avg Rally Duration" 
            value={match_overview.avg_rally_duration_seconds} 
            suffix="s"
            icon={Timer}
            color="from-teal-500 to-teal-600"
            delay={0.2}
          />
          <KpiCard 
            label="Longest Rally" 
            value={match_overview.longest_rally_shots} 
            suffix=" shots"
            icon={Zap}
            color="from-orange-500 to-orange-600"
            delay={0.3}
          />
        </div>
      </motion.div>

      {/* Serve Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-secondary/20 rounded-xl p-4 border border-border/50"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Serve Performance
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex justify-center">
            <DonutChart value={serve_performance.accuracy_in_percent} label="Serve Accuracy (IN)" />
          </div>
          <div className="bg-secondary/30 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-3">Serve Distribution</p>
            <div className="space-y-2">
              {Object.entries(serve_performance.distribution).map(([zone, pct]) => (
                <div key={zone} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12 capitalize">{zone}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <GaugeChart 
            value={serve_performance.speed_avg_kmh} 
            min={serve_performance.speed_min_kmh} 
            max={serve_performance.speed_max_kmh} 
            label="Serve Speed"
            unit=" km/h"
          />
        </div>
      </motion.div>

      {/* Stroke Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-secondary/20 rounded-xl p-4 border border-border/50"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Stroke Performance
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex justify-center">
            <DonutChart value={stroke_performance.accuracy_in_percent} label="Stroke Accuracy (IN)" color="#22c55e" />
          </div>
          <div className="space-y-3">
            <div className="bg-secondary/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Tactical Pressure</p>
              <p className="text-2xl font-bold text-primary">{stroke_performance.uncovered_areas_percent}%</p>
              <p className="text-xs text-muted-foreground">Shots in uncovered areas</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Team Contribution</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-primary to-lime-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stroke_performance.pair_shots_percent}%` }}
                    transition={{ duration: 1.2, delay: 0.3 }}
                  />
                </div>
                <span className="font-bold">{stroke_performance.pair_shots_percent}%</span>
              </div>
            </div>
          </div>
          <div className="bg-secondary/30 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-3">Stroke Distribution</p>
            <div className="space-y-2">
              {Object.entries(stroke_performance.distribution).map(([type, pct]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 capitalize">{type}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Movement & Coverage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-secondary/20 rounded-xl p-4 border border-border/50"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Footprints className="w-5 h-5 text-primary" />
          Movement & Court Coverage
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <KpiCard 
            label="Distance Covered" 
            value={movement.total_distance_meters} 
            icon={Footprints}
            color="from-cyan-500 to-cyan-600"
            format="distance"
          />
          <CourtHeatmap 
            title="Zone Time Distribution"
            zones={[
              { label: "Net L", percentage: Math.round(movement.zone_time.net / 2) },
              { label: "Net R", percentage: Math.round(movement.zone_time.net / 2) },
              { label: "Mid L", percentage: Math.round(movement.zone_time.mid / 2) },
              { label: "Mid R", percentage: Math.round(movement.zone_time.mid / 2) },
              { label: "Base L", percentage: Math.round(movement.zone_time.baseline / 2) },
              { label: "Base R", percentage: Math.round(movement.zone_time.baseline / 2) },
            ]}
          />
          <RadarCoverage 
            vertical={movement.coverage_vertical_percent} 
            horizontal={movement.coverage_horizontal_percent} 
          />
        </div>
      </motion.div>

      {/* Team Shape */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-secondary/20 rounded-xl p-4 border border-border/50"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Team Shape & Coordination
        </h3>
        <div className="flex justify-center">
          <TiltIndicator 
            vertical={team_shape.tilt_vertical_percent} 
            horizontal={team_shape.tilt_horizontal_percent}
            direction={team_shape.tilt_direction}
          />
        </div>
      </motion.div>
    </div>
  );
};
