import { useState, useEffect, useRef } from 'react';
import { Bell, Check, AlertTriangle, Info, Calendar } from 'lucide-react';
import api from '@/lib/api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState('default');
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Check push support on mount
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPermissionState(Notification.permission);
      
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsSubscribed(!!subscription);
        });
      }).catch(err => {
        console.warn('Service worker not ready for push check:', err);
      });
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribePush = async () => {
    if (!pushSupported) return;

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== 'granted') {
        alert('Notification permission denied by browser.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Fetch dynamic VAPID Key from backend
      const keyRes = await api.get('/notifications/vapid-key');
      const vapidPublicKey = keyRes.data.publicKey;

      // Subscribe device to FCM/push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Submit push subscription payload
      await api.post('/notifications/register-push', { subscription });
      setIsSubscribed(true);
      alert('Desktop/Phone native notifications successfully enabled!');
    } catch (err) {
      console.error('Push subscription failed:', err);
      alert('Could not enable push notifications. Check connection or try again.');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all cursor-pointer border border-border/20"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-destructive-foreground animate-bounce border-2 border-background">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border shadow-2xl rounded-3xl z-[999] overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between p-4 border-b border-border/40 bg-background/50">
            <span className="font-extrabold text-sm text-foreground">Alerts & Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Device Push Notifications Opt-In Banner */}
          {pushSupported && !isSubscribed && (
            <div className="bg-primary/10 border-b border-border/40 p-3 text-center space-y-1.5 no-print">
              <p className="text-[10px] font-bold text-primary leading-normal">
                Receive notifications natively on your mobile phone
              </p>
              <button
                onClick={handleSubscribePush}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-black py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Enable Phone Notifications
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-semibold">
                No alerts yet. You're doing great!
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) {
                        api.put(`/notifications/${notif.id}/read`);
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
                      }
                    }}
                    className={`p-4 flex gap-3 text-left transition-colors cursor-pointer ${notif.isRead ? 'hover:bg-muted/10 opacity-75' : 'bg-primary/5 hover:bg-primary/10'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.type === 'budget_alert' ? (
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/10">
                          <AlertTriangle size={14} />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/10">
                          <Info size={14} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className={`text-xs font-bold text-foreground block truncate ${!notif.isRead ? 'font-black' : ''}`}>
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="text-muted-foreground hover:text-emerald-500 p-0.5 rounded transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground font-semibold line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-muted-foreground/60 block font-medium">
                        {new Date(notif.createdAt).toLocaleDateString('default', { month: 'short', day: 'numeric' })} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
