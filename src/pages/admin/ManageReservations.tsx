import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Loader2, TreesIcon, Building, Car, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Resource {
  id: string;
  name: string;
  description: string | null;
}

interface Reservation {
  id: string;
  resource_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  resources?: Resource;
  profiles?: {
    full_name: string | null;
    apartment_number: string | null;
    email: string | null;
  };
}

const resourceIcons: Record<string, React.ReactNode> = {
  'Green Spaces': <TreesIcon className="w-5 h-5" />,
  'Community Hall': <Building className="w-5 h-5" />,
  'Visitor Parking': <Car className="w-5 h-5" />,
};

const ManageReservations = () => {
  const { isAdmin } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchReservations = async () => {
    const { data: reservationsData } = await supabase
      .from('reservations')
      .select('*, resources(*)')
      .order('start_time', { ascending: true });

    if (reservationsData) {
      const userIds = [...new Set(reservationsData.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, apartment_number, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const reservationsWithProfiles = reservationsData.map(r => ({
        ...r,
        profiles: profileMap.get(r.user_id) || null
      }));
      setReservations(reservationsWithProfiles as Reservation[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'confirmed' })
      .eq('id', id);

    if (error) {
      toast.error('Failed to approve reservation');
    } else {
      toast.success('Reservation approved');
      fetchReservations();
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this reservation?')) return;
    
    setProcessingId(id);
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast.error('Failed to reject reservation');
    } else {
      toast.success('Reservation rejected');
      fetchReservations();
    }
    setProcessingId(null);
  };

  const pendingReservations = reservations.filter(r => r.status === 'pending');
  const confirmedReservations = reservations.filter(r => r.status === 'confirmed');
  const cancelledReservations = reservations.filter(r => r.status === 'cancelled');

  const renderReservationCard = (reservation: Reservation, showActions: boolean = false) => (
    <div
      key={reservation.id}
      className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          {resourceIcons[reservation.resources?.name || ''] || <Building className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-semibold">{reservation.resources?.name}</h4>
          <p className="text-sm text-muted-foreground">
            {format(new Date(reservation.start_time), 'MMM d, yyyy')} •{' '}
            {format(new Date(reservation.start_time), 'h:mm a')} -{' '}
            {format(new Date(reservation.end_time), 'h:mm a')}
          </p>
          <p className="text-sm text-muted-foreground">
            Requested by: {reservation.profiles?.full_name || 'Unknown'} 
            {reservation.profiles?.apartment_number && ` (Apt ${reservation.profiles.apartment_number})`}
          </p>
          {reservation.notes && (
            <p className="text-sm text-muted-foreground mt-1 italic">"{reservation.notes}"</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showActions ? (
          <>
            <Button
              size="sm"
              onClick={() => handleApprove(reservation.id)}
              disabled={processingId === reservation.id}
            >
              {processingId === reservation.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleReject(reservation.id)}
              disabled={processingId === reservation.id}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </>
        ) : (
          <StatusBadge 
            status={
              reservation.status === 'confirmed' ? 'success' : 
              reservation.status === 'cancelled' ? 'destructive' : 'warning'
            }
          >
            {reservation.status === 'confirmed' ? 'Confirmed' : 
             reservation.status === 'cancelled' ? 'Cancelled' : 'Pending'}
          </StatusBadge>
        )}
      </div>
    </div>
  );

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-primary" />
            Manage Reservations
          </h1>
          <p className="text-muted-foreground mt-1">
            Approve or reject resident reservation requests
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingReservations.length > 0 && (
                <span className="ml-2 bg-warning text-warning-foreground text-xs px-2 py-0.5 rounded-full">
                  {pendingReservations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Pending Reservations</CardTitle>
                <CardDescription>Reservations awaiting your approval</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : pendingReservations.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">No pending reservations</h3>
                    <p className="text-muted-foreground">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingReservations.map(r => renderReservationCard(r, true))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="confirmed" className="mt-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Confirmed Reservations</CardTitle>
                <CardDescription>Approved reservations</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : confirmedReservations.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">No confirmed reservations</h3>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {confirmedReservations.map(r => renderReservationCard(r, false))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Cancelled Reservations</CardTitle>
                <CardDescription>Rejected or cancelled reservations</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : cancelledReservations.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">No cancelled reservations</h3>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cancelledReservations.map(r => renderReservationCard(r, false))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ManageReservations;
