import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Clock, Flame, TrendingUp, Zap, ChevronRight, Share2, Info, Compass } from 'lucide-react';
import { MapViewer } from '../components/Map/MapViewer';
import { PaceAreaChart } from '../components/Charts/PaceAreaChart';
import { api, ActivitySummary, API_BASE } from '../services/api';
import { formatPaceString, formatDurationString } from '../hooks/useTracker';
import { ShareActivityModal } from '../components/Share/ShareActivityModal';

interface ActivityDetailModalProps {
  activityId: string;
  theme: 'dark' | 'light';
  onClose: () => void;
  onDeleted: () => void;
}

export const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  activityId,
  theme,
  onClose,
  onDeleted,
}) => {
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    loadDetails();
  }, [activityId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getActivityById(activityId);
      setActivity(res.activity);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this recorded stride? This action cannot be undone.')) {
      try {
        await api.deleteActivity(activityId);
        onDeleted();
        onClose();
      } catch (e: any) {
        alert(e.message || 'Failed to delete activity');
      }
    }
  };

  const handleDownloadGpx = () => {
    const token = localStorage.getItem('stride_auth_token');
    const url = `${API_BASE}/activities/${activityId}/gpx`;
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `stride_${activity.title.toLowerCase().replace(/\s+/g, '_')}.gpx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((e) => alert('Failed to download GPX file.'));
  };

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 3000,
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Loading stride telemetry...
      </div>
    );
  }

  if (!activity) return null;

  const km = (activity.distanceMeters / 1000).toFixed(2);
  const dateFormatted = new Date(activity.startTime).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let splits = [];
  try {
    if (activity.statistics?.splitsJson) {
      splits = JSON.parse(activity.statistics.splitsJson);
    }
  } catch {
    splits = [];
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 3000,
        backgroundColor: 'var(--bg-surface)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header Bar with Safe Area Inset */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'calc(var(--safe-top, 0px) + 14px) 16px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--bg-surface)',
          zIndex: 10,
        }}
      >
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}
        >
          <X size={22} />
        </button>

        <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
          Stride Telemetry
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setShowShareModal(true)}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            }}
            title="Share to Instagram Story & Socials"
          >
            <Share2 size={13} /> Share
          </button>

          <button
            onClick={handleDownloadGpx}
            className="btn btn-secondary"
            style={{ padding: '6px 8px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}
            title="Download GPX file for Garmin/Apple Health"
          >
            GPX
          </button>

          <button
            onClick={handleDelete}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
            title="Delete Stride"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div style={{ width: '100%', height: '260px', position: 'relative' }}>
        <MapViewer
          points={activity.points || []}
          interactive={true}
          theme={theme}
          showStartEndPins={true}
          followLocation={false}
        />
      </div>

      {/* Content Body */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Title & Metadata */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: 'var(--accent-yellow)',
                color: 'var(--accent-yellow-text)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {activity.activityType}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dateFormatted}</span>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{activity.title}</h2>
          {activity.description && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
              {activity.description}
            </p>
          )}
        </div>

        {/* Primary Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div className="stride-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>DISTANCE</span>
            <div className="metric-value" style={{ fontSize: '32px', color: 'var(--text-primary)', marginTop: '2px' }}>
              {km} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>km</span>
            </div>
          </div>

          <div className="stride-card" style={{ padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>DURATION</span>
            <div className="metric-value" style={{ fontSize: '32px', color: 'var(--accent-yellow)', marginTop: '2px' }}>
              {formatDurationString(activity.durationSec)}
            </div>
          </div>

          <div className="stride-card" style={{ padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>AVG PACE</span>
            <div className="metric-value" style={{ fontSize: '20px', marginTop: '2px' }}>
              {formatPaceString(activity.averagePaceSec)} /km
            </div>
          </div>

          <div className="stride-card" style={{ padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>AVG SPEED</span>
            <div className="metric-value" style={{ fontSize: '20px', marginTop: '2px' }}>
              {activity.averageSpeedKmh.toFixed(1)} km/h
            </div>
          </div>

          <div className="stride-card" style={{ padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>CALORIES</span>
            <div className="metric-value" style={{ fontSize: '20px', marginTop: '2px' }}>
              {activity.calories} kcal
            </div>
          </div>

          <div className="stride-card" style={{ padding: '14px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>ELEVATION GAIN</span>
            <div className="metric-value" style={{ fontSize: '20px', color: 'var(--accent-emerald)', marginTop: '2px' }}>
              +{Math.round(activity.elevationGainM)} m
            </div>
          </div>
        </div>

        {/* Strava-Style Detailed Pace Area Graph Card */}
        <div className="stride-card" style={{ padding: '20px 18px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Pace</h3>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Info size={18} />
            </button>
          </div>

          {/* Area Chart */}
          <PaceAreaChart
            points={activity.points || []}
            splits={splits}
            durationSec={activity.movingDurationSec || activity.durationSec}
            avgPaceSec={activity.averagePaceSec || 300}
            avgSpeedKmh={activity.averageSpeedKmh}
            maxSpeedKmh={activity.maxSpeedKmh}
          />

          {/* Detailed Metric Rows matching reference */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Avg Pace</span>
              <span className="metric-value" style={{ fontWeight: 800 }}>{formatPaceString(activity.averagePaceSec)} /km</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Moving Time</span>
              <span className="metric-value" style={{ fontWeight: 800 }}>{formatDurationString(activity.movingDurationSec || activity.durationSec)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Elapsed Time</span>
              <span className="metric-value" style={{ fontWeight: 800 }}>{formatDurationString(activity.durationSec)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Fastest Split</span>
              <span className="metric-value" style={{ fontWeight: 800, color: 'var(--accent-orange)' }}>
                {splits.length > 0 ? [...splits].sort((a: any, b: any) => a.paceSec - b.paceSec)[0]?.paceFormatted : formatPaceString((activity.averagePaceSec || 300) * 0.92) + ' /km'}
              </span>
            </div>
          </div>
        </div>

        {/* Splits Breakdown */}
        {splits && splits.length > 0 && (
          <div className="stride-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Kilometer Splits
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {splits.map((s: any) => {
                // Pace relative bar
                const fastestPace = Math.min(...splits.map((x: any) => x.paceSec || 300));
                const paceRatio = s.paceSec ? fastestPace / s.paceSec : 0.8;
                return (
                  <div key={s.splitNumber} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '45px', fontSize: '12px', fontWeight: 700 }}>KM {s.splitNumber}</span>
                    <div style={{ flex: 1, height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(30, paceRatio * 100))}%`,
                          height: '100%',
                          background: 'var(--accent-yellow)',
                        }}
                      />
                    </div>
                    <span className="metric-value" style={{ fontSize: '13px', color: 'var(--accent-yellow)' }}>
                      {s.paceFormatted}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Instagram Story / Activity Share Modal */}
      {showShareModal && activity && (
        <ShareActivityModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          activity={{
            id: activity.id,
            title: activity.title,
            activityType: activity.activityType,
            distanceMeters: activity.distanceMeters,
            durationSec: activity.movingDurationSec || activity.durationSec,
            averagePaceSec: activity.averagePaceSec,
            elevationGainM: activity.elevationGainM,
            points: activity.points || [],
          }}
        />
      )}
    </div>
  );
};
