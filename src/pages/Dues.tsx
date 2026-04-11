import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { DollarSign, CheckCircle, Clock, AlertCircle, Loader2, Receipt } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface Due {
  id: string;
  amount: number;
  month: number;
  year: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
}

const Dues = () => {
  const { user } = useAuth();
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDues = async () => {
      const { data, error } = await supabase
        .from('dues')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) toast.error('Error al cargar alícuotas');
      else setDues(data || []);
      setLoading(false);
    };
    fetchDues();

    // Real-time
    const channel = supabase.channel('my-dues')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dues', filter: `user_id=eq.${user.id}` }, () => fetchDues())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const summary = dues.reduce((acc, d) => {
    acc.total += Number(d.amount);
    if (d.status === 'paid') acc.paid += Number(d.amount);
    if (d.status === 'pending') acc.pending += Number(d.amount);
    if (d.status === 'overdue') acc.overdue += Number(d.amount);
    return acc;
  }, { total: 0, paid: 0, pending: 0, overdue: 0 });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" />
            Mis Alícuotas
          </h1>
          <p className="text-muted-foreground mt-1">Consulta el estado de tus cuotas de mantenimiento</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total" value={`$${summary.total.toFixed(2)}`} icon={DollarSign} variant="default" />
          <StatCard title="Pagadas" value={`$${summary.paid.toFixed(2)}`} icon={CheckCircle} variant="success" />
          <StatCard title="Pendientes" value={`$${summary.pending.toFixed(2)}`} icon={Clock} variant="warning" />
          <StatCard title="Vencidas" value={`$${summary.overdue.toFixed(2)}`} icon={AlertCircle} variant="destructive" />
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Historial de Alícuotas</CardTitle>
            <CardDescription>Todas tus cuotas de mantenimiento</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : dues.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">Sin alícuotas</h3>
                <p className="text-muted-foreground">Tu historial de alícuotas aparecerá aquí.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Período</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Monto</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dues.map(due => (
                      <tr key={due.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4 font-medium">{MONTHS[due.month - 1]} {due.year}</td>
                        <td className="py-4 px-4 font-semibold">${Number(due.amount).toFixed(2)}</td>
                        <td className="py-4 px-4">
                          {due.status === 'paid' && <StatusBadge status="success">Pagada</StatusBadge>}
                          {due.status === 'pending' && <StatusBadge status="warning">Pendiente</StatusBadge>}
                          {due.status === 'overdue' && <StatusBadge status="destructive">Vencida</StatusBadge>}
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

export default Dues;
