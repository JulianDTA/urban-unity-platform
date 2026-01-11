import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Users, Loader2, Shield, UserCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  apartment_number: string | null;
  created_at: string;
  role: 'super_admin' | 'admin' | 'resident';
}

const ManageUsers = () => {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, apartment_number, created_at');

    if (profilesError) {
      toast.error('Failed to load users');
      setLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      toast.error('Failed to load roles');
      setLoading(false);
      return;
    }

    const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role as 'super_admin' | 'admin' | 'resident']));

    const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => ({
      ...p,
      role: rolesMap.get(p.id) || 'resident',
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'resident') => {
    if (userId === currentUser?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    setUpdatingId(userId);

    // Delete existing role
    await supabase.from('user_roles').delete().eq('user_id', userId);

    // Insert new role
    const { error } = await supabase.from('user_roles').insert({
      user_id: userId,
      role: newRole,
    });

    if (error) {
      toast.error('Failed to update role');
    } else {
      toast.success('Role updated successfully');
      fetchUsers();
    }

    setUpdatingId(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <StatusBadge status="destructive">Super Admin</StatusBadge>;
      case 'admin':
        return <StatusBadge status="primary">Admin</StatusBadge>;
      case 'resident':
        return <StatusBadge status="muted">Resident</StatusBadge>;
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
            <h2 className="font-display text-2xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              Only Super Admins can access user management.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles and permissions
          </p>
        </div>

        {/* Users Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>View and manage user roles</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No users found</h3>
                <p className="text-muted-foreground">Users will appear here when they register.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Apartment</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Current Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Change Role</th>
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
                              <p className="font-medium">{user.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {user.apartment_number || '-'}
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-4 px-4">{getRoleBadge(user.role)}</td>
                        <td className="py-4 px-4">
                          {user.role === 'super_admin' ? (
                            <span className="text-sm text-muted-foreground">Cannot modify</span>
                          ) : user.id === currentUser?.id ? (
                            <span className="text-sm text-muted-foreground">Cannot modify self</span>
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
                                <SelectItem value="resident">Resident</SelectItem>
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
