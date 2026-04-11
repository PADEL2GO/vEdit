import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/edgeFunctionUtils";
import { applyVoucherDiscount } from "@/lib/pricing";
export interface BookingDetails {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  price_cents: number;
  currency: string;
  hold_expires_at: string | null;
  payment_mode: string | null;
  location: { name: string; slug: string; address: string | null };
  court: { name: string };
  invitedCount: number;
}

export interface RewardBreakdown {
  key: string;
  title: string;
  points: number;
  description?: string;
}

export interface RewardsEstimate {
  total_points: number;
  breakdown: RewardBreakdown[];
  disclaimers: string[];
}

export type CheckoutState = 
  | "loading"
  | "ready"
  | "processing"
  | "expired"
  | "already_paid"
  | "error";

export interface VoucherState {
  code: string;
  status: "idle" | "validating" | "valid" | "invalid";
  voucherId: string | null;
  discountType: string;   // 'free' | 'percentage' | 'fixed'
  discountValue: number;  // percentage (1-100) or cents
  discountLabel: string;  // human-readable, e.g. "20 % Rabatt"
  errorMessage: string | null;
}

export interface UseBookingCheckoutReturn {
  booking: BookingDetails | null;
  state: CheckoutState;
  error: string | null;
  timeLeft: number | null;
  stripeUrl: string | null;
  rewardsEstimate: RewardsEstimate | null;
  selectedFriendIds: string[];
  setSelectedFriendIds: (ids: string[]) => void;
  voucher: VoucherState;
  setVoucherCode: (code: string) => void;
  validateVoucher: () => Promise<void>;
  clearVoucher: () => void;
  handlePayment: () => Promise<void>;
  createInvitesAndPay: (friendIds: string[]) => Promise<void>;
  formatTimeLeft: (seconds: number) => string;
}

