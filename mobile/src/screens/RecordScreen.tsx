import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  Sparkles,
  Trash2,
  Heart,
  ArrowLeft,
  Info,
  Target,
  Gauge,
  Volume2,
  VolumeX,
  Flag,
  RotateCcw,
  Plus,
  Layers,
  CheckCircle2,
  X,
  TrendingUp,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTracker, formatDurationString, formatPaceString } from '../hooks/useTracker';
import { useHeartRate } from '../hooks/useHeartRate';
import { MapViewer } from '../components/Map/MapViewer';
import { PaceAreaChart } from '../components/Charts/PaceAreaChart';
import { ShareActivityModal } from '../components/Share/ShareActivityModal';
import { api, offlineStorage } from '../services/api';

interface RecordScreenProps {
  theme: 'dark' | 'light';
  selectedRoute?: any;
  onClearSelectedRoute?: () => void;
  onActivitySaved: () => void;
  onCancel?: () => void;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({
  theme,
  selectedRoute,
  onClearSelectedRoute,
  onActivitySaved,
  onCancel,
}) => {
  const tracker = useTracker();
  const hrSensor = useHeartRate();
  const [activityTitle, setActivityTitle] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSplitsDrawer, setShowSplitsDrawer] = useState(false);
  const [showChartDrawer, setShowChartDrawer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Parse coordinates if route is selected from Explore
  const plannedPoints = useMemo(() => {
    if (!selectedRoute?.coordinatesJson) return [];
    try {
      const parsed = typeof selectedRoute.coordinatesJson === 'string'
        ? JSON.parse(selectedRoute.coordinatesJson)
        : selectedRoute.coordinatesJson;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [selectedRoute]);

  // Target Distances in Meters
  const targetDistanceOptions = [
    { label: 'Free', value: null },
    { label: '1.0 km', value: 1000 },
    { label: '3.0 km', value: 3000 },
    { label: '5.0 km', value: 5000 },
    { label: '10.0 km', value: 10000 },
    { label: '21.1 km', value: 21100 },
  ];

  // Target Paces in seconds/km
  const targetPaceOptions = [
    { label: 'Off', value: null },
    { label: '4:30', value: 270 },
    { label: '5:00', value: 300 },
    { label: '5:30', value: 330 },
    { label: '6:00', value: 360 },
    { label: '6:30', value: 390 },
  ];

  // Trigger celebration confetti
  const handleFinish = () => {
    tracker.finishTracking();
    setShowCelebration(true);
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#10B981', '#059669', '#34D399', '#0284C7', '#FFFFFF'],
    });
  };

  const handleSaveActivity = async () => {
    setIsSaving(true);
    const title = activityTitle.trim() || `${tracker.activityType} Stride`;
    const clientSyncId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const activityPayload = {
      title,
      description: `Tracked with STRIDE GPS engine.`,
      activityType: tracker.activityType,
      startTime: tracker.points[0]?.timestamp || new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationSec: tracker.elapsedDurationSec,
      movingDurationSec: tracker.movingDurationSec,
      distanceMeters: tracker.totalDistanceMeters,
      averagePaceSec: tracker.averagePaceSec,
      averageSpeedKmh: tracker.averageSpeedKmh,
      maxSpeedKmh: tracker.maxSpeedKmh,
      calories: tracker.caloriesBurned,
      elevationGainM: tracker.elevationGainM,
      elevationLossM: tracker.elevationLossM,
      visibility: 'PUBLIC',
      clientSyncId,
      points: tracker.points,
      splits: tracker.splits,
    };

    try {
      await api.createActivity(activityPayload);
      setTimeout(() => {
        setIsSaving(false);
        setShowCelebration(false);
        tracker.resetTracking();
        onActivitySaved();
      }, 1000);
    } catch (err: any) {
      console.warn('Network sync failed, enqueuing activity locally:', err.message);
      offlineStorage.enqueue(activityPayload);
      setTimeout(() => {
        setIsSaving(false);
        setShowCelebration(false);
        tracker.resetTracking();
        onActivitySaved();
      }, 1000);
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Are you sure you want to discard this stride?')) {
      setShowCelebration(false);
      tracker.resetTracking();
      if (onCancel) onCancel();
    }
  };

  const activityTypes: Array<'RUN' | 'WALK' | 'JOG' | 'CYCLE' | 'HIKE'> = [
    'RUN',
    'WALK',
    'JOG',
    'CYCLE',
    'HIKE',
  ];

  // Calculate target progress percentage
  const targetPercent = tracker.targetDistanceMeters && tracker.targetDistanceMeters > 0
    ? Math.min(100, Math.round((tracker.totalDistanceMeters / tracker.targetDistanceMeters) * 100))
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100dvh', overflow: 'hidden', backgroundColor: '#f4f6f8' }}>
      {/* ======================================================== */}
      {/* TOP HALF (48%): LIVE GPS MAP VIEWER WITH ROUTE & LOCATE */}
      {/* ======================================================== */}
      <div style={{ position: 'relative', width: '100%', height: '48%', minHeight: '260px', overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
        <MapViewer
          points={tracker.points}
          plannedRoutePoints={plannedPoints}
          currentLocation={tracker.currentLocation}
          theme={theme}
          interactive={true}
          followLocation={tracker.status === 'RECORDING'}
          showStartEndPins={tracker.status === 'COMPLETED' || plannedPoints.length > 0}
          showLocateButton={true}
          locateButtonPosition="bottom-right"
        />

        {/* Top Floating Telemetry & Controls Bar */}
        <div
          style={{
            position: 'absolute',
            top: 'calc(var(--safe-top, 0px) + 12px)',
            left: '12px',
            right: '12px',
            zIndex: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Back Button (visible when IDLE) */}
          {tracker.status === 'IDLE' && onCancel && (
            <button
              onClick={onCancel}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                color: '#0f172a',
                cursor: 'pointer',
              }}
              title="Back to Home"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          {/* GPS Status Indicator */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: tracker.gpsStatus === 'LOCKED' ? '#10b981' : '#f59e0b',
                boxShadow: tracker.gpsStatus === 'LOCKED' ? '0 0 6px #10b981' : 'none',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
              GPS: {tracker.gpsStatus} {tracker.gpsAccuracy ? `(±${Math.round(tracker.gpsAccuracy)}m)` : ''}
            </span>
          </div>

          {/* Bluetooth Heart Rate Sensor Pill */}
          <button
            onClick={hrSensor.isConnected ? hrSensor.disconnect : hrSensor.connect}
            style={{
              border: 'none',
              color: hrSensor.isConnected ? '#ef4444' : '#334155',
              backgroundColor: '#ffffff',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
              marginLeft: 'auto',
            }}
            title={hrSensor.isConnected ? `Connected: ${hrSensor.deviceName}` : 'Pair Bluetooth HR Sensor'}
          >
            <Heart size={14} fill={hrSensor.isConnected ? '#ef4444' : 'none'} color={hrSensor.isConnected ? '#ef4444' : '#10b981'} />
            {hrSensor.isConnected ? `${hrSensor.heartRate || '--'} BPM` : 'HR SENSOR'}
          </button>
        </div>

        {/* Selected Route Guidance Banner */}
        {selectedRoute && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              zIndex: 600,
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#ffffff',
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              maxWidth: '75%',
            }}
          >
            <Flag size={14} color="#10b981" />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedRoute.name} ({(selectedRoute.distanceMeters / 1000).toFixed(1)} km)
            </span>
            {onClearSelectedRoute && (
              <button
                onClick={onClearSelectedRoute}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', padding: 0 }}
                title="Dismiss Route"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* BOTTOM HALF (52%): ATHLETIC TELEMETRY & SMART OPTIONS   */}
      {/* ======================================================== */}
      <div
        style={{
          flex: 1,
          height: '52%',
          minHeight: '300px',
          backgroundColor: '#ffffff',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.08)',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px 18px env(safe-area-inset-bottom, 18px)',
          overflowY: 'auto',
          zIndex: 50,
        }}
      >
        {/* ==================================================== */}
        {/* VIEW A: BEFORE RUN (IDLE STATE) — ATHLETIC GREEN     */}
        {/* ==================================================== */}
        {tracker.status === 'IDLE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 1. Activity Mode Selector Pills */}
            <div
              style={{
                backgroundColor: '#f1f5f9',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '4px',
              }}
            >
              {activityTypes.map((type) => {
                const isSelected = tracker.activityType === type;
                return (
                  <button
                    key={type}
                    onClick={() => tracker.setActivityType(type)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      backgroundColor: isSelected ? '#10b981' : 'transparent',
                      color: isSelected ? '#ffffff' : '#64748b',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            {/* 2. Target Distance Goal Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Target size={13} color="#10b981" /> Target Distance Goal
                </span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                  {tracker.targetDistanceMeters ? `${(tracker.targetDistanceMeters / 1000).toFixed(1)} km Goal` : 'Open Run'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {targetDistanceOptions.map((opt) => {
                  const isSelected = tracker.targetDistanceMeters === opt.value;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => tracker.setTargetDistanceMeters(opt.value)}
                      style={{
                        flex: '0 0 auto',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc',
                        color: isSelected ? '#059669' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Target Pace Coach Goal Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Gauge size={13} color="#10b981" /> Target Pace Coach
                </span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                  {tracker.targetPaceSec ? `${formatPaceString(tracker.targetPaceSec)} /km Target` : 'Free Pace'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {targetPaceOptions.map((opt) => {
                  const isSelected = tracker.targetPaceSec === opt.value;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => tracker.setTargetPaceSec(opt.value)}
                      style={{
                        flex: '0 0 auto',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.1)' : '#f8fafc',
                        color: isSelected ? '#059669' : '#475569',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label === 'Off' ? 'Off' : `${opt.label} /km`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Smart Athletic Toggles Row (Audio Coach & Auto-Pause) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Voice Coach Toggle */}
              <button
                onClick={() => tracker.setAudioCoachEnabled(!tracker.audioCoachEnabled)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: tracker.audioCoachEnabled ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                  backgroundColor: tracker.audioCoachEnabled ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {tracker.audioCoachEnabled ? <Volume2 size={18} color="#10b981" /> : <VolumeX size={18} color="#94a3b8" />}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: tracker.audioCoachEnabled ? '#059669' : '#475569' }}>
                    Audio Cues
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                    {tracker.audioCoachEnabled ? 'Voice per 1km' : 'Muted'}
                  </div>
                </div>
              </button>

              {/* Auto Pause Toggle */}
              <button
                onClick={() => tracker.setAutoPauseEnabled(!tracker.autoPauseEnabled)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: tracker.autoPauseEnabled ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                  backgroundColor: tracker.autoPauseEnabled ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Pause size={18} color={tracker.autoPauseEnabled ? '#10b981' : '#94a3b8'} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: tracker.autoPauseEnabled ? '#059669' : '#475569' }}>
                    Auto-Pause
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8' }}>
                    {tracker.autoPauseEnabled ? 'When stationary' : 'Continuous'}
                  </div>
                </div>
              </button>
            </div>

            {/* 5. Big Vibrant Athletic Green Start Button */}
            <button
              id="record-start-btn"
              onClick={tracker.startTracking}
              style={{
                marginTop: '4px',
                padding: '16px',
                fontSize: '17px',
                fontWeight: 800,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <Play size={22} fill="currentColor" />
              START {tracker.activityType}
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW B: DURING RUN (RECORDING OR PAUSED)             */}
        {/* ==================================================== */}
        {(tracker.status === 'RECORDING' || tracker.status === 'PAUSED') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Primary Metrics: Distance & Elapsed Time */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  DISTANCE (KM)
                </span>
                <div className="metric-value" style={{ fontSize: '38px', lineHeight: 1.1, color: '#0f172a', marginTop: '2px' }}>
                  {(tracker.totalDistanceMeters / 1000).toFixed(2)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  DURATION
                </span>
                <div className="metric-value" style={{ fontSize: '38px', lineHeight: 1.1, color: '#10b981', marginTop: '2px' }}>
                  {formatDurationString(tracker.elapsedDurationSec)}
                </div>
              </div>
            </div>

            {/* Target Distance Goal Progress Bar */}
            {tracker.targetDistanceMeters && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                  <span>Goal: {(tracker.targetDistanceMeters / 1000).toFixed(1)} km</span>
                  <span style={{ color: '#10b981' }}>{targetPercent}% ({Math.max(0, (tracker.targetDistanceMeters - tracker.totalDistanceMeters) / 1000).toFixed(2)} km left)</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${targetPercent}%`,
                      height: '100%',
                      backgroundColor: '#10b981',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Secondary 4-Metric Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                paddingTop: '10px',
                borderTop: '1px solid #f1f5f9',
                textAlign: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>PACE</span>
                <div className="metric-value" style={{ fontSize: '15px', marginTop: '2px', color: '#0f172a' }}>
                  {formatPaceString(tracker.averagePaceSec)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>SPEED</span>
                <div className="metric-value" style={{ fontSize: '15px', marginTop: '2px', color: '#0f172a' }}>
                  {tracker.currentSpeedKmh.toFixed(1)}
                  <span style={{ fontSize: '9px', color: '#94a3b8' }}> km/h</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>CALORIES</span>
                <div className="metric-value" style={{ fontSize: '15px', marginTop: '2px', color: '#0f172a' }}>
                  {tracker.caloriesBurned}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>CLIMB</span>
                <div className="metric-value" style={{ fontSize: '15px', marginTop: '2px', color: '#10b981' }}>
                  +{Math.round(tracker.elevationGainM)}m
                </div>
              </div>
            </div>

            {/* Live Splits & Laps Drawer Toggle */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setShowSplitsDrawer(!showSplitsDrawer);
                      if (!showSplitsDrawer) setShowChartDrawer(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: showSplitsDrawer ? '#059669' : '#10b981',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <Layers size={13} /> {showSplitsDrawer ? 'Hide Splits' : `Splits (${tracker.splits.length})`}
                  </button>

                  <button
                    onClick={() => {
                      setShowChartDrawer(!showChartDrawer);
                      if (!showChartDrawer) setShowSplitsDrawer(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: showChartDrawer ? '#059669' : '#10b981',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <TrendingUp size={13} /> {showChartDrawer ? 'Hide Graph' : 'Pace Timeline'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '10px', color: '#64748b' }}>
                  <span>{tracker.audioCoachEnabled ? '🔊 Audio on' : '🔇 Audio off'}</span>
                  <span>•</span>
                  <span>{tracker.autoPauseEnabled ? 'Auto-pause on' : 'Manual'}</span>
                </div>
              </div>

              {/* Splits List (Expandable) */}
              {showSplitsDrawer && (
                <div style={{ marginTop: '8px', maxHeight: '100px', overflowY: 'auto', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '6px 10px' }}>
                  {tracker.splits.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '6px 0' }}>
                      First split will record at 1.0 km mark.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {tracker.splits.map((s) => (
                        <div key={s.splitNumber} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ fontWeight: 600, color: '#475569' }}>KM {s.splitNumber}</span>
                          <span className="metric-value" style={{ fontWeight: 700, color: '#0f172a' }}>{s.paceFormatted} /km</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Live Pace Chart (Expandable) */}
              {showChartDrawer && (
                <div style={{ marginTop: '8px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <PaceAreaChart
                    points={tracker.points}
                    splits={tracker.splits}
                    durationSec={tracker.elapsedDurationSec || tracker.movingDurationSec}
                    avgPaceSec={tracker.averagePaceSec || 300}
                    avgSpeedKmh={tracker.averageSpeedKmh}
                    maxSpeedKmh={tracker.maxSpeedKmh}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons: Pause / Resume / Lap / Finish */}
            <div style={{ marginTop: '6px' }}>
              {tracker.status === 'RECORDING' ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    id="record-pause-btn"
                    onClick={tracker.pauseTracking}
                    style={{
                      flex: 3,
                      padding: '16px',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '16px',
                      fontWeight: 800,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <Pause size={20} fill="currentColor" />
                    PAUSE
                  </button>

                  <button
                    id="record-lap-btn"
                    onClick={tracker.addManualLap}
                    style={{
                      flex: 1,
                      padding: '16px 10px',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '13px',
                      fontWeight: 800,
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                    title="Record Lap Split"
                  >
                    <Plus size={16} /> LAP
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    id="record-resume-btn"
                    onClick={tracker.resumeTracking}
                    style={{
                      flex: 2,
                      padding: '16px',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '16px',
                      fontWeight: 800,
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={18} fill="currentColor" />
                    RESUME
                  </button>

                  <button
                    id="record-finish-btn"
                    onClick={handleFinish}
                    style={{
                      flex: 2,
                      padding: '16px',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '16px',
                      fontWeight: 800,
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <Square size={16} fill="currentColor" />
                    FINISH
                  </button>

                  <button
                    id="record-discard-mini-btn"
                    onClick={handleDiscard}
                    style={{
                      flex: 1,
                      padding: '16px 8px',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Discard run"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CELEBRATION MODAL WITH MAP PREVIEW & PACE AREA CHART     */}
      {/* ======================================================== */}
      {showCelebration && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2000,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 40px',
              backgroundColor: '#ffffff',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                <Sparkles size={14} /> STRIDE COMPLETE
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, marginTop: '8px', color: '#0f172a' }}>
                Outstanding effort!
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>Ready to sync and share with community.</p>
            </div>

            {/* Title Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Activity Title
              </label>
              <input
                type="text"
                value={activityTitle}
                placeholder={`${tracker.activityType} Stride`}
                onChange={(e) => setActivityTitle(e.target.value)}
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '15px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            {/* Route Map Preview */}
            <div
              style={{
                width: '100%',
                height: '180px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                marginBottom: '16px',
                border: '1px solid #e2e8f0',
              }}
            >
              <MapViewer
                points={tracker.points}
                height={180}
                interactive={true}
                followLocation={false}
                showStartEndPins={true}
                showLocateButton={false}
                theme="light"
              />
            </div>

            {/* Summary Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div className="stride-card" style={{ padding: '14px', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>DISTANCE</span>
                <div className="metric-value" style={{ fontSize: '26px', marginTop: '2px', color: '#0f172a' }}>
                  {(tracker.totalDistanceMeters / 1000).toFixed(2)} km
                </div>
              </div>

              <div className="stride-card" style={{ padding: '14px', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>TIME</span>
                <div className="metric-value" style={{ fontSize: '26px', marginTop: '2px', color: '#10b981' }}>
                  {formatDurationString(tracker.elapsedDurationSec)}
                </div>
              </div>
            </div>

            {/* Pace Area Chart in Completion Modal */}
            <div className="stride-card" style={{ padding: '18px 16px', marginBottom: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Pace Breakdown</h4>
                <Info size={16} color="#94a3b8" />
              </div>

              <PaceAreaChart
                points={tracker.points}
                splits={tracker.splits}
                durationSec={tracker.elapsedDurationSec || tracker.movingDurationSec}
                avgPaceSec={tracker.averagePaceSec || 300}
                avgSpeedKmh={tracker.averageSpeedKmh}
                maxSpeedKmh={tracker.maxSpeedKmh}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Avg Pace</span>
                  <span className="metric-value" style={{ fontWeight: 700 }}>{formatPaceString(tracker.averagePaceSec)} /km</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Moving Time</span>
                  <span className="metric-value" style={{ fontWeight: 700 }}>{formatDurationString(tracker.movingDurationSec || tracker.elapsedDurationSec)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Elapsed Time</span>
                  <span className="metric-value" style={{ fontWeight: 700 }}>{formatDurationString(tracker.elapsedDurationSec)}</span>
                </div>
              </div>
            </div>

            {/* Share to Instagram Story & Socials Button */}
            <button
              id="celebration-share-story-btn"
              onClick={() => setShowShareModal(true)}
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: '10px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              }}
            >
              <Share2 size={16} /> SHARE TO INSTAGRAM STORY
            </button>

            {/* Action Buttons: Save & Discard */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                id="celebration-save-btn"
                onClick={handleSaveActivity}
                disabled={isSaving}
                style={{
                  flex: 3,
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 800,
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)',
                }}
              >
                {isSaving ? 'SAVING...' : 'SAVE STRIDE'}
              </button>

              <button
                id="celebration-discard-btn"
                onClick={handleDiscard}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#fee2e2',
                  color: '#ef4444',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Discard Run"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Activity / Instagram Story Modal */}
      {showShareModal && (
        <ShareActivityModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          activity={{
            title: activityTitle.trim() || `${tracker.activityType} Stride`,
            activityType: tracker.activityType,
            distanceMeters: tracker.totalDistanceMeters,
            durationSec: tracker.elapsedDurationSec || tracker.movingDurationSec,
            averagePaceSec: tracker.averagePaceSec,
            elevationGainM: tracker.elevationGainM,
            points: tracker.points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
          }}
        />
      )}
    </div>
  );
};
