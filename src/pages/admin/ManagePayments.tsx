import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreditCard, Plus, Loader2, Edit2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Payment {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  payment_type: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
    apartment_number: string | null;
  };
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  apartment_number: string | null;
}

const ManagePayments = () => {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedUser, setSelectedUser] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentType, setPaymentType] = useState('');

  const fetchData = async () => {
    const [paymentsRes, profilesRes] = await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email, apartment_number'),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    
    if (paymentsRes.data && profilesRes.data) {
      const profilesMap = new Map(profilesRes.data.map(p => [p.id, p]));
      const paymentsWithProfiles = paymentsRes.data.map(p => ({
        ...p,
        profiles: profilesMap.get(p.user_id),
      }));
      setPayments(paymentsWithProfiles as Payment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !description.trim() || !amount || !dueDate || !paymentType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('payments').insert({
      user_id: selectedUser,
      description,
      amount: parseFloat(amount),
      due_date: dueDate,
      payment_type: paymentType,
    });

    if (error) {
      toast.error('Failed to create payment');
    } else {
      toast.success('Payment record created successfully');
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    }

    setIsSubmitting(false);
  };

  const handleMarkPaid = async (paymentId: string) => {
    const { error } = await supabase
      .from('payments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (error) {
      toast.error('Failed to update payment');
    } else {
      toast.success('Payment marked as paid');
      fetchData();
    }
  };

  const resetForm = () => {
    setSelectedUser('');
    setDescription('');
    setAmount('');
    setDueDate('');
    setPaymentType('');
  };

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

  const getUserDisplay = (profile: Profile) => {
    const name = profile.full_name || profile.email;
    const apt = profile.apartment_number ? ` (Apt ${profile.apartment_number})` : '';
    return `${name}${apt}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-primary" />
              Manage Payments
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage resident payment records
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Payment Record</DialogTitle>
                <DialogDescription>
                  Create a new payment or charge for a resident
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Resident *</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resident" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {getUserDisplay(profile)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Type *</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly_dues">Monthly Dues</SelectItem>
                      <SelectItem value="fine">Fine</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., January 2024 Monthly Dues"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount ($) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date *</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Payment'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Payments Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>All Payment Records</CardTitle>
            <CardDescription>View and manage all resident payments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No payment records</h3>
                <p className="text-muted-foreground">Create your first payment record.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Resident</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Due Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium">{payment.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{payment.profiles?.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">{payment.description}</td>
                        <td className="py-4 px-4 font-semibold">${Number(payment.amount).toFixed(2)}</td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {format(new Date(payment.due_date), 'MMM d, yyyy')}
                        </td>
                        <td className="py-4 px-4">{getStatusBadge(payment.status)}</td>
                        <td className="py-4 px-4">
                          {payment.status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkPaid(payment.id)}
                              className="gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Mark Paid
                            </Button>
                          )}
                        </td>
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

export default ManagePayments;
