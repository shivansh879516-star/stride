import React from 'react';
import { Bell, Moon, Sun, Shield } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
  onOpenSafety?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  unreadNotifications = 0,
  onOpenNotifications,
  onOpenSafety,
}) => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        paddingTop: 'calc(var(--safe-top, 0px) + 14px)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 900,
      }}
    >
      {/* Brand Logo & Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,88 42,12 64,12 34,88" fill="var(--accent-yellow)" />
          <polygon points="46,88 76,12 96,12 66,88" fill="var(--accent-yellow)" opacity="0.85" />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '20px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: 'var(--text-primary)',
          }}
        >
          STRIDE
        </span>
      </div>

      {/* Header Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Safety Quick Access */}
        <button
          id="header-safety-btn"
          onClick={onOpenSafety}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Safety & Emergency Hub"
        >
          <Shield size={20} />
        </button>

        {/* Theme Toggle */}
        <button
          id="header-theme-btn"
          onClick={onToggleTheme}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Toggle Light/Dark Theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notifications */}
        <button
          id="header-notif-btn"
          onClick={onOpenNotifications}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Notifications"
        >
          <Bell size={20} />
          {unreadNotifications > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--accent-yellow)',
                borderRadius: '50%',
                boxShadow: '0 0 6px var(--accent-yellow-glow)',
              }}
            />
          )}
        </button>
      </div>
    </header>
  );
};
