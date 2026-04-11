import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClubAuth } from "@/hooks/useClubAuth";
import { useClubQuota } from "@/hooks/useClubQuota";
import { CalendarDays, Users, Settings, Building2, Clock, TrendingUp, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export default function ClubDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { club, clubId, courtName, locationName, primaryAssignment, roleInClub, isManager, assignments } = useClubAuth();
  const { summary, remainingFormatted, allowanceFormatted, hasQuotaAvailable } = useClubQuota(
    clubId,
    primaryAssignment?.court_id ?? null,
    primaryAssignment?.monthly_free_minutes ?? 2400,
    user?.id // Legacy fallback
  );

  const quickActions = [
    {
      title: "Mitglieder buchen",
      description: "Buchung für Vereinsmitglieder erstellen",
      icon: Users,
      href: "/club/bookings",
      variant: "default" as const,
    },
    {
      title: "Kalender ansehen",
      description: "Auslastung und Buchungen im Überblick",
      icon: CalendarDays,
      href: "/club/calendar",
      variant: "outline" as const,
    },
    {
      title: "Court Features",
      description: "Ausstattung und Features bearbeiten",
      icon: Settings,
      href: "/club/court",
      variant: "outline" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {club?.name ?? courtName}
              </h1>
              {roleInClub && (
                <Badge variant={isManager ? "default" : "secondary"} className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {roleInClub === 'manager' ? 'Manager' : 'Staff'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{locationName}</p>
          </div>
        </div>
      </div>

      {/* Club Info (if available) */}
      {club?.description && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">{club.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {club ? "Club-Kontingent" : "Monatskontingent"}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingFormatted}</div>
            <p className="text-xs text-muted-foreground">
              von {allowanceFormatted} verfügbar
            </p>
            <Progress 
              value={100 - summary.percentUsed} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diesen Monat genutzt</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(summary.minutesUsed / 60)}h {summary.minutesUsed % 60}min
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.percentUsed}% des Kontingents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hasQuotaAvailable ? "text-green-600" : "text-red-600"}`}>
              {hasQuotaAvailable ? "Aktiv" : "Kontingent erschöpft"}
            </div>
            <p className="text-xs text-muted-foreground">
              Reset: Monatlich (1. des Monats)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Court Assignments (if multiple) */}
      {assignments.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zugewiesene Courts</CardTitle>
            <CardDescription>Alle Courts, die eurem Club zugewiesen sind</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div 
                  key={assignment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{assignment.court?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {assignment.court?.location?.name}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {Math.floor(assignment.monthly_free_minutes / 60)}h/Monat
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {quickActions.map((action) => (
          <Card 
            key={action.href}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => navigate(action.href)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{action.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {action.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Info Banner */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
        <CardContent className="flex items-center gap-4 py-4">
          <Building2 className="h-8 w-8 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Willkommen im Club Panel
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {club 
                ? `Verwalten Sie Buchungen für ${club.name} und behalten Sie euer gemeinsames Kontingent im Blick.`
                : "Hier können Sie Buchungen für Ihre Vereinsmitglieder vornehmen und die Auslastung Ihres Courts verwalten."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
