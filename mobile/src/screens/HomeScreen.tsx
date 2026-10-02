import React, { useState } from 'react';
import { Flame, Play, ChevronRight, Award, Zap, Clock, Route, Compass, ThumbsUp, MessageSquare, Share2, Medal, User } from 'lucide-react';
import { ActivitySummary, UserProfile, ChallengeItem } from '../services/api';
import { MapViewer } from '../components/Map/MapViewer';
import { ShareActivityModal } from '../components/Share/ShareActivityModal';
import { soundEngine } from '../services/audio';

interface HomeScreenProps {
  profile: UserProfile | null;
  weeklyStats: { distanceKm: number; durationSec: number; count: number; progressPercent: number };
  recentActivities: ActivitySummary[];
  activeChallenge: ChallengeItem | null;
  onStartRecord: () => void;
  onSelectActivity: (id: string) => void;
  onExploreRoutes: () => void;
  onViewAchievements: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  weeklyStats,
  recentActivities,
  activeChallenge,
  onStartRecord,
  onSelectActivity,
  onExploreRoutes,
  onViewAchievements,
}) => {
  const [sharingActivity, setSharingActivity] = useState<any | null>(null);
  const [hypeGiven, setHypeGiven] = useState<Record<string, number>>({});
  const [hypeToast, setHypeToast] = useState<string | null>(null);

  const handleGiveHype = (actId: string) => {
    soundEngine.playJosh();
    setHypeGiven((prev) => ({
      ...prev,
      [actId]: (prev[actId] || 0) + 1,
    }));
    setHypeToast('Full Hype! ⚡ Athlete in the zone!');
    setTimeout(() => setHypeToast(null), 2200);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const formatSecToHMin = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div style={{ padding: '20px 18px 110px', display: 'flex', flexDirection: 'column', gap: '22px', position: 'relative' }}>
      {/* Hype Toast Notification */}
      {hypeToast && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(var(--safe-top, 0px) + 72px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 800,
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'strideFadeSlideUp 0.35s ease-out forwards',
          }}
        >
          <Zap size={18} color="#10b981" fill="#10b981" />
          <span>{hypeToast}</span>
        </div>
      )}
      {/* Athlete Header & Streak Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Good {getGreeting()}
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>
            {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Athlete'}
          </h1>
        </div>

        {/* Dynamic Streak Flame Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, rgba(226, 249, 82, 0.18), rgba(255, 140, 0, 0.12))',
            border: '1px solid rgba(226, 249, 82, 0.35)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 2px 10px rgba(226, 249, 82, 0.15)',
          }}
        >
          <Flame size={18} color="#FF8C00" fill="#FF8C00" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
            {profile?.currentStreak || 1}d
          </span>
        </div>
      </div>

      {/* Weekly Goal Progress Card */}
      <div
        className="stride-card"
        style={{
          background: 'linear-gradient(145deg, var(--bg-card), var(--bg-surface))',
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weekly Distance Target
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span className="metric-value" style={{ fontSize: '32px', color: 'var(--text-primary)' }}>
                {weeklyStats.distanceKm.toFixed(1)}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>
                / {profile?.weeklyGoalKm || 20} km
              </span>
            </div>
          </div>

          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px', color: 'var(--accent-yellow)' }}>
              {weeklyStats.progressPercent}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, weeklyStats.progressPercent)}%`,
              height: '100%',
              backgroundColor: 'var(--accent-yellow)',
              borderRadius: '4px',
              boxShadow: '0 0 10px var(--accent-yellow-glow)',
              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>

        {/* Secondary Weekly Metrics */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {formatSecToHMin(weeklyStats.durationSec)} moving
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--accent-yellow)" />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {weeklyStats.count} {weeklyStats.count === 1 ? 'activity' : 'activities'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stride CTA */}
      <button
        id="home-quick-record-btn"
        className="btn btn-primary"
        onClick={onStartRecord}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Play size={20} fill="currentColor" />
          START NEW STRIDE
        </span>
        <ChevronRight size={20} />
      </button>

      {/* Active Challenge Widget */}
      {activeChallenge && (
        <div
          className="stride-card"
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid var(--accent-yellow)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          onClick={onViewAchievements}
        >
          <div style={{ flex: 1, paddingRight: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} color="var(--accent-yellow)" />
              <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: 700, textTransform: 'uppercase' }}>
                Active Challenge
              </span>
            </div>
            <h4 style={{ fontSize: '15px', marginTop: '4px' }}>{activeChallenge.title}</h4>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (activeChallenge.progress / activeChallenge.targetValue) * 100)}%`,
                    height: '100%',
                    background: 'var(--accent-yellow)',
                  }}
                />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {activeChallenge.progress.toFixed(1)} / {activeChallenge.targetValue} {activeChallenge.targetUnit}
              </span>
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>
      )}

      {/* Recent Activities Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Recent Activities</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            {recentActivities.length} total
          </span>
        </div>

        {recentActivities.length === 0 ? (
          <div
            className="stride-card"
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-yellow)',
              }}
            >
              <Route size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>No strides logged yet</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hit the record button and log your first run, walk, or ride.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentActivities.slice(0, 5).map((act) => {
              const km = (act.distanceMeters / 1000).toFixed(2);
              const paceMin = Math.floor(act.averagePaceSec / 60);
              const paceSec = Math.floor(act.averagePaceSec % 60);
              const paceStr = `${paceMin}:${paceSec < 10 ? '0' : ''}${paceSec} /km`;
              const dateStr = new Date(act.startTime).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={act.id}
                  className="stride-card"
                  style={{
                    padding: '18px 16px',
                    backgroundColor: '#ffffff',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Athlete Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#f0f2f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--accent-yellow)',
                      }}
                    >
                      {profile?.avatarUrl ? (
                        <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                      ) : (
                        <User size={18} color="var(--accent-yellow)" />
                      )}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : 'Athlete'}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{dateStr}</span>
                    </div>
                  </div>

                  {/* Activity Title */}
                  <div onClick={() => onSelectActivity(act.id)} style={{ cursor: 'pointer' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>{act.title}</h3>
                  </div>

                  {/* Metrics Row */}
                  <div
                    onClick={() => onSelectActivity(act.id)}
                    style={{
                      cursor: 'pointer',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Distance</span>
                      <div className="metric-value" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>
                        {km} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>km</span>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Pace</span>
                      <div className="metric-value" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>
                        {paceStr}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Time</span>
                      <div className="metric-value" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>
                        {Math.floor(act.durationSec / 60)}m
                      </div>
                    </div>
                  </div>

                  {/* Achievement Ribbon Badge matching screenshot */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      color: '#059669',
                      fontWeight: 600,
                    }}
                  >
                    <Medal size={16} color="#10b981" />
                    <span>Great stride! Logged with high GPS precision.</span>
                  </div>

                  {/* Mini Route Map Preview */}
                  {act.points && act.points.length > 1 && (
                    <div
                      onClick={() => onSelectActivity(act.id)}
                      style={{
                        width: '100%',
                        height: '140px',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <MapViewer
                        points={act.points}
                        height={140}
                        interactive={false}
                        followLocation={false}
                        showStartEndPins={true}
                        showLocateButton={false}
                        theme="light"
                      />
                    </div>
                  )}

                  {/* Social Action Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '24px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                    }}
                  >
                    <button
                      onClick={() => handleGiveHype(act.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'none',
                        border: 'none',
                        color: hypeGiven[act.id] ? '#10b981' : 'inherit',
                        fontWeight: hypeGiven[act.id] ? 700 : 500,
                        cursor: 'pointer',
                      }}
                      title="Give Hype to athlete"
                    >
                      <Zap size={16} color={hypeGiven[act.id] ? '#10b981' : 'var(--text-muted)'} fill={hypeGiven[act.id] ? '#10b981' : 'none'} />
                      <span>{hypeGiven[act.id] ? `Hype (${hypeGiven[act.id]}) ⚡` : 'Hype ⚡'}</span>
                    </button>

                    <button
                      onClick={() => onSelectActivity(act.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                    >
                      <MessageSquare size={16} /> Comments
                    </button>

                    <button
                      onClick={() => setSharingActivity(act)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#10b981', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
                      title="Share Activity"
                    >
                      <Share2 size={16} /> Share
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Explore Routes Teaser */}
      <div
        className="stride-card"
        onClick={onExploreRoutes}
        style={{
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(226, 249, 82, 0.08), rgba(0, 0, 0, 0))',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-yellow)',
          }}
        >
          <Compass size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Discover Community Circuits</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Find popular 5K loops, trail paths & waterfront circuits near you.
          </p>
        </div>
        <ChevronRight size={18} color="var(--text-muted)" />
      </div>

      {/* Share Story Modal from Feed */}
      {sharingActivity && (
        <ShareActivityModal
          isOpen={!!sharingActivity}
          onClose={() => setSharingActivity(null)}
          activity={{
            id: sharingActivity.id,
            title: sharingActivity.title,
            activityType: sharingActivity.activityType,
            distanceMeters: sharingActivity.distanceMeters,
            durationSec: sharingActivity.durationSec,
            averagePaceSec: sharingActivity.averagePaceSec,
            elevationGainM: sharingActivity.elevationGainM,
            points: sharingActivity.points || [],
          }}
        />
      )}
    </div>
  );
};
