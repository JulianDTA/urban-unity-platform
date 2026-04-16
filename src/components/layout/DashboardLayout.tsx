import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import { ThemeProvider } from 'next-themes';
import Sidebar from './Sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationsBell } from '@/components/NotificationsBell';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        {/* Mobile header with hamburger */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-30 flex items-center justify-between px-4">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="ml-3 font-display font-bold text-lg text-sidebar-foreground">ResidenceHub</h1>
          </div>
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </div>

        {/* Desktop top-right controls */}
        <div className="hidden lg:flex fixed top-4 right-4 z-30 items-center gap-1">
          <NotificationsBell />
          <ThemeToggle />
        </div>

        <main className="lg:ml-64 min-h-screen">
          <div className="p-4 pt-20 lg:p-8 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
};

export default DashboardLayout;
