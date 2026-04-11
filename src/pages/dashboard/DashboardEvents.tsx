import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardMetricCard from "@/components/dashboard/DashboardMetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Users, ExternalLink, Loader2, PartyPopper } from "lucide-react";
import { format, parseISO, isFuture, isPast } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useFeatureToggles } from "@/hooks/useFeatureToggles";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";
const DashboardEvents = () => {
  const { events_enabled, isLoading: featureLoading } = useFeatureToggles();
  const { isAdmin } = useAdminAuth();

  const { data: events, isLoading } = useQuery({
    queryKey: ["dashboard-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("is_published", true)
        .order("start_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const upcomingEvents = events?.filter(e => e.start_at && isFuture(parseISO(e.start_at))) || [];
  const pastEvents = events?.filter(e => e.start_at && isPast(parseISO(e.start_at))) || [];
  const featuredEvent = events?.find(e => e.featured && e.start_at && isFuture(parseISO(e.start_at)));

  const showComingSoon = !events_enabled && !isAdmin && !featureLoading;

  if (showComingSoon) {
    return (
      <DashboardLayout>
        <ComingSoonOverlay
          title="Events & Community"
          description="Padel-Events mit DJ, Food & Community. Von Day-Drinking Sessions bis zu Partner-Activations – bald verfügbar!"
          icon={PartyPopper}
        >
          <div className="container mx-auto px-4 py-6 space-y-6">
            <div className="h-32 bg-muted/20 rounded-xl" />
            <div className="h-64 bg-muted/20 rounded-xl" />
          </div>
        </ComingSoonOverlay>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Events | Padel2Go Dashboard</title>
      </Helmet>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground">
            {upcomingEvents.length > 0 
              ? `${upcomingEvents.length} kommende Events` 
              : "Keine kommenden Events"}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <DashboardMetricCard
                title="Kommende Events"
                value={upcomingEvents.length}
                icon={Calendar}
              />
              <DashboardMetricCard
                title="Vergangene Events"
                value={pastEvents.length}
                icon={Clock}
              />
              {featuredEvent && (
                <DashboardMetricCard
                  title="Nächstes Event"
                  value={format(parseISO(featuredEvent.start_at!), "d. MMM", { locale: de })}
                  icon={Calendar}
                  subtitle={featuredEvent.title}
                />
              )}
            </div>

            {/* Featured Event */}
            {featuredEvent && (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
                <div className="relative">
                  {featuredEvent.image_url && (
                    <div className="absolute inset-0">
                      <img 
                        src={featuredEvent.image_url} 
                        alt={featuredEvent.title}
                        className="w-full h-full object-cover opacity-20"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                    </div>
                  )}
                  <CardContent className="relative p-6">
                    <Badge className="mb-3">Featured Event</Badge>
                    <h3 className="text-xl md:text-2xl font-bold mb-2">{featuredEvent.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      {featuredEvent.start_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(parseISO(featuredEvent.start_at), "EEEE, d. MMMM yyyy", { locale: de })}
                        </span>
                      )}
                      {featuredEvent.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {featuredEvent.city}
                        </span>
                      )}
                      {featuredEvent.capacity && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {featuredEvent.capacity} Plätze
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button asChild variant="lime">
                        <a href={featuredEvent.ticket_url} target="_blank" rel="noopener noreferrer">
                          Tickets <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                      <Button asChild variant="outline">
                        <Link to={`/events/${featuredEvent.slug}`}>Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            )}

            {/* Upcoming Events */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Kommende Events</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Keine kommenden Events
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingEvents.map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.slug}`}
                        className="group p-4 rounded-xl bg-background/50 border border-border/30 hover:border-primary/50 transition-all"
                      >
                        {event.image_url && (
                          <div className="aspect-video rounded-lg overflow-hidden mb-3">
                            <img 
                              src={event.image_url} 
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        <h4 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                          {event.title}
                        </h4>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          {event.start_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(parseISO(event.start_at), "d. MMM", { locale: de })}
                            </span>
                          )}
                          {event.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.city}
                            </span>
                          )}
                        </div>
                        {event.price_label && (
                          <Badge variant="secondary" className="mt-2">
                            {event.price_label}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Vergangene Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pastEvents.slice(0, 5).map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.slug}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30 hover:border-primary/50 transition-all opacity-75"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{event.title}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {event.start_at && (
                              <span>{format(parseISO(event.start_at), "d. MMM yyyy", { locale: de })}</span>
                            )}
                            {event.city && <span>• {event.city}</span>}
                          </div>
                        </div>
                        <Badge variant="outline">Vergangen</Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardEvents;
