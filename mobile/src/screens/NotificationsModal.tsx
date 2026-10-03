import React, { useState, useEffect } from 'react';
import { X, Check, Bell, Award, Sparkles, Shield, Info, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface NotificationsModalProps {
  onClose: () => void;
  onRefreshBadge: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onRefreshBadge,
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      let list = res.notifications || [];
      if (list.length <= 1) {
        list = [
          ...list,
          {
            id: 'notif_hinglish_1',
            title: 'Bhai uth ja! 🏃‍♂️🔥',
            message: 'Subah ki taazi hawa aur 5k stride wait kar rahi hai. Bed chhod aur warm up shuru kar!',
            type: 'CHALLENGE',
            read: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'notif_hinglish_2',
            title: 'Hydration & Mindset Check 💧',
            message: 'Screen chhod, paani pi athlete! Aur bata, aaj kitne km ka target set kiya hai?',
            type: 'INFO',
            read: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'notif_hinglish_3',
            title: 'Golden Hour Stride ⚡🔥',
            message: 'Chai sutta baad me, pehle 3km ki stride maar ke aate hain! Streak maintain rakhna hai.',
            type: 'ACHIEVEMENT',
            read: true,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
        ];
      }
      setNotifications(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
      onRefreshBadge();
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ACHIEVEMENT':
        return <Award size={18} color="var(--accent-yellow)" />;
      case 'CHALLENGE':
        return <Sparkles size={18} color="var(--accent-emerald)" />;
      case 'SAFETY':
        return <Shield size={18} color="#ef4444" />;
      default:
        return <Info size={18} color="var(--accent-sky)" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 3500,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        className="stride-card"
        style={{
          width: '100%',
          maxWidth: '100%',
          height: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 0,
          border: 'none',
          padding: 'calc(var(--safe-top, 0px) + 16px) 18px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} color="var(--accent-yellow)" />
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Notifications</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            className="btn btn-secondary"
            onClick={handleMarkAllRead}
            style={{ padding: '8px 12px', fontSize: '12px', alignSelf: 'flex-start' }}
          >
            <Check size={14} /> Mark all as read
          </button>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
              Loading alerts...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 20px' }}>
              No notifications yet. Record strides and complete challenges to earn updates.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: n.read ? 'var(--bg-card)' : 'var(--bg-elevated)',
                  borderLeft: n.read ? '1px solid var(--border-subtle)' : '3px solid var(--accent-yellow)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div style={{ marginTop: '2px' }}>{getIcon(n.type)}</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{n.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
