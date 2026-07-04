import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// Safe cancel: routes through the cancel-booking edge function, which verifies
// ownership, issues the Stripe refund and reverses points server-side. Never
// flips booking.status client-side.
export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation("booking");

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke("cancel-booking", {
        body: { booking_id: bookingId },
      });

      if (error) {
        // Surface the German error message the function put in the response body.
        let message = "";
        try {
          const body = await (error as { context?: Response }).context?.json();
          message = body?.error ?? "";
        } catch {
          // Body not JSON / unavailable — fall back to the generic toast copy.
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error as string);
      return data;
    },
    onSuccess: () => {
      toast.success(t("myBookings.cancelSuccessTitle"), {
        description: t("myBookings.cancelSuccessDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["user-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["myBookings"] });
      queryClient.invalidateQueries({ queryKey: ["account-data"] });
    },
    onError: (error: Error) => {
      toast.error(t("common.errorTitle"), {
        description: error.message || t("myBookings.cancelErrorDesc"),
      });
    },
  });
};
