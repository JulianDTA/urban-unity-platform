import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { CreditCard, DollarSign, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Payment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  payment_type: string;
  status: string;
  created_at: string;
}

const Payments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, overdue: 0 });

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: false });

      if (error) {
        toast.error('Failed to load payments');
      } else {
        setPayments(data || []);
        
        const sum = (data || []).reduce((acc, p) => {
          acc.total += Number(p.amount);
          if (p.status === 'paid') acc.paid += Number(p.amount);
          if (p.status === 'pending') acc.pending += Number(p.amount);
          if (p.status === 'overdue') acc.overdue += Number(p.amount);
          return acc;
        }, { total: 0, paid: 0, pending: 0, overdue: 0 });
        setSummary(sum);
      }
      setLoading(false);
    };

    fetchPayments();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <StatusBadge status="success">Paid</StatusBadge>;
      case 'pending':
        return <StatusBadge status="warning">Pending</StatusBadge>;
      case 'overdue':
        return <StatusBadge status="destructive">Overdue</StatusBadge>;
      default:
        return <StatusBadge status="muted">{status}</StatusBadge>;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly_dues':
        return 'Monthly Dues';
      case 'fine':
        return 'Fine';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            My Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            View and track your payment history and outstanding balances
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Billed"
            value={`$${summary.total.toFixed(2)}`}
            subtitle="All time"
            icon={DollarSign}
            variant="default"
          />
          <StatCard
            title="Amount Paid"
            value={`$${summary.paid.toFixed(2)}`}
            subtitle="Completed payments"
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Pending"
            value={`$${summary.pending.toFixed(2)}`}
            subtitle="Awaiting payment"
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Overdue"
            value={`$${summary.overdue.toFixed(2)}`}
            subtitle="Past due date"
            icon={AlertCircle}
            variant="destructive"
          />
        </div>

        {/* Payment History */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>All your charges and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No payments found</h3>
                <p className="text-muted-foreground">Your payment history will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Due Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4 font-medium">{payment.description}</td>
                        <td className="py-4 px-4 text-muted-foreground">{getPaymentTypeLabel(payment.payment_type)}</td>
                        <td className="py-4 px-4 font-semibold">${Number(payment.amount).toFixed(2)}</td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {format(new Date(payment.due_date), 'MMM d, yyyy')}
                        </td>
                        <td className="py-4 px-4">{getStatusBadge(payment.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Payments;
