import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Newspaper, CreditCard, Calendar, MessageSquare, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface PaymentSummary {
  total: number;
  pending: number;
  overdue: number;
}

const Dashboard = () => {
  const { user, role, isAdmin } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({ total: 0, pending: 0, overdue: 0 });
  const [upcomingReservations, setUpcomingReservations] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      // Fetch latest news
      const { data: newsData } = await supabase
        .from('news')
        .select('id, title, content, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (newsData) setNews(newsData);

      // Fetch payment summary for residents
      if (!isAdmin) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('user_id', user.id);
        
        if (paymentsData) {
          const summary = paymentsData.reduce((acc, p) => {
            acc.total += Number(p.amount);
            if (p.status === 'pending') acc.pending += Number(p.amount);
            if (p.status === 'overdue') acc.overdue += Number(p.amount);
            return acc;
          }, { total: 0, pending: 0, overdue: 0 });
          setPaymentSummary(summary);
        }
      }

      // Fetch upcoming reservations
      const { count: reservationsCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('start_time', new Date().toISOString());
      
      setUpcomingReservations(reservationsCount || 0);

      // Fetch open tickets
      const ticketQuery = supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress']);
      
      if (!isAdmin) {
        ticketQuery.eq('user_id', user.id);
      }
      
      const { count: ticketsCount } = await ticketQuery;
      setOpenTickets(ticketsCount || 0);

      setLoading(false);
    };

    fetchDashboardData();
  }, [user, isAdmin]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold">
            Welcome back{role === 'resident' ? '' : `, ${role?.replace('_', ' ')}`}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening in your residential complex.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {!isAdmin && (
            <>
              <StatCard
                title="Outstanding Balance"
                value={`$${paymentSummary.pending + paymentSummary.overdue}`}
                subtitle="Pending payments"
                icon={DollarSign}
                variant={paymentSummary.overdue > 0 ? 'destructive' : paymentSummary.pending > 0 ? 'warning' : 'success'}
              />
              {paymentSummary.overdue > 0 && (
                <StatCard
                  title="Overdue Amount"
                  value={`$${paymentSummary.overdue}`}
                  subtitle="Requires immediate attention"
                  icon={AlertCircle}
                  variant="destructive"
                />
              )}
            </>
          )}
          <StatCard
            title="Upcoming Reservations"
            value={upcomingReservations}
            subtitle="Confirmed bookings"
            icon={Calendar}
            variant="primary"
          />
          <StatCard
            title={isAdmin ? 'Open Tickets' : 'My Tickets'}
            value={openTickets}
            subtitle="Awaiting resolution"
            icon={MessageSquare}
            variant={openTickets > 0 ? 'warning' : 'success'}
          />
          {isAdmin && (
            <StatCard
              title="Total News Posts"
              value={news.length}
              subtitle="Published announcements"
              icon={Newspaper}
              variant="default"
            />
          )}
        </div>

        {/* Latest News */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-primary" />
              Latest Announcements
            </CardTitle>
            <CardDescription>Stay updated with the latest news from your complex</CardDescription>
          </CardHeader>
          <CardContent>
            {news.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No announcements yet.</p>
            ) : (
              <div className="space-y-4">
                {news.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.content}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {!isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-elevated p-4 cursor-pointer hover:border-primary/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Make a Reservation</h3>
                  <p className="text-sm text-muted-foreground">Book a space</p>
                </div>
              </div>
            </Card>
            <Card className="card-elevated p-4 cursor-pointer hover:border-primary/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <MessageSquare className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold">Submit a Ticket</h3>
                  <p className="text-sm text-muted-foreground">Report an issue</p>
                </div>
              </div>
            </Card>
            <Card className="card-elevated p-4 cursor-pointer hover:border-primary/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <CreditCard className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold">View Payments</h3>
                  <p className="text-sm text-muted-foreground">Check your balance</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
