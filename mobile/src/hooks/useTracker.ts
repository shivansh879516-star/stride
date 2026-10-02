import { useState, useEffect, useRef, useCallback } from 'react';

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null; // m/s
  accuracy?: number | null;
  timestamp: string;
}

export interface SplitRecord {
  splitNumber: number;
  distanceKm: number;
  durationSec: number;
  paceSec: number;
  paceFormatted: string;
  elevationDiffM: number;
}

const EARTH_RADIUS = 6371000;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (a: number) => (a * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatPaceString(paceSec: number): string {
  if (!paceSec || paceSec <= 0 || !isFinite(paceSec)) return '--:--';
  const mins = Math.floor(paceSec / 60);
  const secs = Math.floor(paceSec % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatDurationString(totalSec: number): string {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function useTracker() {
  const [activityType, setActivityType] = useState<'RUN' | 'WALK' | 'JOG' | 'CYCLE' | 'HIKE'>('RUN');
  const [status, setStatus] = useState<'IDLE' | 'RECORDING' | 'PAUSED' | 'COMPLETED'>('IDLE');
  const [autoPauseEnabled, setAutoPauseEnabled] = useState<boolean>(true);
  const [audioCoachEnabled, setAudioCoachEnabled] = useState<boolean>(true);
  const [targetDistanceMeters, setTargetDistanceMeters] = useState<number | null>(null);
  const [targetPaceSec, setTargetPaceSec] = useState<number | null>(null);

  const [points, setPoints] = useState<GpsPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GpsPoint | null>(() => {
    try {
      const cachedLat = localStorage.getItem('stride_last_lat');
      const cachedLng = localStorage.getItem('stride_last_lng');
      if (cachedLat && cachedLng) {
        return {
          latitude: parseFloat(cachedLat),
          longitude: parseFloat(cachedLng),
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [elapsedDurationSec, setElapsedDurationSec] = useState<number>(0);
  const [movingDurationSec, setMovingDurationSec] = useState<number>(0);
  const [totalDistanceMeters, setTotalDistanceMeters] = useState<number>(0);
  const [currentPaceSec, setCurrentPaceSec] = useState<number>(0);
  const [averagePaceSec, setAveragePaceSec] = useState<number>(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [averageSpeedKmh, setAverageSpeedKmh] = useState<number>(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number>(0);
  const [elevationGainM, setElevationGainM] = useState<number>(0);
  const [elevationLossM, setElevationLossM] = useState<number>(0);
  const [caloriesBurned, setCaloriesBurned] = useState<number>(0);
  const [splits, setSplits] = useState<SplitRecord[]>([]);

  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'SEARCHING' | 'LOCKED' | 'OFFLINE'>('SEARCHING');

  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const splitStartTimeRef = useRef<number>(0);
  const lastAnnouncedKmRef = useRef<number>(0);

  // Restore existing active session if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stride_active_recording');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.status === 'PAUSED' || parsed.status === 'RECORDING')) {
          setActivityType(parsed.activityType || 'RUN');
          setStatus('PAUSED'); // Resume in paused state for safety
          setPoints(parsed.points || []);
          setElapsedDurationSec(parsed.elapsedDurationSec || 0);
          setMovingDurationSec(parsed.movingDurationSec || 0);
          setTotalDistanceMeters(parsed.totalDistanceMeters || 0);
          setSplits(parsed.splits || []);
          if (parsed.points && parsed.points.length > 0) {
            setCurrentLocation(parsed.points[parsed.points.length - 1]);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save state continuously to localStorage
  useEffect(() => {
    if (status === 'RECORDING' || status === 'PAUSED') {
      localStorage.setItem(
        'stride_active_recording',
        JSON.stringify({
          status,
          activityType,
          points,
          elapsedDurationSec,
          movingDurationSec,
          totalDistanceMeters,
          splits,
        })
      );
    } else if (status === 'IDLE' || status === 'COMPLETED') {
      localStorage.removeItem('stride_active_recording');
    }
  }, [status, activityType, points, elapsedDurationSec, movingDurationSec, totalDistanceMeters, splits]);

  // Handle incoming real GPS coordinates
  const handleNewCoordinate = useCallback(
    (coords: { latitude: number; longitude: number; altitude?: number | null; speed?: number | null; accuracy?: number | null }) => {
      // Cache coordinates immediately for instant startup
      try {
        localStorage.setItem('stride_last_lat', String(coords.latitude));
        localStorage.setItem('stride_last_lng', String(coords.longitude));
      } catch {
        // ignore
      }

      const newPoint: GpsPoint = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude ?? null,
        speed: coords.speed ?? null,
        accuracy: coords.accuracy ?? null,
        timestamp: new Date().toISOString(),
      };

      setCurrentLocation(newPoint);
      setGpsAccuracy(coords.accuracy ?? 5);
      setGpsStatus('LOCKED');

      if (status !== 'RECORDING') return;

      setPoints((prev) => {
        if (prev.length === 0) {
          return [newPoint];
        }

        const last = prev[prev.length - 1];
        const stepDist = haversineMeters(last.latitude, last.longitude, newPoint.latitude, newPoint.longitude);

        // Ignore micro-jitter < 1.0 meters
        if (stepDist < 1.0) return prev;

        const newTotalDist = totalDistanceMeters + stepDist;
        setTotalDistanceMeters(newTotalDist);

        // Speed & Pace calculation
        const speedKmh = coords.speed ? coords.speed * 3.6 : (stepDist / 1) * 3.6;
        setCurrentSpeedKmh(Math.round(speedKmh * 10) / 10);
        setMaxSpeedKmh((curr) => Math.max(curr, Math.round(speedKmh * 10) / 10));

        const instantPace = speedKmh > 0 ? 3600 / speedKmh : 0;
        setCurrentPaceSec(Math.round(instantPace));

        // Elevation changes
        if (coords.altitude !== null && coords.altitude !== undefined && last.altitude !== null && last.altitude !== undefined) {
          const altDiff = coords.altitude - last.altitude;
          if (altDiff > 0.8) setElevationGainM((g) => Math.round((g + altDiff) * 10) / 10);
          else if (altDiff < -0.8) setElevationLossM((l) => Math.round((l + Math.abs(altDiff)) * 10) / 10);
        }

        // Calories estimate
        const kmFactor = activityType === 'CYCLE' ? 35 : activityType === 'WALK' ? 48 : 65;
        setCaloriesBurned(Math.round((newTotalDist / 1000) * kmFactor));

        // Kilometer Split detection
        const kmCompleted = Math.floor(newTotalDist / 1000);
        if (kmCompleted > splits.length && kmCompleted > 0) {
          const splitDur = elapsedDurationSec - splitStartTimeRef.current;
          const splitPace = splitDur;
          const newSplit: SplitRecord = {
            splitNumber: kmCompleted,
            distanceKm: 1.0,
            durationSec: splitDur,
            paceSec: splitPace,
            paceFormatted: formatPaceString(splitPace),
            elevationDiffM: 0,
          };
          setSplits((s) => [...s, newSplit]);
          splitStartTimeRef.current = elapsedDurationSec;

          // Strava-Style Audio Voice Pace Coach Announcement
          if (audioCoachEnabled && 'speechSynthesis' in window && kmCompleted !== lastAnnouncedKmRef.current) {
            lastAnnouncedKmRef.current = kmCompleted;
            try {
              const mins = Math.floor(splitPace / 60);
              const secs = splitPace % 60;
              const text = `Kilometer ${kmCompleted}. Split pace: ${mins} minutes ${secs} seconds. Total distance: ${(newTotalDist / 1000).toFixed(1)} kilometers.`;
              const utter = new SpeechSynthesisUtterance(text);
              utter.rate = 1.05;
              utter.pitch = 1.0;
              window.speechSynthesis.speak(utter);
            } catch {
              // ignore
            }
          }
        }

        return [...prev, newPoint];
      });
    },
    [status, totalDistanceMeters, activityType, elapsedDurationSec, splits.length, audioCoachEnabled]
  );

  // Timer Interval
  useEffect(() => {
    if (status === 'RECORDING') {
      timerIntervalRef.current = setInterval(() => {
        setElapsedDurationSec((sec) => {
          const next = sec + 1;
          if (totalDistanceMeters > 30) {
            const km = totalDistanceMeters / 1000;
            const avgPace = next / km;
            setAveragePaceSec(Math.round(avgPace));
            setAverageSpeedKmh(Math.round((km / (next / 3600)) * 10) / 10);
          }
          return next;
        });

        if (!autoPauseEnabled || currentSpeedKmh > 1.2) {
          setMovingDurationSec((sec) => sec + 1);
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status, totalDistanceMeters, autoPauseEnabled, currentSpeedKmh]);

  // Real Native Device Geolocation Watcher
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('OFFLINE');
      return;
    }

    // Immediately get initial position to lock user's real location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleNewCoordinate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        console.warn('Initial geolocation fetch error:', err.message);
        setGpsStatus('SEARCHING');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        handleNewCoordinate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        setGpsStatus('SEARCHING');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [handleNewCoordinate]);

  const startTracking = () => {
    setStatus('RECORDING');
    splitStartTimeRef.current = 0;
  };

  const pauseTracking = () => {
    setStatus('PAUSED');
  };

  const resumeTracking = () => {
    setStatus('RECORDING');
  };

  const finishTracking = () => {
    setStatus('COMPLETED');
  };

  const addManualLap = () => {
    if (status !== 'RECORDING') return;
    const splitDur = elapsedDurationSec - splitStartTimeRef.current;
    const splitDistKm = Math.max(0.1, (totalDistanceMeters - splits.reduce((acc, s) => acc + s.distanceKm * 1000, 0)) / 1000);
    const splitPace = splitDistKm > 0 ? Math.round(splitDur / splitDistKm) : 0;
    const newSplit: SplitRecord = {
      splitNumber: splits.length + 1,
      distanceKm: Math.round(splitDistKm * 100) / 100,
      durationSec: splitDur,
      paceSec: splitPace,
      paceFormatted: formatPaceString(splitPace),
      elevationDiffM: 0,
    };
    setSplits((s) => [...s, newSplit]);
    splitStartTimeRef.current = elapsedDurationSec;
  };

  const resetTracking = () => {
    setStatus('IDLE');
    setPoints([]);
    setElapsedDurationSec(0);
    setMovingDurationSec(0);
    setTotalDistanceMeters(0);
    setCurrentPaceSec(0);
    setAveragePaceSec(0);
    setCurrentSpeedKmh(0);
    setAverageSpeedKmh(0);
    setMaxSpeedKmh(0);
    setElevationGainM(0);
    setElevationLossM(0);
    setCaloriesBurned(0);
    setSplits([]);
    localStorage.removeItem('stride_active_recording');
  };

  return {
    activityType,
    setActivityType,
    status,
    autoPauseEnabled,
    setAutoPauseEnabled,
    audioCoachEnabled,
    setAudioCoachEnabled,
    targetDistanceMeters,
    setTargetDistanceMeters,
    targetPaceSec,
    setTargetPaceSec,
    points,
    currentLocation,
    elapsedDurationSec,
    movingDurationSec,
    totalDistanceMeters,
    currentPaceSec,
    averagePaceSec,
    currentSpeedKmh,
    averageSpeedKmh,
    maxSpeedKmh,
    elevationGainM,
    elevationLossM,
    caloriesBurned,
    splits,
    gpsAccuracy,
    gpsStatus,
    startTracking,
    pauseTracking,
    resumeTracking,
    finishTracking,
    resetTracking,
    addManualLap,
  };
}