export function useBookingCheckout(): UseBookingCheckoutReturn {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [state, setState] = useState<CheckoutState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);
  const [rewardsEstimate, setRewardsEstimate] = useState<RewardsEstimate | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [voucher, setVoucher] = useState<VoucherState>({
    code: "",
    status: "idle",
    voucherId: null,
    discountType: "free",
    discountValue: 0,
    discountLabel: "Kostenlos",
    errorMessage: null,
  });

  const bookingId = searchParams.get("booking_id");

  // Auth redirect effect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/auth?redirect=/booking/checkout?booking_id=${bookingId}`);
    }
  }, [authLoading, user, bookingId, navigate]);

  // Fetch booking effect
  useEffect(() => {
    if (user && bookingId) {
      fetchBooking();
    }
  }, [user, bookingId]);

  // Countdown timer effect
  useEffect(() => {
    if (!booking?.hold_expires_at) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(booking.hold_expires_at!);
      const diff = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);

      if (diff === 0) {
        setState("expired");
        setError("Deine Reservierung ist abgelaufen. Bitte buche erneut.");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [booking?.hold_expires_at]);

  const setVoucherCode = (code: string) => {
    setVoucher((prev) => ({
      ...prev,
      code,
      status: "idle",
      voucherId: null,
      discountType: "free",
      discountValue: 0,
      discountLabel: "Kostenlos",
      errorMessage: null,
    }));
  };

  const clearVoucher = () => {
    setVoucher({ code: "", status: "idle", voucherId: null, discountType: "free", discountValue: 0, discountLabel: "Kostenlos", errorMessage: null });
  };

  const validateVoucher = async () => {
    if (!voucher.code.trim()) return;

    setVoucher((prev) => ({ ...prev, status: "validating", errorMessage: null }));

    const { data, error: fnError } = await invokeEdgeFunction<{
      valid: boolean;
      voucher_id?: string;
      reason?: string;
      description?: string;
      discount_type?: string;
      discount_value?: number;
      discount_label?: string;
    }>("voucher-validate", {
      body: { code: voucher.code.trim() },
      maxRetries: 1,
    });

    if (fnError || !data) {
      setVoucher((prev) => ({
        ...prev,
        status: "invalid",
        errorMessage: fnError?.message || "Validierung fehlgeschlagen",
      }));
      return;
    }

    if (data.valid) {
      const discountType = data.discount_type || "free";
      const discountValue = data.discount_value ?? 0;
      const discountLabel = data.discount_label || "Kostenlos";
      setVoucher((prev) => ({
        ...prev,
        status: "valid",
        voucherId: data.voucher_id || null,
        discountType,
        discountValue,
        discountLabel,
        errorMessage: null,
      }));
      toast.success("Gutscheincode gültig!", { description: discountLabel });
    } else {
      setVoucher((prev) => ({
        ...prev,
        status: "invalid",
        errorMessage: data.reason || "Ungültiger Code",
      }));
    }
  };

  const fetchBooking = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select(`
          id,
          start_time,
          end_time,
          status,
          price_cents,
          currency,
          hold_expires_at,
          payment_mode,
          location:locations (name, slug, address),
          court:courts (name)
        `)
        .eq("id", bookingId!)
        .eq("user_id", user!.id)
        .single();

      if (fetchError || !data) {
        setError("Buchung nicht gefunden oder kein Zugriff.");
        setState("error");
        return;
      }

      if (data.status !== "pending_payment") {
        if (data.status === "confirmed") {
          navigate("/account");
          toast.info("Diese Buchung wurde bereits bezahlt.");
          setState("already_paid");
        } else {
          setError(`Buchung kann nicht bezahlt werden. Status: ${data.status}`);
          setState("error");
        }
        return;
      }

      // Count invited participants
      const { count: invitedCount } = await supabase
        .from("booking_participants")
        .select("*", { count: "exact", head: true })
        .eq("booking_id", bookingId!);

      const bookingDetails: BookingDetails = {
        ...data,
        location: data.location as unknown as BookingDetails["location"],
        court: data.court as unknown as BookingDetails["court"],
        invitedCount: invitedCount || 0,
      };
      
      setBooking(bookingDetails);
      setState("ready");

      // Fetch rewards estimate (non-blocking)
      invokeEdgeFunction<RewardsEstimate>("rewards-estimate", {
        body: {
          booking_id: bookingId,
          price_cents: data.price_cents || 0,
          start_time: data.start_time,
        },
        maxRetries: 1,
      }).then(({ data: estimateData }) => {
        if (estimateData && estimateData.total_points !== undefined) {
          setRewardsEstimate(estimateData);
        }
      }).catch((estimateErr) => {
        console.warn("Could not fetch rewards estimate:", estimateErr);
      });
    } catch (err) {
      console.error("Error fetching booking:", err);
      setError("Fehler beim Laden der Buchung.");
      setState("error");
    }
  };

  const redeemVoucher = async (): Promise<boolean> => {
    if (!booking || voucher.status !== "valid") return false;

    setState("processing");

    const { data, error: fnError } = await invokeEdgeFunction<{ success: boolean }>(
      "voucher-redeem",
      {
        body: { code: voucher.code.trim(), booking_id: booking.id },
        maxRetries: 1,
      }
    );

    if (fnError || !data?.success) {
      toast.error("Fehler beim Einlösen", {
        description: fnError?.message || "Bitte versuche es erneut.",
      });
      setState("ready");
      return false;
    }

    toast.success("Buchung kostenlos bestätigt! 🎉");
    navigate("/booking/success");
    return true;
  };

  const createInvitesAndPay = async (friendIds: string[]) => {
    if (!booking || !user) return;

    setState("processing");
    try {
      if (friendIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", friendIds);

        if (profileError) throw new Error("Fehler beim Laden der Freunde");

        const sharePrice = Math.ceil(booking.price_cents / 4);

        for (const friendId of friendIds) {
          const profile = profiles?.find(p => p.user_id === friendId);
          const username = profile?.username || "Unbekannt";

          const { data: participant, error: insertError } = await supabase
            .from("booking_participants")
            .insert({
              booking_id: booking.id,
              inviter_user_id: user.id,
              invited_user_id: friendId,
              invited_username: username,
              share_price_cents: sharePrice,
              share_fraction: 0.25,
              status: "pending_invite",
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("Error creating participant:", insertError);
            throw new Error("Fehler beim Erstellen der Einladung");
          }

          invokeEdgeFunction("send-invite-notification", {
            body: { 
              participant_id: participant.id, 
              origin: window.location.origin 
            },
            maxRetries: 1,
          }).catch((notifyErr) => {
            console.warn("Could not send invite notification:", notifyErr);
          });
        }

        await supabase
          .from("bookings")
          .update({ payment_mode: "split" })
          .eq("id", booking.id);

        setBooking(prev => prev ? { 
          ...prev, 
          payment_mode: "split", 
          invitedCount: friendIds.length 
        } : null);

        toast.success(`${friendIds.length} Einladung${friendIds.length > 1 ? 'en' : ''} versendet!`);
      }

      // Route based on voucher type:
      // fully-free vouchers → voucher-redeem (bypasses Stripe)
      // partial discounts → handlePayment with voucher_id (Stripe with reduced price)
      if (voucher.status === "valid") {
        const effectivePrice = booking
          ? applyVoucherDiscount(booking.price_cents, voucher.discountType, voucher.discountValue)
          : 0;
        if (effectivePrice === 0) {
          await redeemVoucher();
          return;
        }
      }

      await handlePayment();
    } catch (err: any) {
      console.error("Create invites error:", err);
      toast.error("Fehler beim Einladen", {
        description: err.message || "Bitte versuche es erneut.",
      });
      setState("ready");
    }
  };

  const handlePayment = async () => {
    if (!booking) return;

    // If voucher is valid, redeem directly
    if (voucher.status === "valid") {
      await redeemVoucher();
      return;
    }

    setState("processing");

    // Pass voucher_id for partial-discount vouchers so create-checkout-session
    // can apply the discount and soft-reserve the use slot.
    const isPartialVoucher =
      voucher.status === "valid" &&
      applyVoucherDiscount(booking.price_cents, voucher.discountType, voucher.discountValue) > 0;

    const { data, error } = await invokeEdgeFunction<{ url: string }>(
      "create-checkout-session",
      {
        body: {
          booking_id: booking.id,
          ...(isPartialVoucher && voucher.voucherId ? { voucher_id: voucher.voucherId } : {}),
        },
        maxRetries: 2,
        retryDelayMs: 1500,
      }
    );

    if (error) {
      console.error("[Checkout] Payment error:", error);
      toast.error("Fehler beim Starten der Zahlung", {
        description: error.message,
        action: {
          label: "Erneut versuchen",
          onClick: () => handlePayment(),
        },
      });
      setState("ready");
      return;
    }

    if (!data?.url) {
      toast.error("Fehler beim Starten der Zahlung", {
        description: "Keine Checkout-URL vom Server erhalten. Bitte versuche es erneut.",
      });
      setState("ready");
      return;
    }

    setStripeUrl(data.url);

    // Extend the local countdown to 30 minutes to match the Stripe session TTL.
    // create-checkout-session has already written hold_expires_at = now+30min to the DB;
    // we mirror that here so the timer on this page stays accurate without a re-fetch.
    const newExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    setBooking(prev => prev ? { ...prev, hold_expires_at: newExpiry } : null);

    // Redirect in the same tab. Using window.open(_blank) after an async call is
    // blocked by popup blockers on most mobile browsers; a same-tab redirect is
    // simpler and always works. Stripe's success_url brings the user back to
    // /booking/success after payment.
    window.location.assign(data.url);
  };

  const formatTimeLeft = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    booking,
    state,
    error,
    timeLeft,
    stripeUrl,
    rewardsEstimate,
    selectedFriendIds,
    setSelectedFriendIds,
    voucher,
    setVoucherCode,
    validateVoucher,
    clearVoucher,
    handlePayment,
    createInvitesAndPay,
    formatTimeLeft,
  };
}
