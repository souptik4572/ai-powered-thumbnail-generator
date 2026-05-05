import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import type { BackendThumbnail } from '../api';
import { deleteJob } from '../api';
import Icon from './Icon';
import { useBreakpoint } from '../hooks/useBreakpoint';
import ThumbnailDownloadOverlay from './ThumbnailDownloadOverlay';
import { useToast } from '../hooks/useToast';

const STYLE_LABELS: Record<string, string> = {
  bold_dramatic: 'Bold Dramatic',
  clean_minimal: 'Clean Minimal',
  vibrant_energetic: 'Vibrant Energetic',
};

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

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ prompt }: { prompt: string }) {
  const { setScreen } = useAppStore();
  const snippet = prompt.length > 42 ? prompt.slice(0, 42) + '…' : prompt;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
      <button
        onClick={() => setScreen('history')}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'var(--clay-input-bg)', border: 0, borderRadius: 99,
          padding: '5px 13px', cursor: 'pointer',
          fontSize: 12, fontWeight: 800, color: 'var(--clay-accent)',
          boxShadow: 'var(--shadow-clay-soft)',
          transition: 'transform 150ms, box-shadow 150ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-clay-card)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--shadow-clay-soft)';
        }}
      >
        <Icon name="history" size={12} /> History
      </button>

      <span style={{ fontSize: 12, color: 'var(--clay-muted)', fontWeight: 700, userSelect: 'none' }}>›</span>

      <span style={{
        fontSize: 12, fontWeight: 700, color: 'var(--clay-muted)',
        background: 'var(--clay-input-bg)', borderRadius: 99,
        padding: '5px 13px', boxShadow: 'var(--shadow-clay-pressed)',
        maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {snippet || 'Job details'}
      </span>
    </nav>
  );
}

// ─── Individual thumbnail card ────────────────────────────────────────────────

function ThumbnailCard({
  thumbnail,
  onViewDetails,
}: {
  thumbnail: BackendThumbnail;
  onViewDetails: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const label = STYLE_LABELS[thumbnail.style_name] ?? thumbnail.style_name;
  const isUploaded = thumbnail.status === 'UPLOADED';

  return (
    <div
      style={{
        position: 'relative', borderRadius: 20, overflow: 'hidden',
        width: '100%', aspectRatio: '16 / 9',
        background: 'var(--clay-input-bg)',
        boxShadow: hovered && isUploaded ? 'var(--shadow-clay-card)' : 'var(--shadow-clay-soft)',
        transform: hovered && isUploaded ? 'translateY(-5px)' : 'none',
        transition: 'transform 260ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 260ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {thumbnail.imagekit_url ? (
        <img
          src={thumbnail.imagekit_url}
          alt={label}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, color: 'var(--clay-muted)', fontSize: 13,
        }}>
          <Icon name={thumbnail.status === 'FAILED' ? 'x' : 'image'} size={28} stroke={1.5} />
          <span style={{ fontWeight: 700, fontSize: 12, color: STATUS_COLORS[thumbnail.status] ?? 'var(--clay-muted)' }}>
            {thumbnail.status}
          </span>
          {thumbnail.error_message && (
            <span style={{ fontSize: 11, maxWidth: '80%', textAlign: 'center', opacity: 0.7, lineHeight: 1.4 }}>
              {thumbnail.error_message}
            </span>
          )}
        </div>
      )}

      {/* Style badge — fades out when overlay is visible */}
      <div style={{
        position: 'absolute', bottom: 9, left: 9,
        background: 'rgba(20,15,40,0.62)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        borderRadius: 99, padding: '3px 10px',
        fontSize: 10, fontWeight: 800, color: '#fff',
        letterSpacing: '0.05em', textTransform: 'uppercase',
        pointerEvents: 'none', transition: 'opacity 180ms',
        opacity: hovered && isUploaded ? 0 : 1,
      }}>
        {label}
      </div>

      {/* Status badge — non-uploaded only */}
      {!isUploaded && (
        <div style={{
          position: 'absolute', top: 9, right: 9,
          background: STATUS_COLORS[thumbnail.status] ?? '#635F69',
          borderRadius: 99, padding: '3px 10px',
          fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.04em',
        }}>
          {thumbnail.status}
        </div>
      )}

      {isUploaded && (
        <ThumbnailDownloadOverlay
          thumbnail={thumbnail}
          hovered={hovered}
          borderRadius={20}
          onViewDetails={onViewDetails}
        />
      )}
    </div>
  );
}

