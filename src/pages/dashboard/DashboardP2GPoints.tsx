import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useP2GPoints } from "@/hooks/useP2GPoints";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";
import { Coins } from "lucide-react";
import { 
  P2GPointsHeaderSimple, 
  SkillLast5Section,
  LastGameCard, 
  MyGamesSection,
  FriendsActivityFeed,
} from "@/components/p2g";

export default function DashboardP2GPoints() {
  const { 
    summary, 
    isSummaryLoading, 
    lastGameData,
    isLastGameLoading,
    matchHistory,
    isSkillsLoading,
  } = useP2GPoints();

  const { p2g_enabled, isLoading: featuresLoading } = useFeatureToggles();
  const { isAdmin } = useAdminAuth();

  const showComingSoon = !featuresLoading && !p2g_enabled && !isAdmin;

  return (
    <DashboardLayout>
      <Helmet>
        <title>P2G Points | Padel2Go</title>
        <meta name="description" content="Sammle P2G Credits durch Buchungen und Matches. Löse sie gegen exklusive Prämien ein." />
      </Helmet>

      {showComingSoon ? (
        <ComingSoonOverlay
          title="P2G Points"
          description="Sammle P2G Credits durch Buchungen und KI-Matches. Löse sie gegen exklusive Prämien ein – bald verfügbar!"
          icon={Coins}
        >
          <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
            <P2GPointsHeaderSimple summary={summary} isLoading={isSummaryLoading} />
            <SkillLast5Section />
          </div>
        </ComingSoonOverlay>
      ) : (
        <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
          <P2GPointsHeaderSimple summary={summary} isLoading={isSummaryLoading} />
          <div className="space-y-6">
            <SkillLast5Section />
            <LastGameCard 
              lastGame={lastGameData?.last_game || null}
              skillLevel={lastGameData?.skill_level || 0}
              isLoading={isLastGameLoading}
            />
            <FriendsActivityFeed />
            <MyGamesSection 
              matchHistory={matchHistory}
              isLoading={isSkillsLoading}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}