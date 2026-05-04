import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import useAppStore from '../store/useAppStore';
import { getThumbnails } from '../api';
import type { BackendThumbnail } from '../api';
import Icon from './Icon';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useToastStore } from '../hooks/useToast';

// Single source of truth for styles — must match backend style_name values
const STYLES: { id: string; label: string; color: string }[] = [
  { id: 'bold_dramatic',    label: 'Bold Dramatic',    color: '#7C3AED' },
  { id: 'clean_minimal',    label: 'Clean Minimal',    color: '#0EA5E9' },
  { id: 'vibrant_energetic', label: 'Vibrant Energetic', color: '#F97316' },
];

const STYLE_LABELS: Record<string, string> = Object.fromEntries(
  STYLES.map((s) => [s.id, s.label])
);

const STYLE_FILTERS = [
  { id: 'all', label: 'All', color: null },
  ...STYLES.map((s) => ({ id: s.id, label: s.label, color: s.color })),
];

const STATUS_OPTIONS = [
  { id: 'all',        label: 'All Statuses' },
  { id: 'PENDING',    label: 'Pending' },
  { id: 'PROCESSING', label: 'Processing' },
  { id: 'GENERATING', label: 'Generating' },
  { id: 'UPLOADED',   label: 'Uploaded' },
  { id: 'FAILED',     label: 'Failed' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING:    '#F59E0B',
  PROCESSING: '#3B82F6',
  GENERATING: '#8B5CF6',
  UPLOADED:   '#10B981',
  FAILED:     '#EF4444',
};

interface JobGroup {
  jobId: string;
  prompt: string;
  style: string;
  createdAt: string;
  thumbnails: BackendThumbnail[];
}

function groupByJob(thumbnails: BackendThumbnail[]): JobGroup[] {
  const map = new Map<string, JobGroup>();
  for (const t of thumbnails) {
    const key = t.job_id ?? t.id;
    if (!map.has(key)) {
      map.set(key, {
        jobId: key,
        prompt: t.prompt ?? '',
        style: t.style_name,
        createdAt: t.created_at ?? new Date().toISOString(),
        thumbnails: [],
      });
    }
    map.get(key)!.thumbnails.push(t);
  }
  return Array.from(map.values());
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

async function downloadImage(url: string, filename: string): Promise<'downloaded' | 'opened'> {
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

// ─── Variant download buttons shown in the hover overlay ─────────────────────

const VARIANTS = [
  { key: 'youtube', label: 'YouTube', dim: '1280×720',  icon: 'tv' },
  { key: 'shorts',  label: 'Shorts',  dim: '1080×1920', icon: 'smartphone' },
  { key: 'square',  label: 'Square',  dim: '1080×1080', icon: 'square' },
] as const;

function VariantButton({
  variantKey,
  label,
  dim,
  icon,
  url,
  styleName,
  compact,
  hovered,
  index,
}: {
  variantKey: string;
  label: string;
  dim: string;
  icon: string;
  url: string;
  styleName: string;
  compact: boolean;
  hovered: boolean;
  index: number;
}) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

  const pillBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    borderRadius: 99,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.14)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.2)',
    color: '#fff',
    fontFamily: 'Nunito, sans-serif',
    fontWeight: 800,
    whiteSpace: 'nowrap',
    // staggered spring entrance
    transform: hovered
      ? 'scale(1) translateY(0)'
      : `scale(0.82) translateY(${8 + index * 4}px)`,
    opacity: hovered ? 1 : 0,
    transition: `transform 240ms cubic-bezier(0.34,1.56,0.64,1) ${index * 55}ms,
                 opacity 180ms ease ${index * 55}ms`,
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: compact ? 0 : 7,
    justifyContent: compact ? 'center' : 'flex-start',
    height: compact ? 32 : 34,
    padding: compact ? '0 10px' : '0 12px',
    border: 0,
    background: 'transparent',
    cursor: busy ? 'wait' : 'pointer',
    color: '#fff',
    fontSize: compact ? 10 : 11,
    fontFamily: 'inherit',
    fontWeight: 800,
    letterSpacing: '0.04em',
  };

  return (
    <div style={pillBase}>
      {/* Left: download action */}
      <button onClick={handleDownload} title={`Download ${label} (${dim})`} style={btnStyle}>
        {busy
          ? <div style={{
              width: 12, height: 12, flexShrink: 0,
              border: '2px solid rgba(255,255,255,0.35)',
              borderTopColor: '#fff', borderRadius: 99,
              animation: 'spin-slow 0.7s linear infinite',
            }} />
          : <Icon name={icon} size={compact ? 12 : 13} stroke={2.2} />
        }
        {!compact && <span>{label}</span>}
        {!compact && (
          <span style={{ opacity: 0.6, fontSize: 9, marginLeft: 2 }}>{dim}</span>
        )}
      </button>

      {/* Divider */}
      <div style={{
        width: 1, alignSelf: 'stretch',
        background: 'rgba(255,255,255,0.2)',
        margin: '7px 0',
        flexShrink: 0,
      }} />

      {/* Right: open in new tab */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Open ${label} in new tab`}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'grid',
          placeItems: 'center',
          height: compact ? 32 : 34,
          padding: compact ? '0 8px' : '0 10px',
          color: 'rgba(255,255,255,0.65)',
          textDecoration: 'none',
          transition: 'color 150ms',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
      >
        <Icon name="externalLink" size={compact ? 11 : 12} stroke={2} />
      </a>
    </div>
  );
}

// ─── Per-thumbnail card with hover download overlay ──────────────────────────

function ThumbnailItem({
  thumb,
  isLarge = false,
}: {
  thumb: BackendThumbnail;
  isLarge?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const label = STYLE_LABELS[thumb.style_name] ?? thumb.style_name;

  // Build variant URLs — fall back to base URL if variants not available
  const variantUrls = VARIANTS.map((v) => ({
    ...v,
    url: thumb.variants?.[v.key] ?? thumb.imagekit_url ?? '',
  }));

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: isLarge ? 14 : 10,
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        background: 'var(--clay-input-bg)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {thumb.imagekit_url ? (
        <img
          src={thumb.imagekit_url}
          alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'var(--clay-muted)' }}>
          <Icon name="image" size={24} />
        </div>
      )}

      {/* Style badge — fades out on hover */}
      <div style={{
        position: 'absolute', bottom: 7, left: 7,
        background: 'rgba(20,15,40,0.62)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        borderRadius: 99, padding: '3px 9px',
        fontSize: 10, fontWeight: 800, color: '#fff',
        letterSpacing: '0.05em', textTransform: 'uppercase',
        pointerEvents: 'none',
        transition: 'opacity 180ms',
        opacity: hovered ? 0 : 1,
      }}>
        {label}
      </div>

      {/* Download overlay — 3 variant buttons */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(14,10,30,0.7)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isLarge ? 7 : 5,
        padding: isLarge ? 16 : 8,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 180ms ease',
        borderRadius: isLarge ? 14 : 10,
      }}>
        {/* "Download as" label — large only */}
        {isLarge && (
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
          <VariantButton
            key={v.key}
            variantKey={v.key}
            label={v.label}
            dim={v.dim}
            icon={v.icon}
            url={v.url}
            styleName={thumb.style_name}
            compact={!isLarge}
            hovered={hovered}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Bento grid layout for a job's thumbnails ────────────────────────────────

function ThumbnailBento({ thumbnails }: { thumbnails: BackendThumbnail[] }) {
  const n = thumbnails.length;

  if (n === 0) {
    return (
      <div style={{ height: 190, display: 'grid', placeItems: 'center', color: 'var(--clay-muted)', fontSize: 13 }}>
        No preview
      </div>
    );
  }

  if (n === 1) {
    return (
      <div style={{ height: 190 }}>
        <ThumbnailItem thumb={thumbnails[0]} isLarge />
      </div>
    );
  }

  if (n === 2) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, height: 190 }}>
        <ThumbnailItem thumb={thumbnails[0]} isLarge />
        <ThumbnailItem thumb={thumbnails[1]} isLarge />
      </div>
    );
  }

  // 3 thumbnails — bento: first item is tall on the left, two smaller on the right
  if (n === 3) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, height: 190 }}>
        <div style={{ gridRow: 'span 2' }}>
          <ThumbnailItem thumb={thumbnails[0]} isLarge />
        </div>
        <ThumbnailItem thumb={thumbnails[1]} />
        <ThumbnailItem thumb={thumbnails[2]} />
      </div>
    );
  }

  // 4 thumbnails — 2×2 grid
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, height: 190 }}>
      {thumbnails.slice(0, 4).map((t) => (
        <ThumbnailItem key={t.id} thumb={t} />
      ))}
    </div>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────

function HistoryCard({ group }: { group: JobGroup }) {
  const thumbs = group.thumbnails;

  return (
    <div
      className="clay-card is-hoverable surface-2"
      style={{ padding: 14, borderRadius: 28, cursor: 'default' }}
    >
      {/* Thumbnail bento — recessed surface */}
      <div style={{
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 14,
        padding: 8,
        background: 'var(--clay-input-bg)',
        boxShadow: 'var(--shadow-clay-pressed)',
      }}>
        <ThumbnailBento thumbnails={thumbs} />
      </div>

      {/* Timestamp + variation count row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: thumbs.length > 0 ? 8 : 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: 'var(--clay-muted)', fontWeight: 700,
        }}>
          <Icon name="image" size={12} />
          {thumbs.length} variation{thumbs.length !== 1 ? 's' : ''}
        </div>
        <span style={{ fontSize: 11, color: 'var(--clay-muted)', fontWeight: 700 }}>
          {timeAgo(group.createdAt)}
        </span>
      </div>

      {/* Prompt */}
      {group.prompt && (
        <div style={{
          fontSize: 13,
          color: 'var(--clay-fg)',
          lineHeight: 1.5,
          fontWeight: 500,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {group.prompt}
        </div>
      )}

      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Skeleton loading grid ────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="history-grid">
      {[0.1, 0.2, 0.35, 0.45, 0.6, 0.7].map((delay, i) => (
        <div key={i} className="clay-card surface-2" style={{ padding: 14, borderRadius: 28 }}>
          <div style={{
            borderRadius: 20, marginBottom: 14, height: 206,
            background: 'var(--clay-input-bg)',
            boxShadow: 'var(--shadow-clay-pressed)',
            animation: 'clay-breathe 1.8s ease-in-out infinite',
            animationDelay: `${delay}s`,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ height: 14, width: '30%', borderRadius: 8, background: 'var(--clay-input-bg)' }} />
            <div style={{ height: 14, width: '20%', borderRadius: 8, background: 'var(--clay-input-bg)' }} />
          </div>
          <div style={{ height: 13, width: '90%', borderRadius: 8, background: 'var(--clay-input-bg)', marginBottom: 6 }} />
          <div style={{ height: 13, width: '70%', borderRadius: 8, background: 'var(--clay-input-bg)' }} />
        </div>
      ))}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 24,
        background: 'rgba(220,38,38,0.1)', color: '#DC2626',
        display: 'grid', placeItems: 'center',
        boxShadow: '8px 8px 20px rgba(220,38,38,0.1), -6px -6px 14px rgba(255,255,255,0.9)',
      }}>
        <Icon name="x" size={32} stroke={2} />
      </div>
      <div>
        <div className="font-display" style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
          Failed to load history
        </div>
        <div style={{ fontSize: 14, color: 'var(--clay-muted)', maxWidth: 340 }}>{message}</div>
      </div>
      <button onClick={onRetry} className="clay-btn clay-btn-secondary" style={{ height: 48, padding: '0 24px' }}>
        <Icon name="refresh" size={16} /> Try again
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyHistory({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 80, height: 80, borderRadius: 28,
        background: 'linear-gradient(135deg,#A78BFA,#7C3AED)',
        display: 'grid', placeItems: 'center', color: '#fff',
        boxShadow: 'var(--shadow-clay-button)',
        animation: 'clay-breathe 3s ease-in-out infinite',
      }}>
        <Icon name="history" size={36} stroke={1.5} />
      </div>
      <div>
        <div className="font-display" style={{ fontWeight: 900, fontSize: 24, marginBottom: 8 }}>
          No generations yet
        </div>
        <div style={{ fontSize: 15, color: 'var(--clay-muted)', maxWidth: 360 }}>
          Create your first thumbnail and it'll appear here, ready to revisit and download.
        </div>
      </div>
      <button onClick={onNew} className="clay-btn clay-btn-primary" style={{ height: 56, padding: '0 28px' }}>
        <Icon name="sparkles" size={18} stroke={2.4} /> Make your first thumbnail
      </button>
    </div>
  );
}

// ─── Main History screen ──────────────────────────────────────────────────────

export default function History() {
  const { token, setScreen, startNewJob } = useAppStore();
  const { isMobile } = useBreakpoint();
  const [groups, setGroups] = useState<JobGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  // incrementing this value re-triggers the fetch effect (used by Retry)
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getThumbnails(token)
      .then((thumbnails) => { if (!cancelled) setGroups(groupByJob(thumbnails)); })
      .catch((err: unknown) => { if (!cancelled) setError((err as Error).message ?? 'Failed to load history'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, fetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchHistory = () => { setFetchKey((k) => k + 1); };

  const filtered = groups.filter(
    (g) =>
      (filter === 'all' || g.thumbnails.some((t) => t.style_name === filter)) &&
      (statusFilter === 'all' || g.thumbnails.some((t) => t.status === statusFilter))
  );

  const handleNew = () => { startNewJob(); setScreen('generator'); };

  const totalThumbnails = groups.reduce((acc, g) => acc + g.thumbnails.length, 0);

  return (
    <div className="clay-card screen-enter" style={{ padding: isMobile ? 20 : 36, borderRadius: isMobile ? 28 : 40 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, marginBottom: 24,
      }}>
        <div>
          <div className="clay-pill" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--clay-accent)', marginBottom: 8 }}>
            <Icon name="history" size={12} /> YOUR HISTORY
          </div>
          <h2 className="font-display" style={{ margin: 0, fontSize: isMobile ? 26 : 36, fontWeight: 900, letterSpacing: '-0.02em' }}>
            Past generations
          </h2>
          <p style={{ color: 'var(--clay-muted)', fontSize: 15, margin: '6px 0 0' }}>
            {loading
              ? 'Loading…'
              : `${groups.length} job${groups.length !== 1 ? 's' : ''} · ${totalThumbnails} thumbnail${totalThumbnails !== 1 ? 's' : ''} total`
            }
          </p>
        </div>
        <button onClick={handleNew} className="clay-btn clay-btn-primary" style={{ height: 52, padding: '0 22px' }}>
          <Icon name="plus" size={18} /> New thumbnail
        </button>
      </div>

      {/* Status filter + style filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: isMobile ? '100%' : 200, flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
          {statusFilter !== 'all' && (
            <span style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              width: 9, height: 9, borderRadius: 99,
              background: STATUS_COLORS[statusFilter],
              pointerEvents: 'none', zIndex: 1, flexShrink: 0,
            }} />
          )}
          <select
            className="clay-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              paddingLeft: statusFilter !== 'all' ? 34 : 16,
              paddingRight: 36,
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <span style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--clay-muted)', pointerEvents: 'none',
          }}>
            <Icon name="chevronDown" size={16} stroke={2} />
          </span>
        </div>
        <div style={{
          display: 'flex', gap: 4, padding: 5, borderRadius: 18,
          background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
          flexWrap: 'wrap',
        }}>
          {STYLE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`clay-tab${filter === f.id ? ' is-active' : ''}`}
              style={{ height: 40 }}
            >
              {f.color && (
                <span style={{
                  width: 8, height: 8, borderRadius: 99,
                  background: f.color, flexShrink: 0,
                  display: 'inline-block',
                  opacity: filter === f.id ? 1 : 0.55,
                  transition: 'opacity 150ms',
                }} />
              )}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchHistory} />
      ) : groups.length === 0 ? (
        <EmptyHistory onNew={handleNew} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--clay-muted)' }}>
          <div style={{ fontSize: 52, marginBottom: 8, opacity: 0.4 }}>🔍</div>
          <div className="font-display" style={{ fontWeight: 800, fontSize: 18 }}>No matches</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>Try a different keyword or filter.</div>
        </div>
      ) : (
        <div className="history-grid">
          {filtered.map((group) => <HistoryCard key={group.jobId} group={group} />)}
        </div>
      )}
    </div>
  );
}
