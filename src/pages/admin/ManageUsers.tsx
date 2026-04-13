import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Users, Loader2, Shield, UserCircle, Building } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ApartmentType {
  id: string;
  name: string;
  monthly_fee: number;
}

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  apartment_number: string | null;
  apartment_type_id: string | null;
  created_at: string;
  role: 'super_admin' | 'admin' | 'resident';
}

const ManageUsers = () => {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [apartmentTypes, setApartmentTypes] = useState<ApartmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingAptId, setUpdatingAptId] = useState<string | null>(null);

  const fetchData = async () => {
    const [profilesRes, rolesRes, aptTypesRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, apartment_number, apartment_type_id, created_at'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('apartment_types').select('id, name, monthly_fee'),
    ]);

    if (profilesRes.error || rolesRes.error) {
      toast.error('Error al cargar usuarios');
      setLoading(false);
      return;
    }

    setApartmentTypes(aptTypesRes.data || []);

    const rolesMap = new Map(rolesRes.data?.map((r) => [r.user_id, r.role as UserWithRole['role']]));

    const usersWithRoles: UserWithRole[] = (profilesRes.data || []).map((p) => ({
      ...p,
      role: rolesMap.get(p.id) || 'resident',
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'resident') => {
    if (userId === currentUser?.id) {
      toast.error("No puedes cambiar tu propio rol");
      return;
    }

    setUpdatingId(userId);
    await supabase.from('user_roles').delete().eq('user_id', userId);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });

    if (error) {
      toast.error('Error al actualizar rol');
    } else {
      toast.success('Rol actualizado');
      fetchData();
    }
    setUpdatingId(null);
  };

  const handleApartmentTypeChange = async (userId: string, aptTypeId: string) => {
    setUpdatingAptId(userId);
    const value = aptTypeId === 'none' ? null : aptTypeId;
    const { error } = await supabase.from('profiles').update({ apartment_type_id: value }).eq('id', userId);

    if (error) {
      toast.error('Error al asignar tipo de apartamento');
    } else {
      toast.success('Tipo de apartamento actualizado');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, apartment_type_id: value } : u)));
    }
    setUpdatingAptId(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <StatusBadge status="destructive">Super Admin</StatusBadge>;
      case 'admin':
        return <StatusBadge status="primary">Admin</StatusBadge>;
      case 'resident':
        return <StatusBadge status="muted">Residente</StatusBadge>;
      default:
        return <StatusBadge status="muted">{role}</StatusBadge>;
    }
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="card-elevated p-8 text-center">
            <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold">Acceso Denegado</h2>
            <p className="text-muted-foreground mt-2">Solo los Super Admins pueden gestionar usuarios.</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Gestión de Usuarios
          </h1>
          <p className="text-muted-foreground mt-1">Administra roles y tipos de apartamento</p>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Todos los Usuarios</CardTitle>
            <CardDescription>Gestiona roles y asigna tipos de apartamento</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No hay usuarios</h3>
                <p className="text-muted-foreground">Los usuarios aparecerán aquí al registrarse.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Usuario</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Apartamento</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tipo Apto.</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Registro</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Rol</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cambiar Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCircle className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{user.apartment_number || '-'}</td>
                        <td className="py-4 px-4">
                          <Select
                            value={user.apartment_type_id || 'none'}
                            onValueChange={(value) => handleApartmentTypeChange(user.id, value)}
                            disabled={updatingAptId === user.id}
                          >
                            <SelectTrigger className="w-40">
                              {updatingAptId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <SelectValue placeholder="Sin asignar" />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin asignar</SelectItem>
                              {apartmentTypes.map((apt) => (
                                <SelectItem key={apt.id} value={apt.id}>
                                  {apt.name} (${apt.monthly_fee})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {format(new Date(user.created_at), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-4 px-4">{getRoleBadge(user.role)}</td>
                        <td className="py-4 px-4">
                          {user.role === 'super_admin' ? (
                            <span className="text-sm text-muted-foreground">No modificable</span>
                          ) : user.id === currentUser?.id ? (
                            <span className="text-sm text-muted-foreground">No modificable</span>
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'resident')}
                              disabled={updatingId === user.id}
                            >
                              <SelectTrigger className="w-32">
                                {updatingId === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="resident">Residente</SelectItem>
                              </SelectContent>
                            </Select>
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

export default ManageUsers;
