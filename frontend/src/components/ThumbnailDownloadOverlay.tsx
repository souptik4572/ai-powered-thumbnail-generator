import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { BackendThumbnail } from '../api';
import Icon from './Icon';
import { useToastStore } from '../hooks/useToast';

const VARIANTS = [
  { key: 'youtube', label: 'YouTube', dim: '1280×720',  icon: 'tv' },
  { key: 'shorts',  label: 'Shorts',  dim: '1080×1920', icon: 'smartphone' },
  { key: 'square',  label: 'Square',  dim: '1080×1080', icon: 'square' },
] as const;

export async function downloadImage(url: string, filename: string): Promise<'downloaded' | 'opened'> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    return 'downloaded';
  } catch {
    window.open(url, '_blank');
    return 'opened';
  }
}

// ─── Single variant download pill (download + open-in-tab) ───────────────────

function VariantPill({
  variantKey, label, dim, icon, url, styleName, compact, hovered, index,
}: {
  variantKey: string; label: string; dim: string; icon: string;
  url: string; styleName: string; compact: boolean; hovered: boolean; index: number;
}) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const result = await downloadImage(url, `hookframe-${styleName}-${variantKey}.jpg`);
    setBusy(false);
    if (result === 'downloaded') {
      useToastStore.getState().push(`${label} (${dim}) saved!`, 'success');
    } else {
      useToastStore.getState().push('Opening in new tab — direct download unavailable.', 'info');
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      borderRadius: 99, overflow: 'hidden',
      background: 'rgba(255,255,255,0.14)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.2)',
      color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800, whiteSpace: 'nowrap',
      transform: hovered ? 'scale(1) translateY(0)' : `scale(0.82) translateY(${8 + index * 4}px)`,
      opacity: hovered ? 1 : 0,
      transition: `transform 240ms cubic-bezier(0.34,1.56,0.64,1) ${index * 55}ms,
                   opacity 180ms ease ${index * 55}ms`,
    }}>
      <button
        onClick={handleDownload}
        title={`Download ${label} (${dim})`}
        style={{
          display: 'flex', alignItems: 'center',
          gap: compact ? 0 : 7,
          justifyContent: compact ? 'center' : 'flex-start',
          height: compact ? 32 : 34,
          padding: compact ? '0 10px' : '0 12px',
          border: 0, background: 'transparent',
          cursor: busy ? 'wait' : 'pointer',
          color: '#fff', fontSize: compact ? 10 : 11,
          fontFamily: 'inherit', fontWeight: 800, letterSpacing: '0.04em',
        }}
      >
        {busy
          ? <div style={{ width: 12, height: 12, flexShrink: 0, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: 99, animation: 'spin-slow 0.7s linear infinite' }} />
          : <Icon name={icon} size={compact ? 12 : 13} stroke={2.2} />
        }
        {!compact && <span>{label}</span>}
        {!compact && <span style={{ opacity: 0.6, fontSize: 9, marginLeft: 2 }}>{dim}</span>}
      </button>

      <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.2)', margin: '7px 0', flexShrink: 0 }} />

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open ${label} in new tab`}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'grid', placeItems: 'center',
          height: compact ? 32 : 34,
          padding: compact ? '0 8px' : '0 10px',
          color: 'rgba(255,255,255,0.65)', textDecoration: 'none',
          transition: 'color 150ms', flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
      >
        <Icon name="externalLink" size={compact ? 11 : 12} stroke={2} />
      </a>
    </div>
  );
}

// ─── Full hover overlay ───────────────────────────────────────────────────────

export interface ThumbnailDownloadOverlayProps {
  thumbnail: BackendThumbnail;
  hovered: boolean;
  /** Compact mode: smaller pills, no text labels. Use for small bento cells. */
  compact?: boolean;
  /** Border radius to match the parent card. */
  borderRadius?: number;
  /** When provided, renders a "View full details" button at the bottom. */
  onViewDetails?: () => void;
}

export default function ThumbnailDownloadOverlay({
  thumbnail,
  hovered,
  compact = false,
  borderRadius = 14,
  onViewDetails,
}: ThumbnailDownloadOverlayProps) {
  const variantUrls = VARIANTS.map((v) => ({
    ...v,
    url: thumbnail.variants?.[v.key] ?? thumbnail.imagekit_url ?? '',
  }));

  const detailDelay = VARIANTS.length * 55 + 80;

  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(14,10,30,0.7)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: compact ? 5 : 6,
        padding: compact ? 8 : 16,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 180ms ease',
        borderRadius,
      }}>
        {/* "Download as" label — hidden in compact mode */}
        {!compact && (
          <div style={{
            fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 180ms ease 60ms',
          }}>
            Download as
          </div>
        )}

        {variantUrls.map((v, i) => (
          <VariantPill
            key={v.key}
            variantKey={v.key}
            label={v.label}
            dim={v.dim}
            icon={v.icon}
            url={v.url}
            styleName={thumbnail.style_name}
            compact={compact}
            hovered={hovered}
            index={i}
          />
        ))}

        {/* "View full details" — only when caller provides the handler */}
        {onViewDetails && (
          <>
            <div style={{
              width: '60%', height: 1,
              background: 'rgba(255,255,255,0.12)',
              margin: '2px 0',
              opacity: hovered ? 1 : 0,
              transition: `opacity 180ms ease ${detailDelay - 20}ms`,
            }} />
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                border: 0, borderRadius: 99,
                padding: '6px 16px', cursor: 'pointer',
                color: '#fff', fontSize: 11, fontWeight: 800,
                fontFamily: 'Nunito, sans-serif', letterSpacing: '0.04em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.15)',
                transform: hovered ? 'scale(1) translateY(0)' : `scale(0.82) translateY(12px)`,
                opacity: hovered ? 1 : 0,
                transition: `transform 240ms cubic-bezier(0.34,1.56,0.64,1) ${detailDelay}ms,
                             opacity 180ms ease ${detailDelay}ms`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.24)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            >
              <Icon name="externalLink" size={11} stroke={2} />
              View full details
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin-slow { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
