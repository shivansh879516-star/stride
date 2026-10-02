import React from 'react';
import { Home, Compass, Radio, TrendingUp, User } from 'lucide-react';

export type NavTab = 'HOME' | 'EXPLORE' | 'RECORD' | 'PROGRESS' | 'PROFILE';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isRecording?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isRecording = false,
}) => {
  return (
    <nav className="bottom-nav glass-panel">
      <button
        id="nav-home-btn"
        className={`nav-item ${activeTab === 'HOME' ? 'active' : ''}`}
        onClick={() => onTabChange('HOME')}
        aria-label="Home"
      >
        <Home size={22} strokeWidth={activeTab === 'HOME' ? 2.5 : 1.8} />
        <span>Home</span>
      </button>

      <button
        id="nav-explore-btn"
        className={`nav-item ${activeTab === 'EXPLORE' ? 'active' : ''}`}
        onClick={() => onTabChange('EXPLORE')}
        aria-label="Explore Routes"
      >
        <Compass size={22} strokeWidth={activeTab === 'EXPLORE' ? 2.5 : 1.8} />
        <span>Explore</span>
      </button>

      {/* Central Raised Record Action */}
      <button
        id="nav-record-btn"
        className={`nav-record-btn ${isRecording ? 'active' : ''}`}
        onClick={() => onTabChange('RECORD')}
        aria-label="Record Activity"
        title="Record Stride"
      >
        <Radio size={26} strokeWidth={2.8} />
      </button>

      <button
        id="nav-progress-btn"
        className={`nav-item ${activeTab === 'PROGRESS' ? 'active' : ''}`}
        onClick={() => onTabChange('PROGRESS')}
        aria-label="Progress & Analytics"
      >
        <TrendingUp size={22} strokeWidth={activeTab === 'PROGRESS' ? 2.5 : 1.8} />
        <span>Progress</span>
      </button>

      <button
        id="nav-profile-btn"
        className={`nav-item ${activeTab === 'PROFILE' ? 'active' : ''}`}
        onClick={() => onTabChange('PROFILE')}
        aria-label="Athlete Profile"
      >
        <User size={22} strokeWidth={activeTab === 'PROFILE' ? 2.5 : 1.8} />
        <span>Profile</span>
      </button>
    </nav>
  );
};
