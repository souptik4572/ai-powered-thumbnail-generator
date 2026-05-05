import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import Icon from './Icon';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useToast } from '../hooks/useToast';
import { downloadImage } from './ThumbnailDownloadOverlay';
import { getThumbnail, deleteThumbnail } from '../api';
import type { BackendThumbnail } from '../api';
import ConfirmDeleteModal from './ConfirmDeleteModal';

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

const ASPECTS = [
  { key: 'youtube', trKey: 'youtube', label: 'YouTube', dim: '1280×720',  icon: 'tv' },
  { key: 'shorts',  trKey: 'shorts',  label: 'Shorts',  dim: '1080×1920', icon: 'smartphone' },
  { key: 'square',  trKey: 'square',  label: 'Square',  dim: '1080×1080', icon: 'square' },
] as const;

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ prompt, styleLabel, jobId }: { prompt: string; styleLabel: string; jobId: string | null }) {
  const navigate = useNavigate();
  const snippet = prompt.length > 36 ? prompt.slice(0, 36) + '…' : prompt;

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
      <button
        onClick={() => navigate('/history')}
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

      {jobId && (
        <>
          <button
            onClick={() => navigate('/jobs/' + jobId)}
            style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--clay-input-bg)', border: 0, borderRadius: 99,
              padding: '5px 13px', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, color: 'var(--clay-accent)',
              boxShadow: 'var(--shadow-clay-soft)',
              transition: 'transform 150ms, box-shadow 150ms',
              maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
            {snippet || 'Job details'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--clay-muted)', fontWeight: 700, userSelect: 'none' }}>›</span>
        </>
      )}

      <span style={{
        fontSize: 12, fontWeight: 700, color: 'var(--clay-muted)',
        background: 'var(--clay-input-bg)', borderRadius: 99,
        padding: '5px 13px', boxShadow: 'var(--shadow-clay-pressed)',
      }}>
        {styleLabel}
      </span>
    </nav>
  );
}

// ─── Main ThumbnailDetail screen ──────────────────────────────────────────────

