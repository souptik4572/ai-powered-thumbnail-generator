import { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { getJobs } from '../api';
import type { BackendJob, BackendThumbnail } from '../api';
import Icon from './Icon';
import { useBreakpoint } from '../hooks/useBreakpoint';
import ThumbnailDownloadOverlay from './ThumbnailDownloadOverlay';

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

      <ThumbnailDownloadOverlay
        thumbnail={thumb}
        hovered={hovered}
        compact={!isLarge}
        borderRadius={isLarge ? 14 : 10}
      />
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, height: 190 }}>
      {thumbnails.slice(0, 4).map((t) => (
        <ThumbnailItem key={t.id} thumb={t} />
      ))}
    </div>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────

function HistoryCard({ job, onView }: { job: BackendJob; onView: () => void }) {
  const thumbs = job.thumbnails;

  return (
    <div
      className="clay-card is-hoverable surface-2"
      style={{ padding: 14, borderRadius: 28, cursor: 'default', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{
        borderRadius: 20, overflow: 'hidden', marginBottom: 14, padding: 8,
        background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
      }}>
        <ThumbnailBento thumbnails={thumbs} />
      </div>

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
          {timeAgo(job.created_at ?? new Date().toISOString())}
        </span>
      </div>

      {job.prompt && (
        <div style={{
          fontSize: 13, color: 'var(--clay-fg)', lineHeight: 1.5, fontWeight: 500,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', marginBottom: 14,
        }}>
          {job.prompt}
        </div>
      )}

      <button
        onClick={onView}
        className="clay-btn clay-btn-primary"
        style={{ height: 40, fontSize: 13, marginTop: 'auto', gap: 6, borderRadius: 16 }}
      >
        View details
        <Icon name="arrow" size={14} stroke={2.2} />
      </button>
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
            background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
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
  const { token, setScreen, startNewJob, viewJob } = useAppStore();
  const { isMobile } = useBreakpoint();
  const [jobs, setJobs] = useState<BackendJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  // fetchKey increments on retry; completedKey tracks the last finished fetch.
  // loading is derived — no synchronous setState inside effects.
  const [fetchKey, setFetchKey] = useState(0);
  const [completedKey, setCompletedKey] = useState<number | null>(null);
  const loading = !!token && completedKey !== fetchKey;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getJobs(token)
      .then((data) => {
        if (!cancelled) { setJobs(data); setError(null); setCompletedKey(fetchKey); }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load history');
          setCompletedKey(fetchKey);
        }
      });
    return () => { cancelled = true; };
  }, [token, fetchKey]);

  const fetchHistory = () => { setError(null); setFetchKey((k) => k + 1); };

  const filtered = jobs.filter(
    (job) =>
      (filter === 'all' || job.thumbnails.some((t) => t.style_name === filter)) &&
      (statusFilter === 'all' || job.thumbnails.some((t) => t.status === statusFilter))
  );

  const handleNew = () => { startNewJob(); setScreen('generator'); };

  const totalThumbnails = jobs.reduce((acc, job) => acc + job.thumbnails.length, 0);

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
              : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} · ${totalThumbnails} thumbnail${totalThumbnails !== 1 ? 's' : ''} total`
            }
          </p>
        </div>
        <button onClick={handleNew} className="clay-btn clay-btn-primary" style={{ height: 52, padding: '0 22px' }}>
          <Icon name="plus" size={18} /> New thumbnail
        </button>
      </div>

      {/* Status filter + style filters */}
      <div className="history-filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
        <div
          className="filter-tabs"
          style={{ background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)', width: isMobile ? '100%' : 'auto', overflowX: 'auto' }}
        >
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
      ) : jobs.length === 0 ? (
        <EmptyHistory onNew={handleNew} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--clay-muted)' }}>
          <div style={{ fontSize: 52, marginBottom: 8, opacity: 0.4 }}>🔍</div>
          <div className="font-display" style={{ fontWeight: 800, fontSize: 18 }}>No matches</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>Try a different keyword or filter.</div>
        </div>
      ) : (
        <div className="history-grid">
          {filtered.map((job) => (
            <HistoryCard key={job.id} job={job} onView={() => viewJob(job)} />
          ))}
        </div>
      )}
    </div>
  );
}
