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

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [activeTab, setActiveTab] = useState<NavTab>('HOME');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedRouteForRecord, setSelectedRouteForRecord] = useState<any | null>(null);

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

  // Load User Data & Verify Session
  useEffect(() => {
    initializeApp();
  }, []);

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
    } catch {
      removeToken();
      setIsAuthenticated(false);
      setShowAuthModal(true);
    }
  };

  const loadHomeData = async () => {
    try {
      const profRes = await api.getProfile();
      setProfile(profRes.profile);
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

      {/* Main Tab Screen Content */}
      <main style={{ flex: 1, position: 'relative' }}>
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
    </div>
  );
}

export default App;
