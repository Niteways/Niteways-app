import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PortalProvider } from "@/contexts/PortalContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { VenuePortalOnlyRedirect } from "@/components/deploy/VenuePortalOnlyRedirect";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import TableBooking from "./pages/TableBooking";
import GuestList from "./pages/GuestList";
import GuestListSettings from "./pages/GuestListSettings";
import CreateGuestList from "./pages/CreateGuestList";
import MobileCheckIn from "./pages/MobileCheckIn";
import MobileSecurity from "./pages/MobileSecurity";
import TeamStatistics from "./pages/TeamStatistics";
import UserProfile from "./pages/UserProfile";
import MorePage from "./pages/MorePage";
import Notifications from "./pages/Notifications";

import SmartCRM from "./pages/SmartCRM";
import Analytics from "./pages/Analytics";
import TeamManagement from "./pages/TeamManagement";
import LivePerformance from "./pages/LivePerformance";
import Settings from "./pages/Settings";
import Campaigns from "./pages/Campaigns";
import SecurityCheckIn from "./pages/SecurityCheckIn";
import MultiVenueControl from "./pages/MultiVenueControl";
import Ticketing from "./pages/Ticketing";
import TicketDetail from "./pages/TicketDetail";
import CheckInDetail from "./pages/CheckInDetail";
import VenueInformation from "./pages/VenueInformation";
import FloorMapEditor from "./pages/FloorMapEditor";
import Documents from "./pages/Documents";
import SubscriptionPlan from "./pages/SubscriptionPlan";
import CommissionTracking from "./pages/CommissionTracking";
// PricePlan removed - use TableSettings for pricing
import Invoices from "./pages/Invoices";
import BookingSettings from "./pages/BookingSettings";
import Events from "./pages/Events";
import VenueEvents from "./pages/VenueEvents";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import EventTicketing from "./pages/EventTicketing";
import Reports from "./pages/Reports";
import TableBookingRequests from "./pages/TableBookingRequests";
import TableSettings from "./pages/TableSettings";
import CreateCampaign from "./pages/CreateCampaign";
import NotFound from "./pages/NotFound";
import AdminFinance from "./pages/admin/AdminFinance";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCities from "./pages/admin/AdminCities";
import AdminCityEdit from "./pages/admin/AdminCityEdit";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminVenues from "./pages/admin/AdminVenues";
import AdminVenueDetail from "./pages/admin/AdminVenueDetail";
import AdminVenueOnboarding from "./pages/admin/AdminVenueOnboarding";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminLoyalty from "./pages/admin/AdminLoyalty";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminAccess from "./pages/admin/AdminAccess";
import AdminPermissions from "./pages/admin/AdminPermissions";
import AdminContent from "./pages/admin/AdminContent";
import AdminLegal from "./pages/admin/AdminLegal";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminGuestProfile from "./pages/admin/AdminGuestProfile";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminPricingTiers from "./pages/admin/AdminPricingTiers";
import AdminCommissionRates from "./pages/admin/AdminCommissionRates";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminLoyaltyMembers from "./pages/admin/AdminLoyaltyMembers";
import AdminErrorLogs from "./pages/admin/AdminErrorLogs";
import AdminUserProfile from "./pages/admin/AdminUserProfile";
import AdminTeamManagement from "./pages/admin/AdminTeamManagement";
import AdminAllReports from "./pages/admin/AdminAllReports";
import AdminImpersonationLogs from "./pages/admin/AdminImpersonationLogs";
import AdminAgreements from "./pages/admin/AdminAgreements";
import WriteReport from "./pages/WriteReport";
import ProfileSettings from "./pages/ProfileSettings";
import VenueLogin from "./pages/VenueLogin";
import AuthCallback from "./pages/AuthCallback";
import { VenuePortalGate } from "@/components/auth/VenuePortalGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PortalProvider>
          <VenuePortalOnlyRedirect />
          <ImpersonationProvider>
          <Routes>
            <Route path="/login" element={<VenueLogin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route element={<VenuePortalGate />}>
            {/* Venue Portal Routes */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/tables" element={<TableBooking />} />
            <Route path="/guests" element={<GuestList />} />
            <Route path="/guest-list" element={<GuestList />} />
            <Route path="/guest-list/create" element={<CreateGuestList />} />
            <Route path="/guest-list/settings/:listId" element={<GuestListSettings />} />
            <Route path="/crm" element={<SmartCRM />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/team-stats" element={<TeamStatistics />} />
            <Route path="/live" element={<LivePerformance />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/security" element={<SecurityCheckIn />} />
            <Route path="/checkin" element={<MobileCheckIn />} />
            <Route path="/mobile-security" element={<MobileSecurity />} />
            <Route path="/venues" element={<MultiVenueControl />} />
            <Route path="/tickets" element={<Ticketing />} />
            <Route path="/tickets/:ticketId" element={<TicketDetail />} />
            <Route path="/checkin/:listType/:guestId" element={<CheckInDetail />} />
            <Route path="/venue-info" element={<VenueInformation />} />
            <Route path="/floor-map" element={<FloorMapEditor />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/subscription" element={<SubscriptionPlan />} />
            <Route path="/commission" element={<CommissionTracking />} />
            <Route path="/pricing" element={<TableSettings />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/booking-settings" element={<BookingSettings />} />
            <Route path="/events" element={<Events />} />
            <Route path="/venue-events" element={<VenueEvents />} />
            <Route path="/events/create" element={<CreateEvent />} />
            <Route path="/events/:eventId/edit" element={<EditEvent />} />
            <Route path="/events/:eventId/tickets" element={<EventTicketing />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/booking-requests" element={<TableBookingRequests />} />
            <Route path="/table-settings" element={<TableSettings />} />
            <Route path="/campaigns/create" element={<CreateCampaign />} />
            <Route path="/reports/write" element={<WriteReport />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/profile/settings" element={<UserProfile />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/notifications" element={<Notifications />} />

            <Route path="*" element={<NotFound />} />
            </Route>

            {/* Admin Portal Routes - Protected by role */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "support", "finance", "operations", "viewer"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "viewer"]}>
                <AdminAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/admin/cities" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "operations"]}>
                <AdminCities />
              </ProtectedRoute>
            } />
            <Route path="/admin/cities/:cityId" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "operations"]}>
                <AdminCityEdit />
              </ProtectedRoute>
            } />
            <Route path="/admin/venues" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "operations", "viewer"]}>
                <AdminVenues />
              </ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "operations"]}>
                <AdminCategories />
              </ProtectedRoute>
            } />
            <Route path="/admin/venues/onboard" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "operations"]}>
                <AdminVenueOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/admin/venue/:venueId" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "operations", "viewer"]}>
                <AdminVenueDetail />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "support", "viewer"]}>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/events" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "viewer"]}>
                <AdminEvents />
              </ProtectedRoute>
            } />
            <Route path="/admin/loyalty" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator"]}>
                <AdminLoyalty />
              </ProtectedRoute>
            } />
            <Route path="/admin/loyalty/members/:level" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator"]}>
                <AdminLoyaltyMembers />
              </ProtectedRoute>
            } />
            <Route path="/admin/support" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "support"]}>
                <AdminSupport />
              </ProtectedRoute>
            } />
            <Route path="/admin/invoices" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "finance"]}>
                <AdminInvoices />
              </ProtectedRoute>
            } />
            <Route path="/admin/finance" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "finance"]}>
                <AdminFinance />
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing-tiers" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "finance"]}>
                <AdminPricingTiers />
              </ProtectedRoute>
            } />
            <Route path="/admin/commission-rates" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "finance"]}>
                <AdminCommissionRates />
              </ProtectedRoute>
            } />
            <Route path="/admin/payouts" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "finance"]}>
                <AdminPayouts />
              </ProtectedRoute>
            } />
            <Route path="/admin/subscriptions" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "finance"]}>
                <AdminSubscriptions />
              </ProtectedRoute>
            } />
            <Route path="/admin/access" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                <AdminAccess />
              </ProtectedRoute>
            } />
            <Route path="/admin/permissions" element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <AdminPermissions />
              </ProtectedRoute>
            } />
            <Route path="/admin/team" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                <AdminTeamManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/content" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator"]}>
                <AdminContent />
              </ProtectedRoute>
            } />
            <Route path="/admin/legal" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                <AdminLegal />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/guest/:guestId" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "support", "viewer"]}>
                <AdminGuestProfile />
              </ProtectedRoute>
            } />
            <Route path="/admin/error-logs" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                <AdminErrorLogs />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                <AdminAllReports />
              </ProtectedRoute>
            } />
            <Route path="/admin/impersonation-logs" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
                <AdminImpersonationLogs />
              </ProtectedRoute>
            } />
            <Route path="/admin/agreements" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "operations"]}>
                <AdminAgreements />
              </ProtectedRoute>
            } />
            <Route path="/admin/profile" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "support", "finance", "operations", "viewer"]}>
                <AdminUserProfile />
              </ProtectedRoute>
            } />
            <Route path="/admin/venue/:venueId/manage" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "operations"]}>
                <AdminVenueDetail />
              </ProtectedRoute>
            } />
            <Route path="/admin/venue/:venueId/manage/:section" element={
              <ProtectedRoute allowedRoles={["super_admin", "admin", "moderator", "operations"]}>
                <AdminVenueDetail />
              </ProtectedRoute>
            } />

          </Routes>
          </ImpersonationProvider>
        </PortalProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;