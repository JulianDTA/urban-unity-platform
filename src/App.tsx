import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import News from "./pages/News";
import Payments from "./pages/Payments";
import Reservations from "./pages/Reservations";
import Tickets from "./pages/Tickets";
import Chat from "./pages/Chat";
import ManagePayments from "./pages/admin/ManagePayments";
import ManageTickets from "./pages/admin/ManageTickets";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageReservations from "./pages/admin/ManageReservations";
import ManageResources from "./pages/admin/ManageResources";
import ManageDues from "./pages/admin/ManageDues";
import ReservationReports from "./pages/admin/ReservationReports";
import ManageAccess from "./pages/admin/ManageAccess";
import Dues from "./pages/Dues";
import MyAccess from "./pages/MyAccess";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/news" element={<News />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/admin/payments" element={<ManagePayments />} />
            <Route path="/admin/tickets" element={<ManageTickets />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/reservations" element={<ManageReservations />} />
            <Route path="/admin/resources" element={<ManageResources />} />
            <Route path="/admin/dues" element={<ManageDues />} />
            <Route path="/admin/reports" element={<ReservationReports />} />
            <Route path="/admin/access" element={<ManageAccess />} />
            <Route path="/dues" element={<Dues />} />
            <Route path="/my-access" element={<MyAccess />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
