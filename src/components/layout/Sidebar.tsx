import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Newspaper, 
  CreditCard, 
  Calendar, 
  MessageSquare, 
  MessageCircle,
  Users,
  LogOut,
  Building2,
  X,
  Settings,
  DollarSign,
  Receipt
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const { role, signOut, user, isAdmin, isSuperAdmin } = useAuth();

  const getNavItems = () => {
    const baseItems = [
      { icon: Home, label: 'Dashboard', path: '/dashboard' },
      { icon: Newspaper, label: 'News', path: '/news' },
    ];

    if (role === 'resident') {
      return [
        ...baseItems,
        { icon: CreditCard, label: 'My Payments', path: '/payments' },
        { icon: Receipt, label: 'Mis Alícuotas', path: '/dues' },
        { icon: Calendar, label: 'Reservations', path: '/reservations' },
        { icon: MessageSquare, label: 'Tickets', path: '/tickets' },
        { icon: MessageCircle, label: 'Chat', path: '/chat' },
      ];
    }

    if (isAdmin) {
      return [
        ...baseItems,
        { icon: CreditCard, label: 'Manage Payments', path: '/admin/payments' },
        { icon: Receipt, label: 'Gestión Alícuotas', path: '/admin/dues' },
        { icon: Calendar, label: 'Manage Reservations', path: '/admin/reservations' },
        { icon: DollarSign, label: 'Resource Pricing', path: '/admin/resources' },
        { icon: MessageSquare, label: 'Manage Tickets', path: '/admin/tickets' },
        { icon: MessageCircle, label: 'Chat', path: '/chat' },
        ...(isSuperAdmin ? [{ icon: Users, label: 'User Management', path: '/admin/users' }] : []),
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  // Close sidebar when route changes (mobile)
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-sidebar flex flex-col z-50 transition-transform duration-300",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Close button for mobile */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-sidebar-foreground">ResidenceHub</h1>
              <p className="text-xs text-sidebar-foreground/50 capitalize">{role || 'Loading...'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'nav-item',
                  isActive && 'nav-item-active'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Link
            to="/profile"
            className={cn(
              'nav-item mb-1',
              location.pathname === '/profile' && 'nav-item-active'
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Profile Settings</span>
          </Link>
          <button
            onClick={signOut}
            className="nav-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
