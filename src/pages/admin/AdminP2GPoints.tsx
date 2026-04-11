import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Users, CheckCircle, Settings, Package, Trophy } from "lucide-react";
import { P2GDashboardTab } from "@/components/admin/p2g/P2GDashboardTab";
import { P2GWalletsTab } from "@/components/admin/p2g/P2GWalletsTab";
import { P2GApprovalsTab } from "@/components/admin/p2g/P2GApprovalsTab";
import { P2GDefinitionsTab } from "@/components/admin/p2g/P2GDefinitionsTab";
import { P2GRedemptionsTab } from "@/components/admin/p2g/P2GRedemptionsTab";
import { P2GExpertLevelsTab } from "@/components/admin/p2g/P2GExpertLevelsTab";

const TABS = [
  { id: "dashboard", label: "Übersicht", icon: Coins },
  { id: "wallets", label: "Benutzer-Wallets", icon: Users },
  { id: "approvals", label: "Freigaben", icon: CheckCircle },
  { id: "definitions", label: "Rewards", icon: Settings },
  { id: "expert-levels", label: "Expert Levels", icon: Trophy },
  { id: "redemptions", label: "Einlösungen", icon: Package },
] as const;

type TabId = typeof TABS[number]["id"];

export default function AdminP2GPoints() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "dashboard";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabId);
    setSearchParams({ tab: value });
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>P2G Points | Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-6 h-6 text-primary" />
            P2G Points
          </h1>
          <p className="text-muted-foreground">
            Credits, Wallets, Freigaben und Reward-Definitionen verwalten
          </p>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-background"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <P2GDashboardTab />
          </TabsContent>

          <TabsContent value="wallets" className="mt-0">
            <P2GWalletsTab />
          </TabsContent>

          <TabsContent value="approvals" className="mt-0">
            <P2GApprovalsTab />
          </TabsContent>

          <TabsContent value="definitions" className="mt-0">
            <P2GDefinitionsTab />
          </TabsContent>

          <TabsContent value="expert-levels" className="mt-0">
            <P2GExpertLevelsTab />
          </TabsContent>

          <TabsContent value="redemptions" className="mt-0">
            <P2GRedemptionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