// ─── Main JobDetail screen ────────────────────────────────────────────────────

export default function JobDetail() {
  const { selectedJob, token, setScreen, viewThumbnail } = useAppStore();
  const { isMobile } = useBreakpoint();
  const toast = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!selectedJob) {
    setScreen('history');
    return null;
  }

  const job = selectedJob;
  const uploaded = job.thumbnails.filter((t) => t.status === 'UPLOADED').length;
  const cols = isMobile ? 1 : Math.min(job.thumbnails.length, 3);

  async function handleDeleteJob() {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteJob(job.id, token);
      toast.success('Job deleted');
      setScreen('history');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete job');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="clay-card screen-enter" style={{ padding: isMobile ? 20 : 36, borderRadius: isMobile ? 28 : 40 }}>
      <Breadcrumb prompt={job.prompt} />

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="clay-pill" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--clay-accent)', marginBottom: 10 }}>
              <Icon name="image" size={12} />
              {uploaded}/{job.thumbnails.length} READY
            </div>
            <h2 className="font-display" style={{ margin: 0, fontSize: isMobile ? 24 : 32, fontWeight: 900, letterSpacing: '-0.02em' }}>
              Job details
            </h2>
            {job.prompt && (
              <p style={{ color: 'var(--clay-muted)', fontSize: 14, margin: '8px 0 0', fontStyle: 'italic', maxWidth: 560, lineHeight: 1.65 }}>
                "{job.prompt}"
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
            {job.created_at && (
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--clay-muted)',
                background: 'var(--clay-input-bg)', borderRadius: 99,
                padding: '4px 12px', boxShadow: 'var(--shadow-clay-pressed)',
              }}>
                {timeAgo(job.created_at)}
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 800,
              color: STATUS_COLORS[job.status] ?? 'var(--clay-muted)',
              background: `${STATUS_COLORS[job.status] ?? '#635F69'}1A`,
              borderRadius: 99, padding: '4px 12px',
            }}>
              {job.status}
            </span>

            {confirmingDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clay-muted)', whiteSpace: 'nowrap' }}>
                  Delete this job?
                </span>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="clay-btn clay-btn-secondary"
                  style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteJob}
                  disabled={deleting}
                  className="clay-btn"
                  style={{
                    height: 34, padding: '0 12px', fontSize: 12, gap: 5,
                    background: '#EF4444', color: '#fff', border: 'none',
                    boxShadow: 'none', opacity: deleting ? 0.7 : 1,
                    cursor: deleting ? 'wait' : 'pointer',
                  }}
                >
                  {deleting
                    ? <Icon name="loader" size={13} />
                    : <><Icon name="trash" size={13} /> Delete</>
                  }
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="clay-btn clay-btn-secondary"
                style={{ height: 34, padding: '0 12px', fontSize: 12, gap: 5 }}
              >
                <Icon name="trash" size={13} /> Delete job
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail grid */}
      {job.thumbnails.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          color: 'var(--clay-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <Icon name="image" size={36} stroke={1.5} />
          <div style={{ fontSize: 15, fontWeight: 700 }}>No thumbnails for this job</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: isMobile ? 12 : 20 }}>
          {job.thumbnails.map((thumbnail) => (
            <ThumbnailCard
              key={thumbnail.id}
              thumbnail={thumbnail}
              onViewDetails={() => viewThumbnail(thumbnail)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
