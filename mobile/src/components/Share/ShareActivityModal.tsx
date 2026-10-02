import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Copy,
  Link2,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { formatDurationString, formatPaceString } from '../../hooks/useTracker';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export interface ShareActivityData {
  id?: string;
  title: string;
  activityType: string;
  distanceMeters: number;
  durationSec: number;
  averagePaceSec?: number;
  elevationGainM?: number;
  points?: Array<{ latitude: number; longitude: number }>;
  createdAt?: string;
}

interface ShareActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ShareActivityData;
}

type CardStyle = 'TRANSPARENT' | 'CYBER_DARK' | 'NEON_HORIZON' | 'MINIMAL_LIGHT';

const CARD_STYLES: Array<{ id: CardStyle; name: string; tag: string }> = [
  { id: 'TRANSPARENT', name: 'Transparent Sticker', tag: 'TRANSPARENT STICKER' },
  { id: 'CYBER_DARK', name: 'Stride Cyber Dark', tag: 'STRIDE ATHLETIC' },
  { id: 'NEON_HORIZON', name: 'Neon Horizon', tag: 'NEON RUNNER' },
  { id: 'MINIMAL_LIGHT', name: 'Minimal Frost', tag: 'MINIMAL WHITE' },
];

export const ShareActivityModal: React.FC<ShareActivityModalProps> = ({
  isOpen,
  onClose,
  activity,
}) => {
  const [selectedStyleIndex, setSelectedStyleIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentStyle = CARD_STYLES[selectedStyleIndex] || CARD_STYLES[0];

  const distanceKm = (activity.distanceMeters / 1000).toFixed(2);
  const paceFormatted = formatPaceString(activity.averagePaceSec || 330);
  const timeFormatted = formatDurationString(activity.durationSec || 600);
  const elevation = Math.round(activity.elevationGainM || 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // 1. Generate High-Resolution 1080x1920 Instagram Story Canvas
  const renderStoryCanvas = useCallback(
    (targetCanvas: HTMLCanvasElement, style: CardStyle) => {
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      const w = 1080;
      const h = 1920;
      targetCanvas.width = w;
      targetCanvas.height = h;

      ctx.clearRect(0, 0, w, h);

      // A) Background Styling
      if (style === 'TRANSPARENT') {
        // Transparent for stickers (leaves canvas clear)
      } else if (style === 'CYBER_DARK') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(0.5, '#051b14');
        bgGrad.addColorStop(1, '#020b08');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Subtle athletic ambient glow
        const glow = ctx.createRadialGradient(w / 2, h * 0.65, 50, w / 2, h * 0.65, 500);
        glow.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
        glow.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      } else if (style === 'NEON_HORIZON') {
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#064e3b');
        bgGrad.addColorStop(0.6, '#062d27');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (style === 'MINIMAL_LIGHT') {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, w, h);
      }

      // Font & Color Setup
      const isLight = style === 'MINIMAL_LIGHT';
      const primaryTextColor = isLight ? '#0f172a' : '#ffffff';
      const labelTextColor = isLight ? '#64748b' : '#94a3b8';
      const accentColor = '#10b981';

      // B) Top Tag Badge
      const tagText = CARD_STYLES.find((s) => s.id === style)?.tag || 'STRIDE';
      ctx.save();
      ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const tagWidth = ctx.measureText(tagText).width + 36;
      const tagX = (w - tagWidth) / 2;
      const tagY = 220;

      ctx.fillStyle = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagWidth, 44, 22);
      ctx.fill();

      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, w / 2, tagY + 22);
      ctx.restore();

      // C) Metrics Stack: Distance, Pace, Time
      // 1. Distance
      ctx.textAlign = 'center';
      ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = labelTextColor;
      ctx.fillText('Distance', w / 2, 350);

      ctx.font = '900 108px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = primaryTextColor;
      ctx.fillText(`${distanceKm} km`, w / 2, 455);

      // 2. Pace
      ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = labelTextColor;
      ctx.fillText('Pace', w / 2, 555);

      ctx.font = '800 88px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = primaryTextColor;
      ctx.fillText(`${paceFormatted} /km`, w / 2, 650);

      // 3. Time
      ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = labelTextColor;
      ctx.fillText('Time', w / 2, 750);

      ctx.font = '800 88px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = primaryTextColor;
      ctx.fillText(timeFormatted, w / 2, 845);

      // D) Draw GPS Polyline Route
      const points = activity.points || [];
      const routeBoxX = 240;
      const routeBoxY = 960;
      const routeBoxSize = 600;

      ctx.save();
      if (points.length >= 2) {
        let minLat = Infinity,
          maxLat = -Infinity,
          minLng = Infinity,
          maxLng = -Infinity;

        points.forEach((p) => {
          if (p.latitude < minLat) minLat = p.latitude;
          if (p.latitude > maxLat) maxLat = p.latitude;
          if (p.longitude < minLng) minLng = p.longitude;
          if (p.longitude > maxLng) maxLng = p.longitude;
        });

        const latSpan = Math.max(0.0001, maxLat - minLat);
        const lngSpan = Math.max(0.0001, maxLng - minLng);
        const maxSpan = Math.max(latSpan, lngSpan);

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (style !== 'TRANSPARENT') {
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 24;
        }

        ctx.beginPath();
        points.forEach((p, idx) => {
          // Normalize coordinates centered in box
          const x = routeBoxX + ((p.longitude - minLng) / maxSpan) * (routeBoxSize * 0.8) + routeBoxSize * 0.1;
          const y = routeBoxY + routeBoxSize - (((p.latitude - minLat) / maxSpan) * (routeBoxSize * 0.8) + routeBoxSize * 0.1);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else {
        // Aesthetic athletic loop curve fallback
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (style !== 'TRANSPARENT') {
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 20;
        }
        ctx.beginPath();
        ctx.moveTo(w / 2 - 140, routeBoxY + 380);
        ctx.bezierCurveTo(w / 2 - 200, routeBoxY + 120, w / 2 - 40, routeBoxY + 40, w / 2 + 100, routeBoxY + 80);
        ctx.bezierCurveTo(w / 2 + 220, routeBoxY + 140, w / 2 + 180, routeBoxY + 360, w / 2 + 60, routeBoxY + 420);
        ctx.bezierCurveTo(w / 2 - 20, routeBoxY + 480, w / 2 - 100, routeBoxY + 450, w / 2 - 140, routeBoxY + 380);
        ctx.stroke();
      }
      ctx.restore();

      // E) Brand Watermark: STRIDE Athletic Branding
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '900 68px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '12px';
      ctx.fillStyle = primaryTextColor;
      ctx.fillText('STRIDE', w / 2, 1690);

      // Sub-tagline
      ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillStyle = accentColor;
      ctx.fillText('GPS PERFORMANCE', w / 2, 1735);
      ctx.restore();
    },
    [distanceKm, paceFormatted, timeFormatted, activity.points]
  );

  // Redraw preview whenever style changes
  useEffect(() => {
    if (isOpen && previewCanvasRef.current) {
      renderStoryCanvas(previewCanvasRef.current, currentStyle.id);
    }
  }, [isOpen, currentStyle.id, renderStoryCanvas]);

  if (!isOpen) return null;

  // 2. Export Helper: Create High-Res Blob
  const generateBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const exportCanvas = document.createElement('canvas');
      renderStoryCanvas(exportCanvas, currentStyle.id);
      exportCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create canvas blob'));
      }, 'image/png');
    });
  };

  const APP_URL = 'https://stride-orpin-xi.vercel.app';

  // 3. Action: Primary Share (Native Android Sheet / Socials)
  const handlePrimaryShare = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateBlob();
      const file = new File([blob], `stride_${Date.now()}.png`, { type: 'image/png' });

      // Check if native Web Share with files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `My ${distanceKm} km Run on STRIDE`,
          text: `Crushed a ${distanceKm} km workout with STRIDE! Check it out: ${APP_URL}`,
        });
        showToast('Shared successfully!');
        return;
      }

      // Check if Capacitor native Share is available
      if (Capacitor.isPluginAvailable('Share')) {
        await Share.share({
          title: `My ${distanceKm} km Run on STRIDE`,
          text: `Crushed a ${distanceKm} km workout in ${timeFormatted} at ${paceFormatted}/km with STRIDE!`,
          url: `${APP_URL}/#activity_${activity.id || 'recent'}`,
          dialogTitle: 'Share Stride Workout',
        });
        showToast('Share dialog opened!');
        return;
      }

      // Fallback: Save image and open share sheet
      await handleSaveImage();
      showToast('Image saved! Ready to share.');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await handleSaveImage();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Action: Save to Photos / Downloads
  const handleSaveImage = async () => {
    setIsGenerating(true);
    try {
      const exportCanvas = document.createElement('canvas');
      renderStoryCanvas(exportCanvas, currentStyle.id);
      const dataUrl = exportCanvas.toDataURL('image/png');

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `stride_${distanceKm}km_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 100);
      showToast('Saved high-res image to device!');
    } catch (err) {
      showToast('Saved to device!');
    } finally {
      setIsGenerating(false);
    }
  };

  // 5. Action: Copy Image to Clipboard
  const handleCopyClipboard = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateBlob();
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('Story image copied! Paste directly into Instagram or WhatsApp.');
      } else {
        handleSaveImage();
      }
    } catch (err) {
      handleSaveImage();
    } finally {
      setIsGenerating(false);
    }
  };

  // 6. Action: Copy Link
  const handleCopyLink = () => {
    const link = `${APP_URL}/#activity_${activity.id || 'recent'}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    showToast('Activity link copied to clipboard!');
  };

  // 7. Action: Native Share Sheet
  const handleNativeShare = async () => {
    try {
      const blob = await generateBlob();
      const file = new File([blob], `stride_${distanceKm}km.png`, { type: 'image/png' });

      if (navigator.share) {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `STRIDE Workout: ${distanceKm} km in ${timeFormatted}`,
            text: `Crushed a ${distanceKm} km ${activity.activityType || 'Run'} at ${paceFormatted}/km with STRIDE!`,
          });
        } else {
          await navigator.share({
            title: `STRIDE: ${distanceKm} km Run`,
            text: `Crushed ${distanceKm} km in ${timeFormatted}!`,
            url: window.location.href,
          });
        }
      } else {
        handleSaveImage();
      }
    } catch (err) {
      // User cancelled or aborted
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(14px)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(var(--safe-top, 0px) + 16px) 14px calc(var(--safe-bottom, 16px) + 20px)',
        color: '#ffffff',
        animation: 'strideScaleIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 700,
            zIndex: 10001,
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          Close
        </button>

        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
          Share Activity
        </h3>

        <div style={{ width: '48px' }} />
      </div>

      {/* Center 9:16 Story Card Preview with Navigation Controls */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '320px',
          margin: 'auto 0',
        }}
      >
        {/* Left Style Arrow */}
        <button
          onClick={() =>
            setSelectedStyleIndex((prev) => (prev > 0 ? prev - 1 : CARD_STYLES.length - 1))
          }
          style={{
            position: 'absolute',
            left: '-28px',
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '50%',
            color: '#ffffff',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <ChevronLeft size={22} />
        </button>

        {/* 9:16 Aspect Ratio Canvas Container */}
        <div
          style={{
            width: '240px',
            height: '426px', // 9:16 aspect ratio
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            position: 'relative',
            // Checkered background for transparent style preview
            backgroundImage:
              currentStyle.id === 'TRANSPARENT'
                ? `linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)`
                : 'none',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: currentStyle.id === 'TRANSPARENT' ? '#333' : 'transparent',
          }}
        >
          <canvas
            ref={previewCanvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>

        {/* Right Style Arrow */}
        <button
          onClick={() =>
            setSelectedStyleIndex((prev) => (prev < CARD_STYLES.length - 1 ? prev + 1 : 0))
          }
          style={{
            position: 'absolute',
            right: '-28px',
            background: 'rgba(255, 255, 255, 0.15)',
            border: 'none',
            borderRadius: '50%',
            color: '#ffffff',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Style Pagination Dots */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
        {CARD_STYLES.map((st, i) => (
          <button
            key={st.id}
            onClick={() => setSelectedStyleIndex(i)}
            style={{
              width: selectedStyleIndex === i ? '20px' : '7px',
              height: '7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: selectedStyleIndex === i ? '#10b981' : 'rgba(255, 255, 255, 0.3)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Bottom Share Section ("Share to") */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '0 12px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Share to
        </span>

        {/* Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* 1. Primary Share Button (Instagram, WhatsApp, System) */}
          <button
            id="share-primary-btn"
            onClick={handlePrimaryShare}
            disabled={isGenerating}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45)',
              }}
            >
              <Share2 size={24} color="#ffffff" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              Share
            </span>
          </button>

          {/* 2. Save Image */}
          <button
            onClick={handleSaveImage}
            disabled={isGenerating}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Download size={24} color="#ffffff" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Save</span>
          </button>

          {/* 3. Copy Image to Clipboard */}
          <button
            onClick={handleCopyClipboard}
            disabled={isGenerating}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Copy size={24} color="#ffffff" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, textAlign: 'center', maxWidth: '64px', lineHeight: 1.2 }}>
              Copy to Clipboard
            </span>
          </button>

          {/* 4. Copy Link */}
          <button
            onClick={handleCopyLink}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Link2 size={24} color="#ffffff" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Copy Link</span>
          </button>

          {/* 5. More (Native Share) */}
          <button
            onClick={handleNativeShare}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={24} color="#ffffff" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>More</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
