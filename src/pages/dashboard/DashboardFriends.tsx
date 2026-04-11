import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Users, Clock, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useFriendships } from "@/hooks/useFriendships";
import { FriendsList } from "@/components/friends/FriendsList";
import { FriendRequestsList } from "@/components/friends/FriendRequestsList";
import { UserSearch } from "@/components/friends/UserSearch";

export default function DashboardFriends() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("friends");
  const { pendingReceived } = useFriendships();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background pt-20">
        <div className="container max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Freunde
            </h1>
            <p className="text-muted-foreground mt-1">
              Verwalte deine Freunde und finde neue Spielpartner
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Freunde</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="relative flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Anfragen</span>
                {pendingReceived.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {pendingReceived.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Suchen</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="mt-6">
              <FriendsList />
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <FriendRequestsList />
            </TabsContent>

            <TabsContent value="search" className="mt-6">
              <UserSearch />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}
