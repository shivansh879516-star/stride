import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Crosshair, Navigation } from 'lucide-react';

export interface MapPoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
}

interface MapViewerProps {
  points?: MapPoint[];
  plannedRoutePoints?: MapPoint[];
  currentLocation?: MapPoint | null;
  interactive?: boolean;
  height?: string | number;
  zoom?: number;
  theme?: 'dark' | 'light';
  showStartEndPins?: boolean;
  followLocation?: boolean;
  showLocateButton?: boolean;
  locateButtonPosition?: 'bottom-right' | 'top-right';
}

export const MapViewer: React.FC<MapViewerProps> = ({
  points = [],
  plannedRoutePoints = [],
  currentLocation = null,
  interactive = true,
  height = '100%',
  zoom = 16,
  theme = 'light',
  showStartEndPins = true,
  followLocation = true,
  showLocateButton = true,
  locateButtonPosition = 'bottom-right',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineOutlineRef = useRef<L.Polyline | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const plannedPolylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userDotRef = useRef<L.CircleMarker | null>(null);
  const userHaloRef = useRef<L.Circle | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch {}
      mapInstanceRef.current = null;
    }

    // Reset all layer references on map recreation
    polylineOutlineRef.current = null;
    polylineRef.current = null;
    plannedPolylineRef.current = null;
    userMarkerRef.current = null;
    userDotRef.current = null;
    userHaloRef.current = null;
    startMarkerRef.current = null;
    endMarkerRef.current = null;

    // Read cached coordinates immediately so the map NEVER defaults to random Delhi
    let cachedLat = NaN;
    let cachedLng = NaN;
    try {
      cachedLat = parseFloat(localStorage.getItem('stride_last_lat') || '');
      cachedLng = parseFloat(localStorage.getItem('stride_last_lng') || '');
    } catch {
      // ignore
    }
    const hasCached = !isNaN(cachedLat) && !isNaN(cachedLng);

    const initialLat =
      currentLocation?.latitude ??
      (points.length > 0 ? points[0].latitude : plannedRoutePoints.length > 0 ? plannedRoutePoints[0].latitude : hasCached ? cachedLat : 28.6139);

    const initialLng =
      currentLocation?.longitude ??
      (points.length > 0 ? points[0].longitude : plannedRoutePoints.length > 0 ? plannedRoutePoints[0].longitude : hasCached ? cachedLng : 77.2090);

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom,
      zoomControl: false,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      attributionControl: false,
    });

    // High quality standard OpenStreetMap tile layer (clean roads, green parks, blue waterways)
    const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Immediately render user location dot on map from first frame
    const initLat = currentLocation?.latitude ?? (hasCached ? cachedLat : null);
    const initLng = currentLocation?.longitude ?? (hasCached ? cachedLng : null);
    if (initLat !== null && initLng !== null) {
      userHaloRef.current = L.circle([initLat, initLng], {
        radius: 20,
        color: '#10b981',
        weight: 1.5,
        fillColor: '#10b981',
        fillOpacity: 0.22,
        interactive: false,
      }).addTo(map);

      userDotRef.current = L.circleMarker([initLat, initLng], {
        radius: 8,
        color: '#ffffff',
        weight: 3.5,
        fillColor: '#10b981',
        fillOpacity: 1,
        pane: 'markerPane',
        interactive: false,
      }).addTo(map);
    }

    // Immediately try to lock real device location if not yet available
    if (!currentLocation && !hasCached && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            localStorage.setItem('stride_last_lat', String(pos.coords.latitude));
            localStorage.setItem('stride_last_lng', String(pos.coords.longitude));
          } catch {
            // ignore
          }
          if (mapInstanceRef.current && points.length === 0 && plannedRoutePoints.length === 0) {
            mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 16, { animate: false });
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      try {
        map.remove();
      } catch {}
      mapInstanceRef.current = null;
      polylineOutlineRef.current = null;
      polylineRef.current = null;
      plannedPolylineRef.current = null;
      userMarkerRef.current = null;
      userDotRef.current = null;
      userHaloRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
    };
  }, [theme]);

  // Update Polyline Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const latLngs: L.LatLngTuple[] = points.map((p) => [p.latitude, p.longitude]);

    // White outline for high contrast on any map terrain (Strava style)
    if (!polylineOutlineRef.current) {
      polylineOutlineRef.current = L.polyline(latLngs, {
        color: '#ffffff',
        weight: 8,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);
    } else {
      polylineOutlineRef.current.setLatLngs(latLngs);
    }

    // Main athletic vibrant green polyline
    if (!polylineRef.current) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#10b981',
        weight: 5,
        opacity: 1,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);
    } else {
      polylineRef.current.setLatLngs(latLngs);
    }

    // Planned Route Overlay (from Explore)
    if (plannedRoutePoints && plannedRoutePoints.length > 1) {
      const plannedLatLngs: L.LatLngTuple[] = plannedRoutePoints.map((p) => [p.latitude, p.longitude]);
      if (!plannedPolylineRef.current) {
        plannedPolylineRef.current = L.polyline(plannedLatLngs, {
          color: '#0284c7',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);
      } else {
        plannedPolylineRef.current.setLatLngs(plannedLatLngs);
      }
    }

    // Auto-fit route bounds when viewing completed stride or planned route
    if (points.length > 1 && !followLocation) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else if (points.length === 0 && plannedRoutePoints && plannedRoutePoints.length > 1) {
      const bounds = L.latLngBounds(plannedRoutePoints.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }

    // Start Marker (Clean Emerald Dot)
    if (showStartEndPins && (points.length > 0 || plannedRoutePoints.length > 0)) {
      const start = points.length > 0 ? points[0] : plannedRoutePoints[0];
      const startIcon = L.divIcon({
        className: 'stride-pin-start',
        html: `
          <div style="background-color:#10b981; width:16px; height:16px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker([start.latitude, start.longitude], { icon: startIcon }).addTo(map);
      } else {
        startMarkerRef.current.setLatLng([start.latitude, start.longitude]);
      }
    }

    // End Marker (Clean Dark Pin with Emerald Core)
    if (showStartEndPins && (points.length > 1 || (!followLocation && plannedRoutePoints.length > 1))) {
      const end = points.length > 1 ? points[points.length - 1] : plannedRoutePoints[plannedRoutePoints.length - 1];
      const endIcon = L.divIcon({
        className: 'stride-pin-end',
        html: `
          <div style="background-color:#0f172a; width:16px; height:16px; border-radius:3px; border:3px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center;">
            <div style="width:4px; height:4px; background:#10b981; border-radius:50%;"></div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      if (!endMarkerRef.current) {
        endMarkerRef.current = L.marker([end.latitude, end.longitude], { icon: endIcon }).addTo(map);
      } else {
        endMarkerRef.current.setLatLng([end.latitude, end.longitude]);
      }
    }
  }, [points, plannedRoutePoints, showStartEndPins, followLocation]);

  // Track user position with guaranteed fallback from cached coordinates
  const [userPos, setUserPos] = useState<MapPoint | null>(() => {
    if (currentLocation) return currentLocation;
    try {
      const clat = localStorage.getItem('stride_last_lat');
      const clng = localStorage.getItem('stride_last_lng');
      if (clat && clng) return { latitude: parseFloat(clat), longitude: parseFloat(clng) };
    } catch {}
    return null;
  });

  useEffect(() => {
    if (currentLocation) {
      setUserPos(currentLocation);
    }
  }, [currentLocation]);

  // Update Live Current Location Marker with guaranteed Circle & CircleMarker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userPos) return;

    // Translucent pulse accuracy halo
    if (!userHaloRef.current || !map.hasLayer(userHaloRef.current)) {
      if (userHaloRef.current) {
        try { map.removeLayer(userHaloRef.current); } catch {}
      }
      userHaloRef.current = L.circle([userPos.latitude, userPos.longitude], {
        radius: 20,
        color: '#10b981',
        weight: 1.5,
        fillColor: '#10b981',
        fillOpacity: 0.22,
        interactive: false,
      }).addTo(map);
    } else {
      userHaloRef.current.setLatLng([userPos.latitude, userPos.longitude]);
    }

    // High-contrast vibrant athletic green core dot with white border
    if (!userDotRef.current || !map.hasLayer(userDotRef.current)) {
      if (userDotRef.current) {
        try { map.removeLayer(userDotRef.current); } catch {}
      }
      userDotRef.current = L.circleMarker([userPos.latitude, userPos.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 3.5,
        fillColor: '#10b981',
        fillOpacity: 1,
        pane: 'markerPane',
        interactive: false,
      }).addTo(map);
    } else {
      userDotRef.current.setLatLng([userPos.latitude, userPos.longitude]);
    }

    if (followLocation) {
      map.panTo([userPos.latitude, userPos.longitude], { animate: true });
    }
  }, [userPos, followLocation]);

  // Center on User's Real Device Location Button Handler
  const handleLocateUser = useCallback(() => {
    setIsLocating(true);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: MapPoint = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserPos(newPos);
          try {
            localStorage.setItem('stride_last_lat', String(newPos.latitude));
            localStorage.setItem('stride_last_lng', String(newPos.longitude));
          } catch {}

          if (mapInstanceRef.current) {
            const m = mapInstanceRef.current;
            if (!userHaloRef.current || !m.hasLayer(userHaloRef.current)) {
              if (userHaloRef.current) { try { m.removeLayer(userHaloRef.current); } catch {} }
              userHaloRef.current = L.circle([newPos.latitude, newPos.longitude], {
                radius: 20,
                color: '#10b981',
                weight: 1.5,
                fillColor: '#10b981',
                fillOpacity: 0.22,
                interactive: false,
              }).addTo(m);
            } else {
              userHaloRef.current.setLatLng([newPos.latitude, newPos.longitude]);
            }

            if (!userDotRef.current || !m.hasLayer(userDotRef.current)) {
              if (userDotRef.current) { try { m.removeLayer(userDotRef.current); } catch {} }
              userDotRef.current = L.circleMarker([newPos.latitude, newPos.longitude], {
                radius: 8,
                color: '#ffffff',
                weight: 3.5,
                fillColor: '#10b981',
                fillOpacity: 1,
                pane: 'markerPane',
                interactive: false,
              }).addTo(m);
            } else {
              userDotRef.current.setLatLng([newPos.latitude, newPos.longitude]);
            }

            m.flyTo([newPos.latitude, newPos.longitude], 17, { animate: true, duration: 0.8 });
          }
          setTimeout(() => setIsLocating(false), 800);
        },
        (err) => {
          if (userPos) {
            map.flyTo([userPos.latitude, userPos.longitude], 17, { animate: true, duration: 0.8 });
          } else {
            alert('Could not retrieve current location. Please ensure location permissions are enabled.');
          }
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else if (userPos) {
      map.flyTo([userPos.latitude, userPos.longitude], 17, { animate: true, duration: 0.8 });
      setIsLocating(false);
    }
  }, [userPos]);

  return (
    <div
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: 'inherit',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating One-Click "Locate Me" Button (High Contrast, Athletic Green Crosshair) */}
      {showLocateButton && interactive && (
        <button
          id="map-locate-me-btn"
          onClick={handleLocateUser}
          style={{
            position: 'absolute',
            ...(locateButtonPosition === 'top-right'
              ? { top: '16px', right: '16px' }
              : { bottom: '16px', right: '16px' }),
            zIndex: 999,
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-card)',
            border: '2px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#10b981',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          title="Center on my current location"
        >
          <Crosshair size={24} className={isLocating ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
};
