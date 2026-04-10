import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map as FarmIcon, 
  Stethoscope, 
  CloudSun, 
  CreditCard, 
  LogOut, 
  Menu, 
  X,
  Leaf,
  Settings,
  Bell,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Info,
  PawPrint,
  Heart
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import useAuthStore from '../store/authStore';
import { Button, cn } from './ui/Button';

const SidebarItem = ({ icon: Icon, label, href, active, onClick }) => (
  <Link 
    to={href} 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-primary text-white shadow-lg shadow-primary/20" 
        : "text-gray-500 hover:bg-primary/10 hover:text-primary"
    )}
  >
    <Icon className={cn("h-5 w-5", active ? "text-white" : "group-hover:text-primary")} />
    <span className="font-medium">{label}</span>
  </Link>
);

const NotificationItem = ({ notification, onMarkRead }) => {
  const icons = {
    diagnosis: { icon: Stethoscope, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    weather: { icon: CloudSun, color: 'text-amber-600', bg: 'bg-amber-50' },
    treatment: { icon: Zap, color: 'text-green-600', bg: 'bg-green-50' },
    system: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' }
  };
  const config = icons[notification.type] || icons.system;

  return (
    <div 
      onClick={() => onMarkRead(notification._id)}
      className={cn(
        "p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors flex gap-4 items-start",
        notification.status === 'unread' ? "bg-white" : "bg-gray-50/30 opacity-75"
      )}
    >
      <div className={cn("p-2 rounded-xl shrink-0", config.bg)}>
        <config.icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1">
        <p className={cn("text-sm mb-0.5", notification.status === 'unread' ? "font-black text-gray-900" : "font-bold text-gray-500")}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 font-medium leading-relaxed">{notification.message}</p>
        <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest">
          {new Date(notification.createdAt).toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {notification.status === 'unread' && (
        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
      )}
    </div>
  );
};

const DashboardLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout, user } = useAuthStore();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data.data;
    },
    refetchInterval: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => await api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => await api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  });

  const unreadCount = notifications?.filter(n => n.status === 'unread').length || 0;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
    { icon: FarmIcon, label: 'My Farms', href: '/farms' },
    { icon: PawPrint, label: 'Livestock', href: '/livestock' },
    { icon: Stethoscope, label: 'Crop Diagnosis', href: '/diagnosis' },
    { icon: Heart, label: 'Livestock Health', href: '/livestock-diagnosis' },
    { icon: CloudSun, label: 'Weather & Risks', href: '/weather' },
    { icon: ShieldCheck, label: 'Resilience Index', href: '/resilience' },
    { icon: CreditCard, label: 'Carbon Credits', href: '/credits' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transition-transform duration-300 transform md:translate-x-0 md:sticky md:top-0 md:h-screen",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-primary p-2 rounded-lg">
                <Leaf className="text-white h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-primary">AgroGuardian</span>
            </Link>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {menuItems.map((item) => (
              <SidebarItem 
                key={item.href}
                {...item}
                active={location.pathname === item.href}
                onClick={() => setIsSidebarOpen(false)}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 hidden md:block">
              {menuItems.find(item => item.href === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-6 relative">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-2 rounded-xl transition-all relative",
                  isNotificationsOpen ? "bg-primary/10 text-primary" : "text-gray-400 hover:text-primary hover:bg-gray-50"
                )}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 h-4 w-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-4 w-[calc(100vw-2rem)] sm:w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-black text-gray-900 uppercase tracking-tight">Intelligence Alerts</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notifications?.length > 0 ? (
                        notifications.map(n => (
                          <NotificationItem 
                            key={n._id} 
                            notification={n} 
                            onMarkRead={(id) => {
                              markReadMutation.mutate(id);
                              if (n.link) {
                                navigate(n.link);
                                setIsNotificationsOpen(false);
                              }
                            }} 
                          />
                        ))
                      ) : (
                        <div className="p-12 text-center">
                          <Bell className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                          <p className="text-sm font-bold text-gray-400">No active alerts</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-xl transition-all">
              <Settings className="h-6 w-6" />
            </button>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
