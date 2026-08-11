import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClubAuth } from "@/hooks/useClubAuth";
import { useClubQuota } from "@/hooks/useClubQuota";
import { CalendarDays, Users, Settings, Building2, Clock, TrendingUp, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { assignmentSport, useClubCourt } from "@/components/club/ClubCourtContext";
import { SPORT_CHIP_CLASSES } from "@/components/admin/courts/types";

export default function ClubDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation("club");
  const { user } = useAuth();
  const { club, clubId, roleInClub, isManager } = useClubAuth();
  const {
    assignments,
    courtId,
    courtName,
    locationName,
    sport,
    monthlyFreeMinutes,
    canSwitch,
    selectCourt,
  } = useClubCourt();
  const { summary, remainingFormatted, allowanceFormatted, hasQuotaAvailable } = useClubQuota(
    clubId,
    courtId,
    monthlyFreeMinutes,
    user?.id // Legacy fallback
  );

  const quickActions = [
    {
      title: t("dashboard.actions.bookMembersTitle"),
      description: t("dashboard.actions.bookMembersDesc"),
      icon: Users,
      href: "/club/bookings",
      variant: "default" as const,
    },
    {
      title: t("dashboard.actions.calendarTitle"),
      description: t("dashboard.actions.calendarDesc"),
      icon: CalendarDays,
      href: "/club/calendar",
      variant: "outline" as const,
    },
    {
      title: t("dashboard.actions.courtFeaturesTitle"),
      description: t("dashboard.actions.courtFeaturesDesc"),
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
                  {roleInClub === 'manager' ? t("common.roleManager") : t("common.roleStaff")}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground">{locationName}</p>
              {canSwitch && courtName && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm font-medium text-foreground">{courtName}</span>
                  <span
                    className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SPORT_CHIP_CLASSES[sport]}`}
                  >
                    {t(`common.sport.${sport}`)}
                  </span>
                </>
              )}
            </div>
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
              {club ? t("dashboard.quotaClub") : t("dashboard.quotaMonthly")}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingFormatted}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.ofAvailable", { value: allowanceFormatted })}
            </p>
            <Progress 
              value={100 - summary.percentUsed} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.usedThisMonth")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {t("dashboard.timeUsed", { hours: Math.floor(summary.minutesUsed / 60), minutes: summary.minutesUsed % 60 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.percentOfQuota", { percent: summary.percentUsed })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.status")}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${hasQuotaAvailable ? "text-green-600" : "text-red-600"}`}>
              {hasQuotaAvailable ? t("dashboard.statusActive") : t("dashboard.statusExhausted")}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.resetInfo")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Court Assignments (if multiple) */}
      {canSwitch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.assignedCourts")}</CardTitle>
            <CardDescription>{t("dashboard.assignedCourtsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignments.map((assignment) => {
                const rowSport = assignmentSport(assignment);
                const isActive = assignment.court_id === courtId;
                return (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => selectCourt(assignment.court_id)}
                    aria-pressed={isActive}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors ${
                      isActive
                        ? "bg-primary/10 ring-1 ring-primary/40"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{assignment.court?.name}</p>
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SPORT_CHIP_CLASSES[rowSport]}`}
                        >
                          {t(`common.sport.${rowSport}`)}
                        </span>
                        {isActive && (
                          <span className="text-[11px] font-semibold text-primary">
                            {t("courtSwitcher.active")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assignment.court?.location?.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {t("dashboard.hoursPerMonth", { hours: Math.floor(assignment.monthly_free_minutes / 60) })}
                    </Badge>
                  </button>
                );
              })}
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
              {t("dashboard.welcomeTitle")}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {club
                ? t("dashboard.welcomeWithClub", { clubName: club.name })
                : t("dashboard.welcomeWithoutClub")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
