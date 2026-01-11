import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MessageSquare, Plus, Loader2, Lightbulb, AlertTriangle, Wrench, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  suggestion: <Lightbulb className="w-4 h-4" />,
  complaint: <AlertTriangle className="w-4 h-4" />,
  maintenance: <Wrench className="w-4 h-4" />,
  other: <HelpCircle className="w-4 h-4" />,
};

const Tickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const fetchTickets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load tickets');
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !description.trim() || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('tickets').insert({
      user_id: user?.id,
      subject,
      description,
      category,
    });

    if (error) {
      toast.error('Failed to create ticket');
    } else {
      toast.success('Ticket submitted successfully');
      fetchTickets();
      setIsDialogOpen(false);
      resetForm();
    }

    setIsSubmitting(false);
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setCategory('');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              Suggestions & Complaints
            </h1>
            <p className="text-muted-foreground mt-1">
              Submit and track your requests
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit a Ticket</DialogTitle>
                <DialogDescription>
                  Share your suggestion or report an issue
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggestion">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-warning" />
                          Suggestion
                        </div>
                      </SelectItem>
                      <SelectItem value="complaint">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          Complaint
                        </div>
                      </SelectItem>
                      <SelectItem value="maintenance">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-primary" />
                          Maintenance Request
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          Other
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your request"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about your request..."
                    rows={5}
                    required
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
                        Submitting...
                      </>
                    ) : (
                      'Submit Ticket'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tickets List */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>My Tickets</CardTitle>
            <CardDescription>All your submitted requests</CardDescription>
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
                <p className="text-muted-foreground">Submit a ticket to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted text-muted-foreground mt-0.5">
                          {categoryIcons[ticket.category]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{ticket.subject}</h4>
                            <StatusBadge status="muted">{getCategoryLabel(ticket.category)}</StatusBadge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {ticket.description}
                          </p>
                          {ticket.admin_notes && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/50">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Admin Response:</p>
                              <p className="text-sm">{ticket.admin_notes}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(ticket.status)}
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

export default Tickets;
