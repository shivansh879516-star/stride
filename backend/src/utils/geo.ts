/**
 * STRIDE Geodesic, GPS, Pace & Privacy Utilities
 */

export interface LatLngPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed?: number | null;
  timestamp: string | Date;
  accuracy?: number | null;
}

export interface SplitItem {
  splitNumber: number;
  distanceKm: number;
  durationSec: number;
  paceSec: number;
  paceFormatted: string;
  elevationDiffM: number;
}

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Great-Circle distance between two coordinates in meters using the Haversine formula
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates total distance of an array of GPS points in meters
 */
export function calculateTotalDistanceMeters(points: LatLngPoint[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversineDistanceMeters(
      points[i].latitude,
      points[i].longitude,
      points[i + 1].latitude,
      points[i + 1].longitude
    );
  }
  return total;
}

/**
 * Formats pace in seconds/km into string "MM:SS /km"
 */
export function formatPace(paceSec: number): string {
  if (!paceSec || paceSec <= 0 || !isFinite(paceSec)) return '--:--';
  const minutes = Math.floor(paceSec / 60);
  const seconds = Math.floor(paceSec % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds} /km`;
}

/**
 * Generates kilometer splits from track points
 */
export function computeSplits(points: LatLngPoint[]): SplitItem[] {
  if (points.length < 2) return [];

  const splits: SplitItem[] = [];
  let currentSplit = 1;
  let accumulatedDist = 0;
  let splitStartIdx = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segmentDist = haversineDistanceMeters(
      p1.latitude,
      p1.longitude,
      p2.latitude,
      p2.longitude
    );

    accumulatedDist += segmentDist;

    // Check if we hit a 1 km milestone
    if (accumulatedDist >= currentSplit * 1000) {
      const tStart = new Date(points[splitStartIdx].timestamp).getTime();
      const tEnd = new Date(p2.timestamp).getTime();
      const durationSec = Math.max(1, Math.round((tEnd - tStart) / 1000));
      const splitDistKm = (accumulatedDist - (currentSplit - 1) * 1000) / 1000;
      const paceSec = durationSec / Math.max(0.1, splitDistKm);

      const altStart = points[splitStartIdx].altitude || 0;
      const altEnd = p2.altitude || 0;
      const elevationDiffM = Math.round(altEnd - altStart);

      splits.push({
        splitNumber: currentSplit,
        distanceKm: 1.0,
        durationSec,
        paceSec: Math.round(paceSec),
        paceFormatted: formatPace(paceSec),
        elevationDiffM,
      });

      currentSplit++;
      splitStartIdx = i + 1;
    }
  }

  // Add final partial split if remaining distance > 100m
  const remainingDist = accumulatedDist - (currentSplit - 1) * 1000;
  if (remainingDist >= 100 && splitStartIdx < points.length - 1) {
    const tStart = new Date(points[splitStartIdx].timestamp).getTime();
    const tEnd = new Date(points[points.length - 1].timestamp).getTime();
    const durationSec = Math.max(1, Math.round((tEnd - tStart) / 1000));
    const distKm = remainingDist / 1000;
    const paceSec = durationSec / distKm;

    splits.push({
      splitNumber: currentSplit,
      distanceKm: parseFloat(distKm.toFixed(2)),
      durationSec,
      paceSec: Math.round(paceSec),
      paceFormatted: formatPace(paceSec),
      elevationDiffM: 0,
    });
  }

  return splits;
}

/**
 * Calculates elevation gain and loss from track points
 */
export function calculateElevation(points: LatLngPoint[]): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const alt1 = points[i].altitude;
    const alt2 = points[i + 1].altitude;
    if (alt1 !== null && alt1 !== undefined && alt2 !== null && alt2 !== undefined) {
      const diff = alt2 - alt1;
      // Filter slight GPS altitude jitter < 1m
      if (diff > 1.0) gain += diff;
      else if (diff < -1.0) loss += Math.abs(diff);
    }
  }

  return { gain: Math.round(gain * 10) / 10, loss: Math.round(loss * 10) / 10 };
}

/**
 * Mask points that fall within privacy zones or near start/finish for privacy protection
 */
export function applyPrivacyMask(
  points: LatLngPoint[],
  privacyZones: Array<{ latitude: number; longitude: number; radiusMeters: number }>,
  startEndRadiusMeters: number
): LatLngPoint[] {
  if (points.length < 2) return points;

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return points.filter((p) => {
    // Check start radius
    if (
      startEndRadiusMeters > 0 &&
      haversineDistanceMeters(p.latitude, p.longitude, startPoint.latitude, startPoint.longitude) <
        startEndRadiusMeters
    ) {
      return false;
    }

    // Check end radius
    if (
      startEndRadiusMeters > 0 &&
      haversineDistanceMeters(p.latitude, p.longitude, endPoint.latitude, endPoint.longitude) <
        startEndRadiusMeters
    ) {
      return false;
    }

    // Check custom privacy zones (e.g. Home, Workplace)
    for (const zone of privacyZones) {
      if (
        haversineDistanceMeters(p.latitude, p.longitude, zone.latitude, zone.longitude) <
        zone.radiusMeters
      ) {
        return false;
      }
    }

    return true;
  });
}
