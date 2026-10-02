import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Trophy,
  Zap,
  Flame,
  Clock,
  Gauge,
  Lock,
  CheckCircle2,
  Calendar,
  Share2,
  Users,
  Check,
  Info,
} from 'lucide-react';
import { api, AchievementItem, ChallengeItem } from '../services/api';

export const ProgressScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'RECORDS' | 'ACHIEVEMENTS' | 'LEADERBOARD'>('ANALYTICS');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'distance' | 'xp'>('distance');
  const [loading, setLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleInviteFriends = async () => {
    const inviteUrl = `${window.location.origin}/#join_leaderboard`;
    const shareText = `🏃 Join my running leaderboard on STRIDE! Track your runs, walk with me, and let's see who tops this week's ranking:\n${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my STRIDE Leaderboard',
          text: shareText,
          url: inviteUrl,
        });
        return;
      } catch (err) {}
    }

    navigator.clipboard?.writeText(shareText);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 3000);
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  useEffect(() => {
    loadPersonalRecords();
    loadAchievements();
    loadChallenges();
    loadLeaderboard();
  }, [leaderboardType]);

  const loadAnalytics = async () => {
    try {
      const res = await api.getAnalytics(timeframe);
      setAnalyticsData(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPersonalRecords = async () => {
    try {
      const res = await api.getPersonalRecords();
      setPersonalRecords(res.records || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAchievements = async () => {
    try {
      const res = await api.getAchievements();
      setAchievements(res.achievements || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadChallenges = async () => {
    try {
      const res = await api.getChallenges();
      setChallenges(res.challenges || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await api.getLeaderboard(leaderboardType);
      setLeaderboard(res.leaderboard || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await api.joinChallenge(challengeId);
      loadChallenges();
    } catch (err: any) {
      alert(err.message || 'Failed to join challenge.');
    }
  };

  return (
    <div style={{ padding: '20px 18px 110px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Performance Hub
        </span>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}>Progress & Trophies</h1>
      </div>

      {/* Segmented Top Navigation */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          padding: '4px',
          borderRadius: 'var(--radius-lg)',
          gap: '4px',
        }}
      >
        {(['ANALYTICS', 'RECORDS', 'ACHIEVEMENTS', 'LEADERBOARD'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === tab ? 'var(--accent-yellow)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-yellow-text)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 1. ANALYTICS TAB */}
      {activeTab === 'ANALYTICS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Timeframe Selector */}
          <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
            {(['weekly', 'monthly', 'yearly'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  backgroundColor: timeframe === tf ? 'var(--bg-elevated)' : 'transparent',
                  color: timeframe === tf ? 'var(--accent-yellow)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Aggregated Totals Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div className="stride-card" style={{ padding: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Distance
              </span>
              <div className="metric-value" style={{ fontSize: '28px', color: 'var(--accent-yellow)', marginTop: '4px' }}>
                {analyticsData?.totals?.distanceKm || 0} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>km</span>
              </div>
            </div>

            <div className="stride-card" style={{ padding: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Active Time
              </span>
              <div className="metric-value" style={{ fontSize: '28px', color: 'var(--text-primary)', marginTop: '4px' }}>
                {Math.floor((analyticsData?.totals?.durationSec || 0) / 60)} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>min</span>
              </div>
            </div>

            <div className="stride-card" style={{ padding: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Strides Logged
              </span>
              <div className="metric-value" style={{ fontSize: '24px', color: 'var(--text-primary)', marginTop: '4px' }}>
                {analyticsData?.totals?.count || 0}
              </div>
            </div>

            <div className="stride-card" style={{ padding: '16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Climb
              </span>
              <div className="metric-value" style={{ fontSize: '24px', color: 'var(--accent-emerald)', marginTop: '4px' }}>
                {analyticsData?.totals?.elevationGainM || 0} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>m</span>
              </div>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="stride-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Distance Distribution (KM)
            </h4>
            <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '10px' }}>
              {analyticsData?.chartData && analyticsData.chartData.length > 0 ? (
                analyticsData.chartData.map((d: any, idx: number) => {
                  const maxKm = Math.max(...analyticsData.chartData.map((c: any) => c.distanceKm), 5);
                  const barHeightPct = (d.distanceKm / maxKm) * 100;
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                        {d.distanceKm > 0 ? d.distanceKm : ''}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(barHeightPct, 6)}%`,
                          backgroundColor: d.distanceKm > 0 ? 'var(--accent-yellow)' : 'var(--bg-elevated)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.4s ease',
                          boxShadow: d.distanceKm > 0 ? '0 0 10px var(--accent-yellow-glow)' : 'none',
                        }}
                      />
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 600 }}>
                        {d.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', margin: 'auto 0' }}>
                  No distance records logged for this period.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSONAL RECORDS TAB */}
      {activeTab === 'RECORDS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {personalRecords.length === 0 ? (
            <div className="stride-card" style={{ textAlign: 'center', padding: '30px' }}>
              <Trophy size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <h4>No personal records yet</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Complete your first run or ride to set your baseline benchmarks.
              </p>
            </div>
          ) : (
            personalRecords.map((rec) => (
              <div
                key={rec.id}
                className="stride-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {rec.title}
                  </span>
                  <div className="metric-value" style={{ fontSize: '24px', color: 'var(--accent-yellow)', marginTop: '2px' }}>
                    {rec.value}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{rec.activityTitle}</span>
                </div>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-yellow)',
                  }}
                >
                  <Trophy size={20} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. ACHIEVEMENTS & CHALLENGES TAB */}
      {activeTab === 'ACHIEVEMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Active Challenges */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>Active Challenges</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {challenges.map((c) => (
                <div key={c.id} className="stride-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--accent-yellow)',
                        }}
                      >
                        +{c.xpReward} XP
                      </span>
                      <h4 style={{ fontSize: '16px', fontWeight: 700, marginTop: '6px' }}>{c.title}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.description}</p>
                    </div>
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, (c.progress / c.targetValue) * 100)}%`,
                          height: '100%',
                          background: 'var(--accent-yellow)',
                        }}
                      />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-primary)' }}>
                      {c.progress.toFixed(1)} / {c.targetValue} {c.targetUnit}
                    </span>
                  </div>

                  {!c.isJoined && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleJoinChallenge(c.id)}
                      style={{ marginTop: '12px', width: '100%', padding: '10px', fontSize: '12px' }}
                    >
                      Join Challenge
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* All Achievements Showcase */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>Achievements</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="stride-card"
                  style={{
                    padding: '14px',
                    opacity: ach.unlocked ? 1 : 0.6,
                    border: ach.unlocked ? '1px solid rgba(226, 249, 82, 0.35)' : '1px solid var(--border-subtle)',
                    background: ach.unlocked
                      ? 'linear-gradient(145deg, rgba(226, 249, 82, 0.08), var(--bg-card))'
                      : 'var(--bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: ach.unlocked ? 'var(--accent-yellow)' : 'var(--bg-elevated)',
                        color: ach.unlocked ? 'var(--accent-yellow-text)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {ach.unlocked ? <CheckCircle2 size={18} /> : <Lock size={16} />}
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      +{ach.xpReward} XP
                    </span>
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginTop: '10px' }}>{ach.title}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
                    {ach.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. LEADERBOARD TAB */}
      {activeTab === 'LEADERBOARD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* How Leaderboard Works & Invite Friends Banner */}
          <div
            className="stride-card"
            style={{
              padding: '16px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trophy size={15} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                How Leaderboards Work
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
              Har GPS run aur walk automatically calculate hoti hai. Sabhi athletes ki weekly distance aur XP points se rank banti hai. Top 3 athletes ko Gold 🥇, Silver 🥈 aur Bronze 🥉 podium milta hai!
            </p>

            {/* Invite Friends Button */}
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={handleInviteFriends}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: inviteCopied ? '#059669' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                {inviteCopied ? <Check size={16} /> : <Users size={16} />}
                <span>{inviteCopied ? 'Invite Link Copied to Clipboard!' : 'Invite Friends to Compete (WhatsApp / Share)'}</span>
              </button>
            </div>
          </div>

          {/* Toggle Type: Distance vs XP */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setLeaderboardType('distance')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: leaderboardType === 'distance' ? '#10b981' : '#ffffff',
                color: leaderboardType === 'distance' ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: leaderboardType === 'distance' ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                borderBottom: leaderboardType === 'distance' ? 'none' : '1px solid #e2e8f0',
              }}
            >
              🏃 Distance Leaderboard
            </button>
            <button
              onClick={() => setLeaderboardType('xp')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: leaderboardType === 'xp' ? '#10b981' : '#ffffff',
                color: leaderboardType === 'xp' ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: leaderboardType === 'xp' ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                borderBottom: leaderboardType === 'xp' ? 'none' : '1px solid #e2e8f0',
              }}
            >
              ⚡ XP Rankings
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {leaderboard.map((entry) => {
              const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;
              const isTop3 = entry.rank <= 3;

              return (
                <div
                  key={entry.userId}
                  className="stride-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    border: isTop3 ? '1.5px solid rgba(16, 185, 129, 0.35)' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: medal ? '20px' : '15px',
                        fontWeight: 800,
                        color: isTop3 ? '#10b981' : '#94a3b8',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {medal || `#${entry.rank}`}
                    </div>

                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {entry.firstName ? `${entry.firstName} ${entry.lastName || ''}` : entry.username}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Level {entry.level} • {entry.streak}d streak
                      </span>
                    </div>
                  </div>

                  <div className="metric-value" style={{ fontSize: '16px', color: '#10b981', fontWeight: 800 }}>
                    {entry.score} <span style={{ fontSize: '11px', color: '#64748b' }}>{entry.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
