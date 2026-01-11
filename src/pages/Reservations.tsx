import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CalendarDays, Plus, Loader2, TreesIcon, Building, Car, X } from 'lucide-react';
import { format, addHours, startOfDay, setHours, setMinutes, isBefore } from 'date-fns';
import { toast } from 'sonner';

interface Resource {
  id: string;
  name: string;
  description: string | null;
  max_hours_per_booking: number | null;
}

interface Reservation {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  resources?: Resource;
}

const resourceIcons: Record<string, React.ReactNode> = {
  'Green Spaces': <TreesIcon className="w-5 h-5" />,
  'Community Hall': <Building className="w-5 h-5" />,
  'Visitor Parking': <Car className="w-5 h-5" />,
};

const timeSlots = Array.from({ length: 14 }, (_, i) => {
  const hour = 8 + i;
  return {
    value: hour.toString(),
    label: format(setMinutes(setHours(new Date(), hour), 0), 'h:mm a'),
  };
});

const Reservations = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('2');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    if (!user) return;

    const [resourcesRes, reservationsRes] = await Promise.all([
      supabase.from('resources').select('*'),
      supabase
        .from('reservations')
        .select('*, resources(*)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true }),
    ]);

    if (resourcesRes.data) setResources(resourcesRes.data);
    if (reservationsRes.data) setReservations(reservationsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const checkAvailability = async (resourceId: string, startTime: Date, endTime: Date) => {
    const { data, error } = await supabase
      .from('reservations')
      .select('id')
      .eq('resource_id', resourceId)
      .eq('status', 'confirmed')
      .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

    return !error && (!data || data.length === 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedResource || !selectedStartTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startTime = setMinutes(setHours(selectedDate, parseInt(selectedStartTime)), 0);
    const endTime = addHours(startTime, parseInt(selectedDuration));

    if (isBefore(startTime, new Date())) {
      toast.error('Cannot book a time in the past');
      return;
    }

    setIsSubmitting(true);

    const isAvailable = await checkAvailability(selectedResource, startTime, endTime);
    if (!isAvailable) {
      toast.error('This time slot is already booked. Please choose another time.');
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from('reservations').insert({
      resource_id: selectedResource,
      user_id: user?.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: notes || null,
    });

    if (error) {
      toast.error('Failed to create reservation');
    } else {
      toast.success('Reservation created successfully');
      fetchData();
      setIsDialogOpen(false);
      resetForm();
    }

    setIsSubmitting(false);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast.error('Failed to cancel reservation');
    } else {
      toast.success('Reservation cancelled');
      fetchData();
    }
  };

  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedResource('');
    setSelectedStartTime('');
    setSelectedDuration('2');
    setNotes('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-primary" />
              Reservations
            </h1>
            <p className="text-muted-foreground mt-1">
              Book common spaces and amenities
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Make a Reservation</DialogTitle>
                <DialogDescription>
                  Book a space for your event or activity
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Resource *</Label>
                  <Select value={selectedResource} onValueChange={setSelectedResource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map((resource) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          <div className="flex items-center gap-2">
                            {resourceIcons[resource.name] || <Building className="w-4 h-4" />}
                            {resource.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                    className="rounded-md border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration *</Label>
                    <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="3">3 hours</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional details..."
                    rows={3}
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
                        Booking...
                      </>
                    ) : (
                      'Book Now'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Available Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <Card key={resource.id} className="card-elevated">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    {resourceIcons[resource.name] || <Building className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{resource.name}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* My Reservations */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>My Upcoming Reservations</CardTitle>
            <CardDescription>Your confirmed bookings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No upcoming reservations</h3>
                <p className="text-muted-foreground">Book a space to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.map((reservation) => (
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
                        {reservation.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{reservation.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status="success">Confirmed</StatusBadge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancel(reservation.id)}
                      >
                        <X className="w-4 h-4" />
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

export default Reservations;
