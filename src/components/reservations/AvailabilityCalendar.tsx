import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  setHours,
  setMinutes,
  isBefore,
  startOfDay
} from 'date-fns';

interface Reservation {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface AvailabilityCalendarProps {
  resourceId: string;
  resourceName: string;
  onSelectSlot?: (date: Date, hour: number) => void;
  selectedDate?: Date;
  selectedHour?: number;
}

const timeSlots = Array.from({ length: 14 }, (_, i) => 8 + i); // 8 AM to 9 PM

export const AvailabilityCalendar = ({ 
  resourceId, 
  resourceName, 
  onSelectSlot,
  selectedDate,
  selectedHour
}: AvailabilityCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!resourceId) return;
    
    const fetchReservations = async () => {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const { data } = await supabase
        .from('reservations')
        .select('id, start_time, end_time, status')
        .eq('resource_id', resourceId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString());
      
      setReservations(data || []);
      setLoading(false);
    };

    fetchReservations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`availability-${resourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `resource_id=eq.${resourceId}`
        },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resourceId, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getReservationsForDay = (day: Date) => {
    return reservations.filter(r => isSameDay(new Date(r.start_time), day));
  };

  const isSlotTaken = (day: Date, hour: number) => {
    const slotStart = setMinutes(setHours(day, hour), 0);
    const slotEnd = setMinutes(setHours(day, hour + 1), 0);
    
    return reservations.some(r => {
      const resStart = new Date(r.start_time);
      const resEnd = new Date(r.end_time);
      return resStart < slotEnd && resEnd > slotStart;
    });
  };

  const isPastSlot = (day: Date, hour: number) => {
    const slotStart = setMinutes(setHours(day, hour), 0);
    return isBefore(slotStart, new Date());
  };

  const handleDayClick = (day: Date) => {
    if (isBefore(startOfDay(day), startOfDay(new Date()))) return;
    setViewDate(viewDate && isSameDay(viewDate, day) ? null : day);
  };

  const handleSlotClick = (day: Date, hour: number) => {
    if (isPastSlot(day, hour) || isSlotTaken(day, hour)) return;
    onSelectSlot?.(day, hour);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{resourceName} Availability</CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {format(currentMonth, 'MMM yyyy')}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-3 text-xs mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-destructive/30" />
            <span>Taken</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-muted" />
            <span>Past</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {daysInMonth.map(day => {
                const dayReservations = getReservationsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                const isSelected = viewDate && isSameDay(viewDate, day);
                const hasBookings = dayReservations.length > 0;
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    disabled={isPast}
                    className={`
                      relative p-1 text-xs rounded-md transition-colors
                      ${isToday ? 'ring-1 ring-primary' : ''}
                      ${isPast ? 'text-muted-foreground/50 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'}
                      ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                    `}
                  >
                    {format(day, 'd')}
                    {hasBookings && !isPast && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-destructive" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Time slots view */}
            {viewDate && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs font-medium mb-2">
                  {format(viewDate, 'EEEE, MMMM d')} - Select a time slot
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {timeSlots.map(hour => {
                    const isTaken = isSlotTaken(viewDate, hour);
                    const isPast = isPastSlot(viewDate, hour);
                    const isSelectedSlot = selectedDate && selectedHour === hour && isSameDay(selectedDate, viewDate);
                    
                    return (
                      <button
                        key={hour}
                        onClick={() => handleSlotClick(viewDate, hour)}
                        disabled={isTaken || isPast}
                        className={`
                          p-1.5 text-xs rounded transition-colors
                          ${isPast ? 'bg-muted text-muted-foreground/50 cursor-not-allowed' : ''}
                          ${isTaken && !isPast ? 'bg-destructive/30 text-destructive-foreground cursor-not-allowed' : ''}
                          ${!isTaken && !isPast ? 'bg-primary/20 border border-primary/40 hover:bg-primary/30 cursor-pointer' : ''}
                          ${isSelectedSlot ? 'bg-primary text-primary-foreground' : ''}
                        `}
                      >
                        {format(setHours(new Date(), hour), 'ha')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
