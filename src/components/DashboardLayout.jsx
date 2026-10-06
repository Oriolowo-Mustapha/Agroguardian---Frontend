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
        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
    )}
  >
    <Icon className={cn("h-5 w-5", active ? "text-white" : "group-hover:text-primary")} aria-hidden="true" />
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
    <button
      type="button"
      onClick={() => onMarkRead(notification._id)}
      className={cn(
        "w-full text-left p-4 border-b border-border cursor-pointer hover:bg-muted transition-colors flex gap-4 items-start",
        notification.status === 'unread' ? "bg-card" : "bg-muted/30 opacity-75"
      )}
    >
      <div className={cn("p-2 rounded-xl shrink-0", config.bg)}>
        <config.icon className={cn("h-4 w-4", config.color)} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm mb-0.5", notification.status === 'unread' ? "font-black text-foreground" : "font-bold text-muted-foreground")}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">{notification.message}</p>
        <p className="text-[11px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">
          {new Date(notification.createdAt).toLocaleDateString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {notification.status === 'unread' && (
        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
      )}
    </button>
  );
};

const DashboardLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout, user, setUser, isAuthenticated } = useAuthStore();
  const [avatarImgError, setAvatarImgError] = React.useState(false);

  const avatarInitial = (() => {
    const first = user?.firstName?.trim?.();
    if (first) return first.charAt(0).toUpperCase();

    const last = user?.lastName?.trim?.();
    if (last) return last.charAt(0).toUpperCase();

    const email = user?.email?.trim?.();
    if (email) return email.charAt(0).toUpperCase();

    return 'U';
  })();

  const avatarSrc = !avatarImgError ? user?.profilePicture : null;

  React.useEffect(() => {
    if (!isAuthenticated || user) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/auth/profile');
        const data = res.data?.data;
        if (!cancelled && data) setUser(data);
      } catch {
        // ignore; token refresh interceptor will redirect on auth failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, setUser]);

  React.useEffect(() => {
    if (!isNotificationsOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsNotificationsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isNotificationsOpen]);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => await api.patch('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  React.useEffect(() => {
    if (!isSidebarOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsSidebarOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isSidebarOpen]);

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
    <div className="min-h-screen bg-background flex">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside 
        id="app-sidebar"
        aria-label="Primary"
        className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-transform duration-300 transform md:translate-x-0 md:sticky md:top-0 md:h-screen",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 sm:p-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-primary p-2 rounded-lg">
                <Leaf className="text-white h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xl font-bold text-primary">AgroGuardian</span>
            </Link>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto px-4 pb-2 space-y-2">
            {menuItems.map((item) => (
              <SidebarItem 
                key={item.href}
                {...item}
                active={location.pathname === item.href}
                onClick={() => setIsSidebarOpen(false)}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-border">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded-xl transition-all min-h-11"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 md:h-20 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isSidebarOpen}
              aria-controls="app-sidebar"
              className="p-2 text-muted-foreground hover:bg-muted rounded-lg md:hidden"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
              {menuItems.find(item => item.href === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-6 relative">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                aria-expanded={isNotificationsOpen}
                className={cn(
                  "p-2 rounded-xl transition-all relative min-h-11 min-w-11",
                  isNotificationsOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-muted"
                )}
              >
                <Bell className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-4 px-1 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-card">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} aria-hidden="true" />
                  <div className="absolute right-0 mt-4 w-[calc(100%-2rem)] sm:w-80 md:w-96 bg-card rounded-3xl shadow-2xl border border-border overflow-hidden z-50 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 sm:p-6 bg-muted/50 border-b border-border flex items-center justify-between gap-3">
                      <h2 className="font-black text-foreground uppercase tracking-tight text-sm sm:text-base">Intelligence Alerts</h2>
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-[11px] font-black text-primary uppercase tracking-widest hover:underline shrink-0"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[min(400px,60vh)] overflow-y-auto">
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
                          <Bell className="h-12 w-12 text-border mx-auto mb-4" aria-hidden="true" />
                          <p className="text-sm font-bold text-muted-foreground">No active alerts</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => navigate('/profile')}
              aria-label="Profile settings"
              className={cn(
                "p-2 rounded-xl transition-all min-h-11 min-w-11",
                location.pathname === '/profile' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-muted"
              )}
            >
              <Settings className="h-6 w-6" aria-hidden="true" />
            </button>
            <Link to="/profile" aria-label="Open profile" className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold hover:bg-primary/20 transition-all overflow-hidden">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarImgError(true)}
                />
              ) : (
                avatarInitial
              )}
            </Link>
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
