import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Loader2, TreesIcon, Building, Car, DollarSign, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Resource {
  id: string;
  name: string;
  description: string | null;
  base_price: number | null;
  price_per_hour: number | null;
  max_hours_per_booking: number | null;
  available_from: string | null;
  available_until: string | null;
}

const resourceIcons: Record<string, React.ReactNode> = {
  'Green Spaces': <TreesIcon className="w-5 h-5" />,
  'Community Hall': <Building className="w-5 h-5" />,
  'Visitor Parking': <Car className="w-5 h-5" />,
};

const ManageResources = () => {
  const { isAdmin } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    base_price: '0',
    price_per_hour: '0',
    max_hours_per_booking: '4',
  });

  const fetchResources = async () => {
    const { data } = await supabase.from('resources').select('*');
    if (data) setResources(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const openEditDialog = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      description: resource.description || '',
      base_price: (resource.base_price || 0).toString(),
      price_per_hour: (resource.price_per_hour || 0).toString(),
      max_hours_per_booking: (resource.max_hours_per_booking || 4).toString(),
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingResource) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('resources')
      .update({
        description: formData.description,
        base_price: parseFloat(formData.base_price) || 0,
        price_per_hour: parseFloat(formData.price_per_hour) || 0,
        max_hours_per_booking: parseInt(formData.max_hours_per_booking) || 4,
      })
      .eq('id', editingResource.id);

    if (error) {
      toast.error('Failed to update resource');
    } else {
      toast.success('Resource updated successfully');
      fetchResources();
      setIsDialogOpen(false);
    }
    setIsSaving(false);
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

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
            <Settings className="w-8 h-8 text-primary" />
            Manage Resources & Pricing
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure resource descriptions, pricing, and booking limits
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6">
            {resources.map((resource) => (
              <Card key={resource.id} className="card-elevated">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        {resourceIcons[resource.name] || <Building className="w-5 h-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{resource.name}</CardTitle>
                        <CardDescription>{resource.description || 'No description'}</CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(resource)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Base Price</p>
                      <p className="font-semibold flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatPrice(resource.base_price)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Per Hour</p>
                      <p className="font-semibold flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatPrice(resource.price_per_hour)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Max Hours</p>
                      <p className="font-semibold">{resource.max_hours_per_booking || 4} hours</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Available</p>
                      <p className="font-semibold">{resource.available_from || '08:00'} - {resource.available_until || '22:00'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {editingResource?.name}</DialogTitle>
              <DialogDescription>
                Update pricing and configuration for this resource
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Resource description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Price ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Fixed fee per booking</p>
                </div>
                <div className="space-y-2">
                  <Label>Price Per Hour ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Additional cost per hour</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Max Hours Per Booking</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.max_hours_per_booking}
                  onChange={(e) => setFormData({ ...formData, max_hours_per_booking: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ManageResources;
