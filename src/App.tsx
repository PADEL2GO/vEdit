import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireAppLaunched } from "@/components/RequireAppLaunched";
import Index from "./pages/Index";
import FuerSpieler from "./pages/FuerSpieler";
import FuerVereine from "./pages/FuerVereine";
import FuerPartner from "./pages/FuerPartner";
import AppBooking from "./pages/AppBooking";
import Rewards from "./pages/Rewards";
import League from "./pages/League";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import UeberUns from "./pages/UeberUns";
import FaqKontakt from "./pages/FaqKontakt";
import Impressum from "./pages/Impressum";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Play from "./pages/Play";
import Booking from "./pages/Booking";
import BookingLocation from "./pages/BookingLocation";
import BookingCheckout from "./pages/BookingCheckout";
import BookingSuccess from "./pages/BookingSuccess";
import BookingCancel from "./pages/BookingCancel";
import InviteAccept from "./pages/InviteAccept";
import NotFound from "./pages/NotFound";
import PublicProfile from "./pages/PublicProfile";
import Lobbies from "./pages/Lobbies";

// Dashboard Pages (Logged-In)
import DashboardBooking from "./pages/dashboard/DashboardBooking";
import DashboardRewards from "./pages/dashboard/DashboardRewards";
import DashboardMarketplace from "./pages/dashboard/DashboardMarketplace";
import DashboardLeague from "./pages/dashboard/DashboardLeague";
import DashboardEvents from "./pages/dashboard/DashboardEvents";
import DashboardP2GPoints from "./pages/dashboard/DashboardP2GPoints";
import DashboardFriends from "./pages/dashboard/DashboardFriends";

// Club Pages
import { ClubLayout } from "./components/club/ClubLayout";
import ClubDashboard from "./pages/club/ClubDashboard";
import ClubBookings from "./pages/club/ClubBookings";
import ClubCalendar from "./pages/club/ClubCalendar";
import ClubCourtFeatures from "./pages/club/ClubCourtFeatures";

// Admin Pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminCourts from "./pages/admin/AdminCourts";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminVisuals from "./pages/admin/AdminVisuals";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminMarketplace from "./pages/admin/AdminMarketplace";
import AdminP2GPoints from "./pages/admin/AdminP2GPoints";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminFeatures from "./pages/admin/AdminFeatures";
import AdminClubOwners from "./pages/admin/AdminClubOwners";
import AdminClubs from "./pages/admin/AdminClubs";
import AdminVouchers from "./pages/admin/AdminVouchers";
import AdminLocationTeasers from "./pages/admin/AdminLocationTeasers";
import AdminSkyPadelGallery from "./pages/admin/AdminSkyPadelGallery";
import AdminPartnerTiles from "./pages/admin/AdminPartnerTiles";
import AdminRewardDefinitions from "./pages/admin/AdminRewardDefinitions";
import AdminRewardApprovals from "./pages/admin/AdminRewardApprovals";
import AdminCredits from "./pages/admin/AdminCredits";
import AdminRedemptions from "./pages/admin/AdminRedemptions";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AGB from "./pages/AGB";
import Datenschutz from "./pages/Datenschutz";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/fuer-spieler" element={<FuerSpieler />} />
              <Route path="/fuer-vereine" element={<FuerVereine />} />
              <Route path="/fuer-partner" element={<FuerPartner />} />
              <Route path="/app-booking" element={<AppBooking />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/league" element={<League />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/ueber-uns" element={<UeberUns />} />
              <Route path="/faq-kontakt" element={<FaqKontakt />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/play" element={<Play />} />

              {/* Protected Routes — require login */}
              <Route element={<RequireAuth />}>
                {/* Always accessible after login: booking flow + account */}
                <Route path="/account" element={<Account />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/booking/locations/:slug" element={<BookingLocation />} />
                <Route path="/booking/checkout" element={<BookingCheckout />} />
                <Route path="/booking/success" element={<BookingSuccess />} />
                <Route path="/booking/cancel" element={<BookingCancel />} />
                <Route path="/invite/accept" element={<InviteAccept />} />

                {/* Admin Routes — always accessible to admins (RequireAppLaunched lets admins through) */}
                <Route element={<RequireAppLaunched />}>
                  <Route path="/admin" element={<AdminOverview />} />
                  <Route path="/admin/bookings" element={<AdminBookings />} />
                  <Route path="/admin/courts" element={<AdminCourts />} />
                  <Route path="/admin/events" element={<AdminEvents />} />
                  <Route path="/admin/marketplace" element={<AdminMarketplace />} />
                  <Route path="/admin/p2g-points" element={<AdminP2GPoints />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/notifications" element={<AdminNotifications />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/visuals" element={<AdminVisuals />} />
                  <Route path="/admin/features" element={<AdminFeatures />} />
                  <Route path="/admin/club-owners" element={<AdminClubOwners />} />
                  <Route path="/admin/clubs" element={<AdminClubs />} />
                  <Route path="/admin/vouchers" element={<AdminVouchers />} />
                  <Route path="/admin/location-teasers" element={<AdminLocationTeasers />} />
                  <Route path="/admin/skypadel-gallery" element={<AdminSkyPadelGallery />} />
                  <Route path="/admin/partner-tiles" element={<AdminPartnerTiles />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/reward-definitions" element={<AdminRewardDefinitions />} />
                  <Route path="/admin/reward-approvals" element={<AdminRewardApprovals />} />
                  <Route path="/admin/credits" element={<AdminCredits />} />
                  <Route path="/admin/redemptions" element={<AdminRedemptions />} />
                  <Route path="/admin/integrations" element={<AdminIntegrations />} />

                  {/* Locked until app_launched = true */}
                  <Route path="/lobbies" element={<Lobbies />} />
                  <Route path="/lobbies/:id" element={<Lobbies />} />
                  <Route path="/dashboard" element={<DashboardBooking />} />
                  <Route path="/dashboard/booking" element={<DashboardBooking />} />
                  <Route path="/dashboard/rewards" element={<DashboardRewards />} />
                  <Route path="/dashboard/p2g-points" element={<DashboardP2GPoints />} />
                  <Route path="/dashboard/marketplace" element={<DashboardMarketplace />} />
                  <Route path="/dashboard/league" element={<DashboardLeague />} />
                  <Route path="/dashboard/events" element={<DashboardEvents />} />
                  <Route path="/dashboard/friends" element={<DashboardFriends />} />

                  {/* Club Owner Routes */}
                  <Route path="/club" element={<ClubLayout />}>
                    <Route index element={<ClubDashboard />} />
                    <Route path="bookings" element={<ClubBookings />} />
                    <Route path="calendar" element={<ClubCalendar />} />
                    <Route path="court" element={<ClubCourtFeatures />} />
                  </Route>
                </Route>
              </Route>

              {/* Public Profile */}
              <Route path="/u/:username" element={<PublicProfile />} />
              <Route path="/agb" element={<AGB />} />
              <Route path="/datenschutz" element={<Datenschutz />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
            <CookieConsentBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
