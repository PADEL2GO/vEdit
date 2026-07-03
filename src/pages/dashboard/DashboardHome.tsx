import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import {
  Coins,
  Calendar,
  CalendarDays,
  ShoppingBag,
  ClipboardList,
  MapPin,
  ArrowRight,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArticleFeed } from "@/components/news/ArticleFeed";
import { useAuth } from "@/hooks/useAuth";
import { useAccountData } from "@/hooks/useAccountData";
import { usePointsValue } from "@/hooks/usePointsValue";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useNextBooking, useUpcomingEvents } from "@/hooks/useDashboardSummary";

interface QuickAction {
  key: string;
  label: string;
  icon: LucideIcon;
  to: string;
}

const DashboardHome = () => {
  const { t, i18n } = useTranslation("dashboard");
  const dateLocale = i18n.language === "en" ? enUS : de;
  const numberLocale = i18n.language === "en" ? "en-US" : "de-DE";

  const { user } = useAuth();
  const { profile, wallet } = useAccountData(user);
  const { centsPerPoint } = usePointsValue();
  const { canSee } = useFeatureToggles();
  const { data: nextBooking } = useNextBooking(user?.id);
  const { data: upcomingEvents } = useUpcomingEvents(3);

  const showMarketplace = canSee("marketplace");
  const showEvents = canSee("events");

  const displayName =
    profile?.display_name || profile?.username || t("meinP2g.playerFallback");

  const totalCredits = (wallet?.play_credits || 0) + (wallet?.reward_credits || 0);
  const balanceWorthEuro = ((totalCredits * centsPerPoint) / 100).toFixed(2);

  const nextBookingLocation = (nextBooking?.location as any)?.name as string | undefined;
  const nextBookingCity = (nextBooking?.location as any)?.city as string | undefined;
  const nextBookingCourt = (nextBooking?.court as any)?.name as string | undefined;

  const quickActions: QuickAction[] = [
    { key: "book", label: t("meinP2g.quickActions.book"), icon: Calendar, to: "/dashboard/booking" },
    ...(showMarketplace
      ? [{ key: "marketplace", label: t("meinP2g.quickActions.marketplace"), icon: ShoppingBag, to: "/dashboard/marketplace" }]
      : []),
    ...(showEvents
      ? [{ key: "events", label: t("meinP2g.quickActions.events"), icon: CalendarDays, to: "/dashboard/events" }]
      : []),
    { key: "myBookings", label: t("meinP2g.quickActions.myBookings"), icon: ClipboardList, to: "/dashboard/booking" },
  ];

  const events = upcomingEvents ?? [];

  return (
    <DashboardLayout>
      <Helmet>
        <title>{t("home.meta.title")}</title>
      </Helmet>

      <div className="container mx-auto max-w-5xl px-4 py-6 md:py-8 space-y-6">
        {/* 1) Greeting + points hero */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/15 via-card/60 to-card/40 backdrop-blur-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
          />
          <CardContent className="relative p-6 md:p-8">
            <p className="text-sm text-muted-foreground">{t("meinP2g.subtitle")}</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              {t("meinP2g.greeting", { name: displayName })}
            </h1>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("meinP2g.points.label")}
                </p>
                <div className="mt-1 flex items-center gap-2.5">
                  <Coins className="h-7 w-7 shrink-0 text-primary" />
                  <span className="text-4xl font-extrabold tabular-nums text-primary md:text-5xl">
                    {totalCredits.toLocaleString(numberLocale)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t("meinP2g.points.worth", { amount: balanceWorthEuro })}
                </p>
              </div>

              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/p2g-points">
                  {t("meinP2g.points.details")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2) Primary CTA */}
        <Button asChild variant="hero" size="xl" className="w-full">
          <Link to="/dashboard/booking">
            <Calendar className="h-5 w-5" />
            {t("meinP2g.cta.book")}
          </Link>
        </Button>

        {/* 3) Next booking */}
        {nextBooking ? (
          <Link to="/dashboard/booking" className="block">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{t("meinP2g.nextBooking.heading")}</p>
                  <p className="truncate font-semibold">
                    {format(new Date(nextBooking.start_time), "EEE, dd.MM. HH:mm", { locale: dateLocale })}
                  </p>
                  {(nextBookingLocation || nextBookingCourt) && (
                    <p className="truncate text-sm text-muted-foreground">
                      {[nextBookingLocation, nextBookingCity].filter(Boolean).join(", ")}
                      {nextBookingCourt ? ` · ${nextBookingCourt}` : ""}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">{t("meinP2g.nextBooking.empty")}</p>
        )}

        {/* 4) Quick actions */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.key}
              to={action.to}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-border/50 bg-card/50 p-4 text-center backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/70 active:scale-[0.98]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* 5) News */}
        <ArticleFeed surface="logged_in" placement="dashboard" />

        {/* 6) Events preview */}
        {showEvents && events.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <CalendarDays className="h-5 w-5 text-primary" />
                {t("meinP2g.events.heading")}
              </h2>
              <Button asChild variant="link" size="sm" className="text-muted-foreground">
                <Link to="/dashboard/events">
                  {t("meinP2g.events.all")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-colors hover:border-primary/40"
                >
                  {event.image_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-primary/5">
                      <CalendarDays className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 p-4">
                    <h3 className="line-clamp-1 font-semibold">{event.title}</h3>
                    {event.start_at && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        {format(new Date(event.start_at), "EEE, dd.MM. HH:mm", { locale: dateLocale })}
                      </p>
                    )}
                    {event.city && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {event.city}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
