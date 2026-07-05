import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface DashboardEvent {
  id: string;
  title: string;
  slug: string | null;
  event_type: string | null;
  start_at: string | null;
  end_at: string | null;
  venue_name: string | null;
  city: string | null;
  image_url: string | null;
  ticket_url: string;
  price_cents: number | null;
  price_label: string | null;
  capacity: number | null;
  registrations_count: number | null;
  featured: boolean;
}

export interface MyEventRegistration {
  id: string;
  event_id: string;
  ticket_code: string;
  created_at: string;
  event: DashboardEvent | null;
}

// New table/column (event_registrations, registrations_count) not yet in generated types.
const db = supabase as any;

export const useDashboardEvents = () =>
  useQuery({
    queryKey: ["dashboard-events-list"],
    queryFn: async () => {
      const { data, error } = await db
        .from("events")
        .select("*")
        .eq("is_published", true)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DashboardEvent[];
    },
  });

export const useMyEventRegistrations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-event-registrations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("event_registrations")
        .select("id, event_id, ticket_code, created_at, event:events(*)")
        .eq("status", "confirmed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MyEventRegistration[];
    },
  });
};

export const useRegisterForEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await db.rpc("register_for_event", { p_event_id: eventId });
      if (error) throw new Error(error.message);
      return data as { registration_id: string; ticket_code: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-events-list"] });
      qc.invalidateQueries({ queryKey: ["my-event-registrations"] });
    },
    onError: (e: Error) => toast.error(e.message || "Anmeldung fehlgeschlagen"),
  });
};

export const useCancelEventRegistration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await db.rpc("cancel_event_registration", { p_event_id: eventId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-events-list"] });
      qc.invalidateQueries({ queryKey: ["my-event-registrations"] });
      toast.success("Anmeldung storniert");
    },
    onError: (e: Error) => toast.error(e.message || "Stornierung fehlgeschlagen"),
  });
};
