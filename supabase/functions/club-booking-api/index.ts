import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is a club member (new club_users based check)
    const { data: clubMembership } = await supabase
      .from("club_users")
      .select("id, club_id, role_in_club, is_active, clubs(id, name, is_active)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    
    // Extract club data from the joined result
    const clubData = clubMembership?.clubs as { id: string; name: string; is_active: boolean } | { id: string; name: string; is_active: boolean }[] | null | undefined;
    const clubObj = Array.isArray(clubData) ? clubData[0] : clubData;
    const clubIsActive = clubObj?.is_active;
    const clubName = clubObj?.name;

    // Fallback: Also check legacy club_owner role for backwards compatibility
    let isLegacyClubOwner = false;
    if (!clubMembership) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "club_owner")
        .maybeSingle();
      
      isLegacyClubOwner = !!roleData;
    }

    if (!clubMembership && !isLegacyClubOwner) {
      console.log("User not a club member:", user.id);
      return new Response(JSON.stringify({ error: "Not a club member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if club is active (if using new system)
    if (clubMembership && clubIsActive === false) {
      return new Response(JSON.stringify({ error: "Club is not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const actionFromPath = url.pathname.split("/").pop();
    
    console.log("[ClubBookingAPI]", { method: req.method, pathname: url.pathname, actionFromPath });

    // Pass club context to handlers
    const clubContext = clubMembership ? {
      clubId: clubMembership.club_id,
      clubName: clubName || null,
      roleInClub: clubMembership.role_in_club,
      isLegacy: false,
    } : {
      clubId: null,
      clubName: null,
      roleInClub: "manager", // Legacy club owners have full access
      isLegacy: true,
    };

    // Determine action - support both path-based and body-based routing
    let finalAction = actionFromPath;
    let parsedBody: any = null;
    
    // If action from path is not recognized, try to read from body (for supabase.functions.invoke)
    if (req.method === "POST" && !["create", "cancel"].includes(actionFromPath || "")) {
      try {
        parsedBody = await req.json();
        if (parsedBody?.action) {
          finalAction = parsedBody.action;
          console.log("[ClubBookingAPI] Using action from body:", finalAction);
        }
      } catch (e) {
        console.log("[ClubBookingAPI] Could not parse body for action");
      }
    }

    console.log("[ClubBookingAPI] Final action:", finalAction);

    if (req.method === "POST" && finalAction === "create") {
      return await handleCreateBooking(parsedBody, supabase, user.id, clubContext);
    } else if (req.method === "POST" && finalAction === "cancel") {
      return await handleCancelBooking(parsedBody, supabase, user.id, clubContext);
    } else if (req.method === "GET" && (finalAction === "quota" || actionFromPath === "quota")) {
      return await handleGetQuota(req, supabase, user.id, clubContext);
    } else {
      console.log("[ClubBookingAPI] Invalid action - finalAction:", finalAction, "method:", req.method);
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    console.error("Club booking API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ClubContext {
  clubId: string | null;
  clubName: string | null;
  roleInClub: string;
  isLegacy: boolean;
}

/** Calculate month start date (YYYY-MM-01) for a given date */
function getMonthStartStr(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}-01`;
}

async function handleCreateBooking(
  bodyOrNull: any | null, 
  supabase: any, 
  userId: string,
  clubContext: ClubContext
) {
  const body = bodyOrNull || {};
  const { courtId, startTime, endTime, duration, memberName, memberUserId, notes } = body;

  console.log("[handleCreateBooking] Body keys:", Object.keys(body));

  // Validate required fields
  if (!courtId || !startTime || !endTime || !duration) {
    console.log("[handleCreateBooking] Missing fields:", { courtId: !!courtId, startTime: !!startTime, endTime: !!endTime, duration: !!duration });
    return new Response(JSON.stringify({ error: "Missing required fields", received: { courtId: !!courtId, startTime: !!startTime, endTime: !!endTime, duration: !!duration } }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let assignment: any = null;
  let clubId: string | null = clubContext.clubId;

  // New system: Check club_court_assignments
  if (clubContext.clubId) {
    const { data: clubAssignment, error: clubAssignmentError } = await supabase
      .from("club_court_assignments")
      .select("*, court:courts(id, location_id, name)")
      .eq("club_id", clubContext.clubId)
      .eq("court_id", courtId)
      .maybeSingle();

    if (clubAssignmentError) {
      console.error("Club assignment error:", clubAssignmentError);
    }

    if (clubAssignment) {
      assignment = clubAssignment;
      console.log("Using club_court_assignment for club:", clubContext.clubId);
    }
  }

  // Fallback: Check legacy club_owner_assignments
  if (!assignment) {
    const { data: legacyAssignment, error: legacyError } = await supabase
      .from("club_owner_assignments")
      .select("*, court:courts(id, location_id, name)")
      .eq("user_id", userId)
      .eq("court_id", courtId)
      .maybeSingle();

    if (legacyError) {
      console.error("Legacy assignment error:", legacyError);
    }

    if (legacyAssignment) {
      assignment = legacyAssignment;
      console.log("Using legacy club_owner_assignment for user:", userId);
    }
  }

  if (!assignment) {
    return new Response(JSON.stringify({ error: "No assignment for this court" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check allowed booking windows if configured
  if (assignment.allowed_booking_windows) {
    const bookingStart = new Date(startTime);
    const dayOfWeek = bookingStart.getDay(); // 0 = Sunday
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][dayOfWeek];
    const windows = assignment.allowed_booking_windows[dayName];
    
    if (windows && windows.length > 0) {
      const bookingTime = bookingStart.getHours() * 60 + bookingStart.getMinutes();
      const isWithinWindow = windows.some((w: { start: string; end: string }) => {
        const [startH, startM] = w.start.split(":").map(Number);
        const [endH, endM] = w.end.split(":").map(Number);
        const windowStart = startH * 60 + startM;
        const windowEnd = endH * 60 + endM;
        return bookingTime >= windowStart && bookingTime < windowEnd;
      });

      if (!isWithinWindow) {
        return new Response(JSON.stringify({ error: "Booking not within allowed time windows" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  // Calculate month start date based on the booking date
  const bookingDate = new Date(startTime);
  const monthStartStr = getMonthStartStr(bookingDate);

  // Get current quota usage - check both club_id and club_owner_id based entries
  let ledgerQuery = supabase
    .from("club_quota_ledger")
    .select("minutes_used, minutes_refunded")
    .eq("court_id", courtId)
    .eq("month_start_date", monthStartStr);

  if (clubId) {
    // New system: filter by club_id
    ledgerQuery = ledgerQuery.eq("club_id", clubId);
  } else {
    // Legacy system: filter by club_owner_id
    ledgerQuery = ledgerQuery.eq("club_owner_id", userId);
  }

  const { data: ledgerEntries } = await ledgerQuery;

  const minutesUsed = ledgerEntries?.reduce((sum: number, e: any) => sum + e.minutes_used, 0) || 0;
  const minutesRefunded = ledgerEntries?.reduce((sum: number, e: any) => sum + e.minutes_refunded, 0) || 0;
  const remaining = assignment.monthly_free_minutes - minutesUsed + minutesRefunded;

  if (remaining < duration) {
    return new Response(JSON.stringify({ 
      error: "Not enough quota remaining",
      remaining,
      requested: duration
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check for conflicting bookings
  const { data: conflicts } = await supabase
    .from("bookings")
    .select("id")
    .eq("court_id", courtId)
    .neq("status", "cancelled")
    .neq("status", "expired")
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (conflicts && conflicts.length > 0) {
    return new Response(JSON.stringify({ error: "Time slot already booked" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create booking with new club fields
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      user_id: userId,
      court_id: courtId,
      location_id: assignment.court.location_id,
      start_time: startTime,
      end_time: endTime,
      status: "confirmed",
      booking_origin: "club",
      club_id: clubId, // New field
      club_owner_id: userId, // Keep for backwards compatibility
      club_booked_by_user_id: userId, // New field: who booked
      booked_for_member_name: memberName || null,
      booked_for_member_user_id: memberUserId || null, // New field
      is_free_allocation: true,
      allocation_minutes: duration,
      notes: notes || null,
    })
    .select()
    .single();

  if (bookingError) {
    console.error("Booking error:", bookingError);
    return new Response(JSON.stringify({ error: "Failed to create booking" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create quota ledger entry with club_id
  const { error: ledgerError } = await supabase
    .from("club_quota_ledger")
    .insert({
      club_id: clubId, // New field
      club_owner_id: userId, // Keep for backwards compatibility
      court_id: courtId,
      month_start_date: monthStartStr,
      minutes_used: duration,
      minutes_refunded: 0,
      booking_id: booking.id,
    });

  if (ledgerError) {
    console.error("Ledger error:", ledgerError);
    // Rollback booking
    await supabase.from("bookings").delete().eq("id", booking.id);
    return new Response(JSON.stringify({ error: "Failed to update quota" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get court and location info for notification
  const { data: courtInfo } = await supabase
    .from("courts")
    .select("name, location:locations(name)")
    .eq("id", courtId)
    .single();

  const bookingDateFormatted = new Date(startTime).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const bookingTimeFormatted = new Date(startTime).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Create notification for the user who booked
  const courtName = courtInfo?.name || "Court";
  const locationName = courtInfo?.location?.name || "Standort";
  const memberInfo = memberName ? ` für ${memberName}` : "";
  const clubInfo = clubContext.clubName ? ` (${clubContext.clubName})` : "";

  await supabase.from("notifications").insert({
    user_id: userId,
    type: "club_booking_created",
    title: "Club-Buchung erstellt",
    message: `Deine Buchung${memberInfo} am ${bookingDateFormatted} um ${bookingTimeFormatted} Uhr auf ${courtName} (${locationName})${clubInfo} wurde bestätigt.`,
    entity_type: "booking",
    entity_id: booking.id,
    cta_url: "/club/bookings",
  });

  // If booking is for a specific member user, notify them too
  if (memberUserId && memberUserId !== userId) {
    await supabase.from("notifications").insert({
      user_id: memberUserId,
      type: "club_booking_for_member",
      title: "Court für dich reserviert",
      message: `Ein Court wurde für dich am ${bookingDateFormatted} um ${bookingTimeFormatted} Uhr auf ${courtName} (${locationName}) reserviert.`,
      entity_type: "booking",
      entity_id: booking.id,
      actor_id: userId,
    });
  }

  console.log("Club booking created:", booking.id, "club_id:", clubId, "by user:", userId);

  return new Response(JSON.stringify({ 
    success: true, 
    booking,
    remainingQuota: remaining - duration
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCancelBooking(
  bodyOrNull: any | null, 
  supabase: any, 
  userId: string,
  clubContext: ClubContext
) {
  const body = bodyOrNull || {};
  const { bookingId } = body;

  console.log("[handleCancelBooking] bookingId:", bookingId);

  if (!bookingId) {
    return new Response(JSON.stringify({ error: "Booking ID required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build query to get booking - allow access if user booked it OR is in the same club
  let bookingQuery = supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("booking_origin", "club");

  const { data: booking, error: bookingError } = await bookingQuery.maybeSingle();

  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: "Booking not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authorization check: user must have booked it, OR be in the same club as manager
  const isBooker = booking.club_booked_by_user_id === userId || booking.club_owner_id === userId;
  const isSameClub = clubContext.clubId && booking.club_id === clubContext.clubId;
  const isManager = clubContext.roleInClub === "manager";

  if (!isBooker && !(isSameClub && isManager)) {
    return new Response(JSON.stringify({ error: "Not authorized to cancel this booking" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (booking.status === "cancelled") {
    return new Response(JSON.stringify({ error: "Booking already cancelled" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Calculate month start for the booking date
  const bookingDate = new Date(booking.start_time);
  const monthStartStr = getMonthStartStr(bookingDate);

  // Cancel booking
  const { error: cancelError } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (cancelError) {
    console.error("Cancel error:", cancelError);
    return new Response(JSON.stringify({ error: "Failed to cancel booking" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Refund quota - create new ledger entry with refund
  const { error: refundError } = await supabase
    .from("club_quota_ledger")
    .insert({
      club_id: booking.club_id, // Use club_id from booking
      club_owner_id: booking.club_owner_id || userId, // Fallback
      court_id: booking.court_id,
      month_start_date: monthStartStr,
      minutes_used: 0,
      minutes_refunded: booking.allocation_minutes || 0,
      booking_id: bookingId,
    });

  if (refundError) {
    console.error("Refund ledger error:", refundError);
    // Don't fail the cancellation, just log
  }

  // Get court and location info for notification
  const { data: courtInfo } = await supabase
    .from("courts")
    .select("name, location:locations(name)")
    .eq("id", booking.court_id)
    .single();

  const bookingDateFormatted = new Date(booking.start_time).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const bookingTimeFormatted = new Date(booking.start_time).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const courtName = courtInfo?.name || "Court";
  const locationName = courtInfo?.location?.name || "Standort";
  const memberInfo = booking.booked_for_member_name ? ` für ${booking.booked_for_member_name}` : "";
  const refundedMinutes = booking.allocation_minutes || 0;

  // Create notification for the original booker
  const notifyUserId = booking.club_booked_by_user_id || booking.club_owner_id;
  await supabase.from("notifications").insert({
    user_id: notifyUserId,
    type: "club_booking_cancelled",
    title: "Club-Buchung storniert",
    message: `Die Buchung${memberInfo} am ${bookingDateFormatted} um ${bookingTimeFormatted} Uhr wurde storniert. ${refundedMinutes} Minuten wurden dem Club-Kontingent gutgeschrieben.`,
    entity_type: "booking",
    entity_id: bookingId,
    cta_url: "/club/bookings",
    actor_id: userId !== notifyUserId ? userId : null,
  });

  // If booking was for a member, notify them too
  if (booking.booked_for_member_user_id && booking.booked_for_member_user_id !== notifyUserId) {
    await supabase.from("notifications").insert({
      user_id: booking.booked_for_member_user_id,
      type: "club_booking_cancelled_member",
      title: "Deine Reservierung wurde storniert",
      message: `Die Court-Reservierung am ${bookingDateFormatted} um ${bookingTimeFormatted} Uhr auf ${courtName} wurde storniert.`,
      entity_type: "booking",
      entity_id: bookingId,
      actor_id: userId,
    });
  }

  console.log("Club booking cancelled:", bookingId, "by user:", userId, "refund:", refundedMinutes);

  return new Response(JSON.stringify({ success: true, refundedMinutes }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleGetQuota(
  req: Request,
  supabase: any,
  userId: string,
  clubContext: ClubContext
) {
  const url = new URL(req.url);
  const courtId = url.searchParams.get("courtId");

  if (!courtId) {
    return new Response(JSON.stringify({ error: "Court ID required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let assignment: any = null;
  let clubId: string | null = clubContext.clubId;

  // Check club_court_assignments first
  if (clubContext.clubId) {
    const { data: clubAssignment } = await supabase
      .from("club_court_assignments")
      .select("monthly_free_minutes")
      .eq("club_id", clubContext.clubId)
      .eq("court_id", courtId)
      .maybeSingle();

    if (clubAssignment) {
      assignment = clubAssignment;
    }
  }

  // Fallback to legacy
  if (!assignment) {
    const { data: legacyAssignment } = await supabase
      .from("club_owner_assignments")
      .select("monthly_free_minutes")
      .eq("user_id", userId)
      .eq("court_id", courtId)
      .maybeSingle();

    if (legacyAssignment) {
      assignment = legacyAssignment;
      clubId = null;
    }
  }

  if (!assignment) {
    return new Response(JSON.stringify({ error: "No assignment for this court" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Calculate month start
  const today = new Date();
  const monthStartStr = getMonthStartStr(today);

  // Get quota usage
  let ledgerQuery = supabase
    .from("club_quota_ledger")
    .select("minutes_used, minutes_refunded")
    .eq("court_id", courtId)
    .eq("month_start_date", monthStartStr);

  if (clubId) {
    ledgerQuery = ledgerQuery.eq("club_id", clubId);
  } else {
    ledgerQuery = ledgerQuery.eq("club_owner_id", userId);
  }

  const { data: ledgerEntries } = await ledgerQuery;

  const minutesUsed = ledgerEntries?.reduce((sum: number, e: any) => sum + e.minutes_used, 0) || 0;
  const minutesRefunded = ledgerEntries?.reduce((sum: number, e: any) => sum + e.minutes_refunded, 0) || 0;
  const remaining = assignment.monthly_free_minutes - minutesUsed + minutesRefunded;

  return new Response(JSON.stringify({
    monthlyAllowance: assignment.monthly_free_minutes,
    minutesUsed,
    minutesRefunded,
    remaining,
    monthStartDate: monthStartStr,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
