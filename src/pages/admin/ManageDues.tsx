import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Building, Plus, Loader2, Send, CheckCircle, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApartmentType {
  id: string;
  name: string;
  monthly_fee: number;
  description: string | null;
}

interface Due {
  id: string;
  user_id: string;
  apartment_type_id: string | null;
  amount: number;
  month: number;
  year: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  apartment_number: string | null;
  apartment_type_id: string | null;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const ManageDues = () => {
  const { user } = useAuth();
  const [apartmentTypes, setApartmentTypes] = useState<ApartmentType[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Apartment type form
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [editingType, setEditingType] = useState<ApartmentType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeFee, setTypeFee] = useState('');
  const [typeDesc, setTypeDesc] = useState('');

  // Generate dues form
  const [genMonth, setGenMonth] = useState(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));

  // Filter
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));

  const fetchData = async () => {
    setLoading(true);
    const [typesRes, duesRes, profilesRes] = await Promise.all([
      supabase.from('apartment_types').select('*').order('name'),
      supabase.from('dues').select('*').eq('month', Number(filterMonth)).eq('year', Number(filterYear)).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);

    if (typesRes.data) setApartmentTypes(typesRes.data);
    if (duesRes.data) setDues(duesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterMonth, filterYear]);

  const handleSaveType = async () => {
    if (!typeName || !typeFee) { toast.error('Nombre y monto son requeridos'); return; }

    if (editingType) {
      const { error } = await supabase.from('apartment_types').update({
        name: typeName, monthly_fee: Number(typeFee), description: typeDesc || null,
      }).eq('id', editingType.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Tipo actualizado');
    } else {
      const { error } = await supabase.from('apartment_types').insert({
        name: typeName, monthly_fee: Number(typeFee), description: typeDesc || null,
      });
      if (error) { toast.error('Error al crear'); return; }
      toast.success('Tipo creado');
    }

    setShowTypeDialog(false);
    setEditingType(null);
    setTypeName(''); setTypeFee(''); setTypeDesc('');
    fetchData();
  };

  const handleDeleteType = async (id: string) => {
    const { error } = await supabase.from('apartment_types').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar. Puede tener alícuotas asociadas.'); return; }
    toast.success('Tipo eliminado');
    fetchData();
  };

  const handleGenerateDues = async () => {
    const month = Number(genMonth);
    const year = Number(genYear);
    
    // Get residents with apartment types
    const residentsWithTypes = profiles.filter(p => p.apartment_type_id);
    if (residentsWithTypes.length === 0) {
      toast.error('No hay residentes con tipo de apartamento asignado');
      return;
    }

    setGenerating(true);
    let created = 0;
    let skipped = 0;

    for (const resident of residentsWithTypes) {
      const aptType = apartmentTypes.find(t => t.id === resident.apartment_type_id);
      if (!aptType) continue;

      const { error } = await supabase.from('dues').insert({
        user_id: resident.id,
        apartment_type_id: resident.apartment_type_id,
        amount: aptType.monthly_fee,
        month,
        year,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') { skipped++; } // unique constraint - already exists
        else { toast.error(`Error generando alícuota para ${resident.full_name || resident.email}`); }
      } else {
        created++;
      }
    }

    // Send notifications to residents
    for (const resident of residentsWithTypes) {
      const aptType = apartmentTypes.find(t => t.id === resident.apartment_type_id);
      if (!aptType) continue;
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'new_dues_generated',
            recipientEmail: resident.email,
            recipientName: resident.full_name,
            month: MONTHS[month - 1],
            year: String(year),
            amount: aptType.monthly_fee.toFixed(2),
          },
        });
      } catch (e) {
        console.error('Failed to send notification to', resident.email, e);
      }
    }

    setGenerating(false);
    toast.success(`${created} alícuotas generadas, ${skipped} ya existían`);
    setFilterMonth(genMonth);
    setFilterYear(genYear);
    fetchData();
  };

  const handleUpdateStatus = async (dueId: string, newStatus: string) => {
    const updateData: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'paid') updateData.paid_at = new Date().toISOString();

    const { error } = await supabase.from('dues').update(updateData).eq('id', dueId);
    if (error) { toast.error('Error al actualizar'); return; }
    toast.success('Estado actualizado');
    fetchData();
  };

  const getProfileName = (userId: string) => {
    const p = profiles.find(pr => pr.id === userId);
    return p?.full_name || p?.email || 'Unknown';
  };

  const getProfileApt = (userId: string) => {
    const p = profiles.find(pr => pr.id === userId);
    return p?.apartment_number || '-';
  };

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
            <DollarSign className="w-8 h-8 text-primary" />
            Gestión de Alícuotas
          </h1>
          <p className="text-muted-foreground mt-1">Administra tipos de apartamento, genera y controla alícuotas mensuales</p>
        </div>

        <Tabs defaultValue="dues" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dues">Alícuotas</TabsTrigger>
            <TabsTrigger value="types">Tipos de Apartamento</TabsTrigger>
            <TabsTrigger value="generate">Generar Alícuotas</TabsTrigger>
          </TabsList>

          {/* DUES TAB */}
          <TabsContent value="dues" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-end">
              <div>
                <Label>Mes</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Año</Label>
                <Input type="number" value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-28" />
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total" value={`$${summary.total.toFixed(2)}`} icon={DollarSign} variant="default" />
              <StatCard title="Pagadas" value={`$${summary.paid.toFixed(2)}`} icon={CheckCircle} variant="success" />
              <StatCard title="Pendientes" value={`$${summary.pending.toFixed(2)}`} icon={Clock} variant="warning" />
              <StatCard title="Vencidas" value={`$${summary.overdue.toFixed(2)}`} icon={AlertCircle} variant="destructive" />
            </div>

            {/* Dues Table */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Alícuotas - {MONTHS[Number(filterMonth) - 1]} {filterYear}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : dues.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">No hay alícuotas para este período</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Residente</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Apto</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Monto</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dues.map(due => (
                          <tr key={due.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="py-4 px-4 font-medium">{getProfileName(due.user_id)}</td>
                            <td className="py-4 px-4">{getProfileApt(due.user_id)}</td>
                            <td className="py-4 px-4 font-semibold">${Number(due.amount).toFixed(2)}</td>
                            <td className="py-4 px-4">
                              {due.status === 'paid' && <StatusBadge status="success">Pagada</StatusBadge>}
                              {due.status === 'pending' && <StatusBadge status="warning">Pendiente</StatusBadge>}
                              {due.status === 'overdue' && <StatusBadge status="destructive">Vencida</StatusBadge>}
                            </td>
                            <td className="py-4 px-4">
                              <Select value={due.status} onValueChange={(v) => handleUpdateStatus(due.id, v)}>
                                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendiente</SelectItem>
                                  <SelectItem value="paid">Pagada</SelectItem>
                                  <SelectItem value="overdue">Vencida</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APARTMENT TYPES TAB */}
          <TabsContent value="types" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tipos de Apartamento</h2>
              <Dialog open={showTypeDialog} onOpenChange={(open) => {
                setShowTypeDialog(open);
                if (!open) { setEditingType(null); setTypeName(''); setTypeFee(''); setTypeDesc(''); }
              }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Agregar Tipo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingType ? 'Editar' : 'Nuevo'} Tipo de Apartamento</DialogTitle>
                    <DialogDescription>Define el nombre y la cuota mensual</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Nombre</Label><Input value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="Ej: 2 Habitaciones" /></div>
                    <div><Label>Cuota Mensual ($)</Label><Input type="number" value={typeFee} onChange={e => setTypeFee(e.target.value)} placeholder="0.00" /></div>
                    <div><Label>Descripción (opcional)</Label><Input value={typeDesc} onChange={e => setTypeDesc(e.target.value)} placeholder="Descripción del tipo" /></div>
                    <Button onClick={handleSaveType} className="w-full">{editingType ? 'Actualizar' : 'Crear'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apartmentTypes.map(type => (
                <Card key={type.id} className="card-elevated">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building className="w-5 h-5 text-primary" />{type.name}
                        </CardTitle>
                        {type.description && <CardDescription>{type.description}</CardDescription>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingType(type);
                          setTypeName(type.name);
                          setTypeFee(String(type.monthly_fee));
                          setTypeDesc(type.description || '');
                          setShowTypeDialog(true);
                        }}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteType(type.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary">${Number(type.monthly_fee).toFixed(2)}<span className="text-sm text-muted-foreground font-normal">/mes</span></p>
                  </CardContent>
                </Card>
              ))}
              {apartmentTypes.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-8">No hay tipos de apartamento. Crea uno para comenzar.</p>
              )}
            </div>
          </TabsContent>

          {/* GENERATE TAB */}
          <TabsContent value="generate" className="space-y-6">
            <Card className="card-elevated max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="w-5 h-5" />Generar Alícuotas Mensuales</CardTitle>
                <CardDescription>Genera automáticamente las alícuotas para todos los residentes con tipo de apartamento asignado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Mes</Label>
                  <Select value={genMonth} onValueChange={setGenMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Año</Label>
                  <Input type="number" value={genYear} onChange={e => setGenYear(e.target.value)} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {profiles.filter(p => p.apartment_type_id).length} residentes con tipo asignado
                </p>
                <Button onClick={handleGenerateDues} disabled={generating} className="w-full">
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando...</> : 'Generar Alícuotas'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ManageDues;