export default function ThumbnailDetail() {
  const { thumbnailId } = useParams<{ thumbnailId: string }>();
  const navigate = useNavigate();
  const { selectedThumbnail, selectedJob, token, removeThumbnailFromSelectedJob } = useAppStore();
  const { isMobile } = useBreakpoint();
  const toast = useToast();

  const [thumb, setThumb] = useState<BackendThumbnail | null>(
    selectedThumbnail?.id === thumbnailId ? selectedThumbnail : null
  );
  const [fetchLoading, setFetchLoading] = useState(!thumb);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!thumbnailId) { navigate('/history', { replace: true }); return; }
    if (selectedThumbnail?.id === thumbnailId) { setThumb(selectedThumbnail); setFetchLoading(false); return; }
    if (!token) { navigate('/auth', { replace: true }); return; }
    setFetchLoading(true);
    getThumbnail(thumbnailId, token)
      .then((data) => { setThumb(data); setFetchLoading(false); })
      .catch((err: unknown) => {
        setFetchError((err as Error).message ?? 'Failed to load thumbnail');
        setFetchLoading(false);
      });
  }, [thumbnailId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeleteThumbnail() {
    if (!token || !thumb) return;
    setDeleting(true);
    try {
      await deleteThumbnail(thumb.id, token);
      removeThumbnailFromSelectedJob(thumb.id);
      toast.success('Thumbnail deleted');
      navigate(thumb.job_id ? `/jobs/${thumb.job_id}` : '/history');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to delete thumbnail');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (fetchLoading) {
    return (
      <div className="clay-card screen-enter" style={{ padding: isMobile ? 20 : 36, borderRadius: isMobile ? 28 : 40, textAlign: 'center', color: 'var(--clay-muted)' }}>
        <Icon name="loader" size={28} className="spinning" />
        <style>{`.spinning { animation: spin-slow 0.8s linear infinite; margin-top: 8px; }`}</style>
      </div>
    );
  }

  if (fetchError || !thumb) {
    return (
      <div className="clay-card screen-enter" style={{ padding: isMobile ? 20 : 36, borderRadius: isMobile ? 28 : 40, textAlign: 'center' }}>
        <div style={{ color: '#EF4444', marginBottom: 12 }}><Icon name="x" size={32} /></div>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>{fetchError ?? 'Thumbnail not found'}</div>
        <button onClick={() => navigate('/history')} className="clay-btn clay-btn-secondary" style={{ height: 44 }}>
          <Icon name="arrowLeft" size={15} /> Back to history
        </button>
      </div>
    );
  }

  const styleLabel = STYLE_LABELS[thumb.style_name] ?? thumb.style_name;
  const jobId = thumb.job_id ?? selectedJob?.id ?? null;
  const prompt = selectedJob?.prompt ?? thumb.prompt ?? '';
  const isUploaded = thumb.status === 'UPLOADED';

  const createdAt = thumb.created_at
    ? new Date(thumb.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="screen-enter results-layout">

      {/* LEFT: hero image */}
      <div className="clay-card" style={{ padding: isMobile ? 20 : 36, borderRadius: isMobile ? 28 : 40 }}>
        <Breadcrumb prompt={prompt} styleLabel={styleLabel} jobId={jobId} />

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div className="clay-pill" style={{
            background: `${STATUS_COLORS[thumb.status] ?? '#635F69'}1A`,
            color: STATUS_COLORS[thumb.status] ?? 'var(--clay-muted)',
            marginBottom: 8,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: 'currentColor', display: 'inline-block' }} />
            {thumb.status}
          </div>
          <h2 className="font-display" style={{ margin: 0, fontSize: isMobile ? 24 : 30, fontWeight: 900, letterSpacing: '-0.02em' }}>
            {styleLabel}
          </h2>
          {prompt && (
            <p style={{ color: 'var(--clay-muted)', fontSize: 14, margin: '6px 0 0', fontStyle: 'italic', lineHeight: 1.6, maxWidth: 540 }}>
              "{prompt}"
            </p>
          )}
        </div>

        {/* Hero image */}
        <div style={{
          padding: 16, borderRadius: 28,
          background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
          marginBottom: 24, display: 'grid', placeItems: 'center', minHeight: 200,
        }}>
          {thumb.imagekit_url ? (
            <img
              src={thumb.imagekit_url}
              alt={styleLabel}
              style={{ maxWidth: '100%', borderRadius: 14, boxShadow: '0 12px 30px rgba(20,15,40,0.25)' }}
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              padding: '60px 24px', color: 'var(--clay-muted)',
            }}>
              <Icon name={thumb.status === 'FAILED' ? 'x' : 'image'} size={48} stroke={1.5} />
              <div style={{ fontWeight: 700, fontSize: 14, color: STATUS_COLORS[thumb.status] ?? 'var(--clay-muted)' }}>
                {thumb.status === 'FAILED' ? 'Generation failed' : thumb.status}
              </div>
              {thumb.error_message && (
                <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 340, lineHeight: 1.5, opacity: 0.8 }}>
                  {thumb.error_message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Download section */}
        {isUploaded && (
          <div className="clay-card surface-3" style={{ padding: 18, borderRadius: 24 }}>
            <div style={{ marginBottom: 14 }}>
              <div className="font-display" style={{ fontWeight: 800, fontSize: 16 }}>
                Download{' '}
                <span style={{ color: 'var(--clay-accent)' }}>{styleLabel}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--clay-muted)' }}>
                Pick the format you need — we'll resize it.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ASPECTS.map(({ key, trKey, label, dim, icon }, i) => {
                const url = thumb.variants?.[trKey] ?? thumb.imagekit_url;
                const busy = downloadingKey === key;
                return (
                  <button
                    key={key}
                    disabled={!url || busy}
                    onClick={async () => {
                      if (!url) return;
                      setDownloadingKey(key);
                      const result = await downloadImage(url, `hookframe-${thumb.style_name}-${trKey}.jpg`);
                      setDownloadingKey(null);
                      if (result === 'downloaded') {
                        toast.success(`${label} (${dim}) saved!`);
                      } else {
                        toast.info('Opening in new tab — direct download unavailable.');
                      }
                    }}
                    className="clay-btn"
                    style={{
                      height: 52, padding: '0 16px', borderRadius: 16,
                      fontSize: 13, gap: 8, flexDirection: 'column',
                      flex: '1 1 80px',
                      background: i === 0 ? 'linear-gradient(135deg,#A78BFA,#7C3AED)' : 'var(--clay-card-bg)',
                      color: i === 0 ? '#fff' : 'var(--clay-fg)',
                      boxShadow: i === 0 ? 'var(--shadow-clay-button)' : 'var(--shadow-clay-soft)',
                      opacity: !url ? 0.5 : 1,
                      cursor: !url ? 'not-allowed' : busy ? 'wait' : 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13 }}>
                      {busy
                        ? <div style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: 99, animation: 'spin-slow 0.7s linear infinite' }} />
                        : <Icon name={icon} size={14} />
                      }
                      {label}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 700 }}>{dim}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <style>{`@keyframes spin-slow { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* RIGHT: metadata sidebar */}
      <div className="results-sidebar">
        <div className="clay-card" style={{ padding: 24, borderRadius: 28 }}>
          <div className="font-display" style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>
            Thumbnail details
          </div>
          {[
            ['Style', styleLabel],
            ['Status', thumb.status],
            ...(createdAt ? [['Created', createdAt] as [string, string]] : []),
            ...(selectedJob ? [['Variations', `${selectedJob.num_thumbnails}`] as [string, string]] : []),
            ['Engine', 'Hookframe v1.0'],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px dashed var(--clay-divider)',
            }}>
              <span style={{ fontSize: 13, color: 'var(--clay-muted)', fontWeight: 600 }}>{k}</span>
              <span
                className="font-display"
                style={{
                  fontSize: 13, fontWeight: 800,
                  color: k === 'Status' ? (STATUS_COLORS[v] ?? 'var(--clay-fg)') : 'var(--clay-fg)',
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* Back to job */}
        {jobId && (
          <div className="clay-card surface-3" style={{ padding: 18, borderRadius: 24 }}>
            <div style={{ marginBottom: 14 }}>
              <div className="font-display" style={{ fontWeight: 900, fontSize: 14 }}>All variations</div>
              <div style={{ fontSize: 12, color: 'var(--clay-muted)', marginTop: 2, lineHeight: 1.5 }}>
                See all thumbnails from this job
              </div>
            </div>
            <button
              onClick={() => navigate('/jobs/' + jobId)}
              className="clay-btn clay-btn-secondary"
              style={{ height: 44, fontSize: 13, width: '100%' }}
            >
              <Icon name="arrowLeft" size={15} stroke={2.2} />
              Back to job
            </button>
          </div>
        )}

        {/* Delete thumbnail */}
        <div className="clay-card surface-3" style={{ padding: 18, borderRadius: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <div className="font-display" style={{ fontWeight: 900, fontSize: 14 }}>Delete thumbnail</div>
            <div style={{ fontSize: 12, color: 'var(--clay-muted)', marginTop: 2, lineHeight: 1.5 }}>
              Permanently remove this image.
            </div>
          </div>
          <button
            onClick={() => setConfirmingDelete(true)}
            className="clay-btn clay-btn-secondary"
            style={{ height: 44, fontSize: 13, width: '100%', gap: 6 }}
          >
            <Icon name="trash" size={15} /> Delete thumbnail
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDeleteModal
          title="Delete this thumbnail?"
          description="This will permanently remove the image from storage. This action cannot be undone."
          loading={deleting}
          onConfirm={handleDeleteThumbnail}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
