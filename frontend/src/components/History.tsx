import { useEffect, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { getThumbnails } from '../api';
import type { BackendThumbnail } from '../api';
import Icon from './Icon';

const STYLE_LABELS: Record<string, string> = {
  bold: 'Bold', minimal: 'Minimal', tutorial: 'Tutorial', vlog: 'Vlog', react: 'Reaction',
};

const STYLE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'bold', label: 'Bold' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'tutorial', label: 'Tutorial' },
  { id: 'vlog', label: 'Vlog' },
];

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

export default function History() {
  const { token, setScreen, startNewJob } = useAppStore();
  const [groups, setGroups] = useState<JobGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getThumbnails(token)
      .then((thumbnails) => setGroups(groupByJob(thumbnails)))
      .catch((err) => setError(err.message ?? 'Failed to load history'))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = groups.filter(
    (g) =>
      (filter === 'all' || g.style === filter) &&
      (q === '' || g.prompt.toLowerCase().includes(q.toLowerCase()))
  );

  const handleNew = () => {
    startNewJob();
    setScreen('generator');
  };

  const totalThumbnails = groups.reduce((acc, g) => acc + g.thumbnails.length, 0);

  return (
    <div className="clay-card screen-enter" style={{ padding: 36, borderRadius: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, marginBottom: 28,
      }}>
        <div>
          <div className="clay-pill" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--clay-accent)', marginBottom: 8 }}>
            <Icon name="history" size={12} /> YOUR HISTORY
          </div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em' }}>
            Past generations
          </h2>
          <p style={{ color: 'var(--clay-muted)', fontSize: 15, margin: '6px 0 0' }}>
            {loading ? 'Loading…' : `${groups.length} job${groups.length !== 1 ? 's' : ''} · ${totalThumbnails} thumbnail${totalThumbnails !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <button onClick={handleNew} className="clay-btn clay-btn-primary" style={{ height: 52, padding: '0 22px' }}>
          <Icon name="plus" size={18} /> New thumbnail
        </button>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <input
            className="clay-input"
            placeholder="Search prompts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ paddingLeft: 46 }}
          />
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--clay-muted)', pointerEvents: 'none' }}>
            <Icon name="search" size={18} />
          </span>
        </div>
        <div style={{
          display: 'flex', gap: 6, padding: 6, borderRadius: 18,
          background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
        }}>
          {STYLE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={filter === f.id ? 'surface-1' : ''}
              style={{
                height: 44, padding: '0 14px', border: 0, borderRadius: 12,
                fontFamily: 'Nunito', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                background: filter === f.id ? undefined : 'transparent',
                color: filter === f.id ? 'var(--clay-fg)' : 'var(--clay-muted)',
                boxShadow: filter === f.id ? 'var(--shadow-clay-soft)' : 'none',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => {
          if (!token) return;
          setLoading(true);
          setError(null);
          getThumbnails(token)
            .then((thumbnails) => setGroups(groupByJob(thumbnails)))
            .catch((err) => setError(err.message ?? 'Failed to load history'))
            .finally(() => setLoading(false));
        }} />
      ) : groups.length === 0 ? (
        <EmptyHistory onNew={handleNew} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--clay-muted)' }}>
          <div style={{ fontSize: 56, marginBottom: 8, opacity: 0.5 }}>🔍</div>
          <div className="font-display" style={{ fontWeight: 800, fontSize: 18 }}>No matches</div>
          <div style={{ fontSize: 14 }}>Try a different keyword or filter.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
          {filtered.map((group) => <HistoryCard key={group.jobId} group={group} />)}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ group }: { group: JobGroup }) {
  const hero = group.thumbnails[0];

  return (
    <div
      className="clay-card is-hoverable surface-2"
      style={{ padding: 16, textAlign: 'left', borderRadius: 28, cursor: 'default' }}
    >
      {/* Thumbnail preview */}
      <div style={{
        borderRadius: 20, overflow: 'hidden', marginBottom: 14,
        padding: 8, background: 'var(--clay-input-bg)',
        boxShadow: 'var(--shadow-clay-pressed)',
        display: 'grid', placeItems: 'center', minHeight: 120,
      }}>
        {hero?.imagekit_url ? (
          <img
            src={hero.imagekit_url}
            alt={group.prompt}
            style={{ width: '100%', borderRadius: 12, display: 'block' }}
          />
        ) : (
          <div style={{ color: 'var(--clay-muted)', fontSize: 13, padding: 24 }}>No preview</div>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <span className="clay-pill" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--clay-accent)' }}>
          {STYLE_LABELS[group.style] ?? group.style}
        </span>
        <span style={{ fontSize: 11, color: 'var(--clay-muted)', fontWeight: 700 }}>{timeAgo(group.createdAt)}</span>
      </div>

      {/* Prompt */}
      {group.prompt && (
        <div style={{
          fontSize: 14, color: 'var(--clay-fg)', lineHeight: 1.45, fontWeight: 500,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {group.prompt}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 14, paddingTop: 14,
        borderTop: '1px dashed var(--clay-divider)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: 'var(--clay-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="image" size={12} /> {group.thumbnails.length} thumbnail{group.thumbnails.length !== 1 ? 's' : ''}
        </span>
        {hero?.imagekit_url && (
          <a
            href={hero.imagekit_url}
            download
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: 30, height: 30, borderRadius: 10,
              background: 'var(--clay-input-bg)',
              display: 'grid', placeItems: 'center',
              color: 'var(--clay-muted)', textDecoration: 'none',
            }}
          >
            <Icon name="download" size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 20 }}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="clay-card surface-2" style={{ padding: 16, borderRadius: 28 }}>
          <div style={{
            borderRadius: 20, marginBottom: 14, height: 160,
            background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
            animation: 'clay-breathe 2s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }} />
          <div style={{ height: 20, borderRadius: 8, background: 'var(--clay-input-bg)', marginBottom: 10, width: '60%' }} />
          <div style={{ height: 14, borderRadius: 8, background: 'var(--clay-input-bg)', width: '90%' }} />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 24,
        background: 'rgba(220,38,38,0.12)', color: '#DC2626',
        display: 'grid', placeItems: 'center',
      }}>
        <Icon name="x" size={32} stroke={2} />
      </div>
      <div>
        <div className="font-display" style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Failed to load history</div>
        <div style={{ fontSize: 14, color: 'var(--clay-muted)', maxWidth: 340 }}>{message}</div>
      </div>
      <button onClick={onRetry} className="clay-btn clay-btn-secondary" style={{ height: 48, padding: '0 24px' }}>
        <Icon name="refresh" size={16} /> Try again
      </button>
    </div>
  );
}

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
        <div className="font-display" style={{ fontWeight: 900, fontSize: 24, marginBottom: 8 }}>No generations yet</div>
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
