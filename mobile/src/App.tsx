import React, { useState, useEffect } from 'react';
import { Header } from './components/Header/Header';
import { BottomNav, NavTab } from './components/Navigation/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { ExploreScreen } from './screens/ExploreScreen';
import { RecordScreen } from './screens/RecordScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ActivityDetailModal } from './screens/ActivityDetailModal';
import { AuthModal } from './screens/AuthModal';
import { NotificationsModal } from './screens/NotificationsModal';
import { api, getToken, removeToken, UserProfile, ActivitySummary, ChallengeItem } from './services/api';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { initLocalNotifications } from './services/notifications';

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [tabHistory, setTabHistory] = useState<NavTab[]>(['HOME']);
  const activeTab = tabHistory[tabHistory.length - 1] || 'HOME';

  const setActiveTab = (tab: NavTab) => {
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedRouteForRecord, setSelectedRouteForRecord] = useState<any | null>(null);
  const [backToast, setBackToast] = useState<string | null>(null);
  const lastBackPressRef = React.useRef<number>(0);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weeklyStats, setWeeklyStats] = useState({
    distanceKm: 0,
    durationSec: 0,
    count: 0,
    progressPercent: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivitySummary[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeItem | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  // Initialize theme & native status bar
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (Capacitor.isPluginAvailable('StatusBar')) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      if (theme === 'dark') {
        StatusBar.setBackgroundColor({ color: '#111822' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      } else {
        StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      }
    }
  }, [theme]);

  // Load User Data & Verify Session + Init Daily Notifications
  useEffect(() => {
    initializeApp();
    initLocalNotifications();
  }, []);

  // Native Android Hardware Back Button Handling: Back 1 page at a time
  useEffect(() => {
    if (!Capacitor.isPluginAvailable('App')) return;

    const listenerPromise = CapApp.addListener('backButton', () => {
      // 1. If any modal is active, close it
      if (selectedActivityId) {
        setSelectedActivityId(null);
        return;
      }
      if (showNotifications) {
        setShowNotifications(false);
        return;
      }
      if (showAuthModal && isAuthenticated) {
        setShowAuthModal(false);
        return;
      }

      // 2. If in record screen, confirm before exiting
      if (activeTab === 'RECORD') {
        if (window.confirm('Exit Stride recording and return to previous page?')) {
          setSelectedRouteForRecord(null);
          setTabHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['HOME']));
        }
        return;
      }

      // 3. Step back ONE page in history stack
      if (tabHistory.length > 1) {
        setTabHistory((prev) => prev.slice(0, -1));
        return;
      }

      // 4. Double-tap back to exit on the first page (HOME)
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        setBackToast('Press back again to exit STRIDE');
        setTimeout(() => setBackToast(null), 2000);
      }
    });

    return () => {
      listenerPromise.then((handler) => handler.remove()).catch(() => {});
    };
  }, [selectedActivityId, showNotifications, showAuthModal, isAuthenticated, tabHistory, activeTab]);

  const initializeApp = async () => {
    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      setShowAuthModal(true);
      return;
    }

    try {
      const meRes = await api.getMe();
      if (meRes.user) {
        setIsAuthenticated(true);
        loadHomeData();
      } else {
        setIsAuthenticated(false);
        setShowAuthModal(true);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        removeToken();
        setIsAuthenticated(false);
        setShowAuthModal(true);
      } else {
        // Keep authenticated if network is slow/offline
        setIsAuthenticated(true);
        loadHomeData();
      }
    }
  };

  const loadHomeData = async () => {
    try {
      const profRes = await api.getProfile();
      const cachedAvatar = localStorage.getItem('stride_athlete_avatar');
      const finalProfile = profRes.profile;
      if (cachedAvatar && (!finalProfile.avatarUrl || finalProfile.avatarUrl === '')) {
        finalProfile.avatarUrl = cachedAvatar;
      }
      setProfile(finalProfile);
      setWeeklyStats(profRes.weekly);

      const actRes = await api.getActivities({ limit: 5 });
      setRecentActivities(actRes.activities);

      const chalRes = await api.getChallenges();
      if (chalRes.challenges.length > 0) {
        setActiveChallenge(chalRes.challenges[0]);
      }

      const notifRes = await api.getNotifications();
      setUnreadNotifications(notifRes.unreadCount);
    } catch (err) {
      console.warn('Home data load error:', err);
    }
  };

  const toggleTheme = () => {
    setTheme((curr) => (curr === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    removeToken();
    setIsAuthenticated(false);
    setShowAuthModal(true);
  };

  return (
    <div className="stride-viewport" style={{ minHeight: '100dvh' }}>
      {/* Top Header (Hidden in Record mode for full immersion) */}
      {activeTab !== 'RECORD' && (
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          unreadNotifications={unreadNotifications}
          onOpenNotifications={() => setShowNotifications(true)}
          onOpenSafety={() => setActiveTab('PROFILE')}
        />
      )}

      {/* Main Tab Screen Content with Smooth Transitions */}
      <main key={activeTab} className="stride-animate-in" style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'HOME' && (
          <HomeScreen
            profile={profile}
            weeklyStats={weeklyStats}
            recentActivities={recentActivities}
            activeChallenge={activeChallenge}
            onStartRecord={() => setActiveTab('RECORD')}
            onSelectActivity={(id) => setSelectedActivityId(id)}
            onExploreRoutes={() => setActiveTab('EXPLORE')}
            onViewAchievements={() => setActiveTab('PROGRESS')}
          />
        )}

        {activeTab === 'EXPLORE' && (
          <ExploreScreen
            onSelectRouteForRecord={(route) => {
              setSelectedRouteForRecord(route);
              setActiveTab('RECORD');
            }}
          />
        )}

        {activeTab === 'RECORD' && (
          <RecordScreen
            theme={theme}
            selectedRoute={selectedRouteForRecord}
            onClearSelectedRoute={() => setSelectedRouteForRecord(null)}
            onCancel={() => {
              setSelectedRouteForRecord(null);
              setActiveTab('HOME');
            }}
            onActivitySaved={() => {
              setSelectedRouteForRecord(null);
              loadHomeData();
              setActiveTab('HOME');
            }}
          />
        )}

        {activeTab === 'PROGRESS' && <ProgressScreen />}

        {activeTab === 'PROFILE' && (
          <ProfileScreen
            profile={profile}
            onProfileUpdated={loadHomeData}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* 5-Tab Navigation Bar (Hidden in Record mode so buttons never overlap) */}
      {activeTab !== 'RECORD' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      )}

      {/* Activity Details Modal */}
      {selectedActivityId && (
        <ActivityDetailModal
          activityId={selectedActivityId}
          theme={theme}
          onClose={() => setSelectedActivityId(null)}
          onDeleted={() => {
            setSelectedActivityId(null);
            loadHomeData();
          }}
        />
      )}

      {/* Notifications Drawer */}
      {showNotifications && (
        <NotificationsModal
          onClose={() => setShowNotifications(false)}
          onRefreshBadge={loadHomeData}
        />
      )}

      {/* Auth Modal (if unauthenticated) */}
      {showAuthModal && (
        <AuthModal
          onSuccess={() => {
            setShowAuthModal(false);
            setIsAuthenticated(true);
            loadHomeData();
          }}
        />
      )}

      {/* Back Button Exit Toast */}
      {backToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(var(--safe-bottom, 16px) + 80px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 700,
            zIndex: 10000,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            animation: 'strideFadeSlideUp 0.2s ease-out forwards',
          }}
        >
          {backToast}
        </div>
      )}
    </div>
  );
}

export default App;
