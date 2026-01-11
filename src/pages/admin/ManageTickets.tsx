import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MessageSquare, Loader2, Lightbulb, AlertTriangle, Wrench, HelpCircle, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
    apartment_number: string | null;
  };
}

const categoryIcons: Record<string, React.ReactNode> = {
  suggestion: <Lightbulb className="w-4 h-4" />,
  complaint: <AlertTriangle className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
  other: <HelpCircle className="w-4 h-4" />,
};

const ManageTickets = () => {
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load tickets');
      setLoading(false);
      return;
    }
    
    const userIds = [...new Set((data || []).map(t => t.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, apartment_number')
      .in('id', userIds);
    
    const profilesMap = new Map(profiles?.map(p => [p.id, p]));
    const ticketsWithProfiles = (data || []).map(t => ({
      ...t,
      profiles: profilesMap.get(t.user_id),
    }));
    setTickets(ticketsWithProfiles as Ticket[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTickets();
    }
  }, [isAdmin]);

  const handleOpenEdit = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setAdminNotes(ticket.admin_notes || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsSubmitting(true);

    const { error } = await supabase
      .from('tickets')
      .update({
        status: newStatus,
        admin_notes: adminNotes || null,
      })
      .eq('id', selectedTicket.id);

    if (error) {
      toast.error('Failed to update ticket');
    } else {
      toast.success('Ticket updated successfully');
      fetchTickets();
      setIsDialogOpen(false);
    }

    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <StatusBadge status="primary">Open</StatusBadge>;
      case 'in_progress':
        return <StatusBadge status="warning">In Progress</StatusBadge>;
      case 'resolved':
        return <StatusBadge status="success">Resolved</StatusBadge>;
      case 'closed':
        return <StatusBadge status="muted">Closed</StatusBadge>;
      default:
        return <StatusBadge status="muted">{status}</StatusBadge>;
    }
  };

  const getCategoryLabel = (cat: string) => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Manage Tickets
          </h1>
          <p className="text-muted-foreground mt-1">
            View and respond to resident tickets
          </p>
        </div>

        {/* Update Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Update Ticket</DialogTitle>
              <DialogDescription>
                Update the status and add notes for this ticket
              </DialogDescription>
            </DialogHeader>
            {selectedTicket && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="font-semibold">{selectedTicket.subject}</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted by {selectedTicket.profiles?.full_name || selectedTicket.profiles?.email}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add a response or notes..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Ticket'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Tickets List */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>Resident suggestions, complaints, and requests</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No tickets yet</h3>
                <p className="text-muted-foreground">Tickets from residents will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-muted text-muted-foreground mt-0.5">
                          {categoryIcons[ticket.category]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold">{ticket.subject}</h4>
                            <StatusBadge status="muted">{getCategoryLabel(ticket.category)}</StatusBadge>
                            {getStatusBadge(ticket.status)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              By: {ticket.profiles?.full_name || ticket.profiles?.email}
                              {ticket.profiles?.apartment_number && ` (Apt ${ticket.profiles.apartment_number})`}
                            </span>
                            <span>•</span>
                            <span>{format(new Date(ticket.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          {ticket.admin_notes && (
                            <div className="mt-3 p-3 rounded-lg bg-success/10 border border-success/20">
                              <p className="text-xs font-medium text-success mb-1">Admin Response:</p>
                              <p className="text-sm">{ticket.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(ticket)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManageTickets;
