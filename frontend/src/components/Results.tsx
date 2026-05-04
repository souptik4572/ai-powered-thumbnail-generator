import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import Icon from './Icon';
import FauxThumbnail from './FauxThumbnail';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useToast } from '../hooks/useToast';

const STYLE_LABELS: Record<string, string> = {
  bold_dramatic: 'Bold Dramatic',
  clean_minimal: 'Clean Minimal',
  vibrant_energetic: 'Vibrant Energetic',
};

const ASPECTS: Record<string, { label: string; dim: string; icon: string; trKey: string }> = {
  yt:     { label: 'YouTube', dim: '1280×720',  icon: 'tv',         trKey: 'youtube' },
  shorts: { label: 'Shorts',  dim: '1080×1920', icon: 'smartphone', trKey: 'shorts' },
  square: { label: 'Square',  dim: '1080×1080', icon: 'square',     trKey: 'square' },
};

async function downloadUrl(url: string, filename: string): Promise<'downloaded' | 'opened'> {
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

export default function Results() {
  const {
    liveThumbnails, count, prompt, styleSel, aspect,
    jobError, setJobError,
    setScreen, clearLiveThumbnails, startNewJob,
  } = useAppStore();

  const { isMobile } = useBreakpoint();
  const toast = useToast();
  const [picked, setPicked] = useState(0);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const thumbs = liveThumbnails.length > 0 ? liveThumbnails : [];

  const heroThumb = thumbs[picked];

  const handleNew = () => {
    startNewJob();
    setScreen('generator');
  };

  const handleRegen = () => {
    setJobError(null);
    clearLiveThumbnails();
    setScreen('loading');
  };

  const handleTryAgain = () => {
    setJobError(null);
    clearLiveThumbnails();
    setScreen('generator');
  };

  if (jobError && thumbs.length === 0) {
    return (
      <div className="screen-enter" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: isMobile ? '24px 0' : '40px 0' }}>
        <div className="clay-card" style={{ padding: isMobile ? 28 : 48, borderRadius: isMobile ? 28 : 40, maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
            background: 'rgba(239,68,68,0.1)', color: '#EF4444',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="x" size={28} stroke={2.5} />
          </div>
          <h2 className="font-display" style={{ margin: '0 0 10px', fontSize: isMobile ? 24 : 30, fontWeight: 900 }}>
            Generation failed
          </h2>
          <p style={{ color: 'var(--clay-muted)', fontSize: 15, margin: '0 auto 32px', lineHeight: 1.6, maxWidth: 380 }}>
            {jobError}
          </p>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, justifyContent: 'center' }}>
            <button onClick={handleTryAgain} className="clay-btn clay-btn-primary" style={{ height: 56, fontSize: 15, flex: isMobile ? undefined : '0 0 auto', padding: '0 32px' }}>
              <Icon name="refresh" size={18} stroke={2.2} /> Try again
            </button>
            <button onClick={handleNew} className="clay-btn clay-btn-secondary" style={{ height: 56, fontSize: 15, flex: isMobile ? undefined : '0 0 auto', padding: '0 24px' }}>
              <Icon name="plus" size={18} /> Start fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-enter results-layout">

      {/* LEFT: hero + grid */}
      <div className="clay-card" style={{ padding: isMobile ? 20 : 36, borderRadius: isMobile ? 28 : 40 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <div className="clay-pill" style={{ background: 'rgba(16,185,129,0.18)', color: '#047857', marginBottom: 8 }}>
              <Icon name="check" size={12} stroke={3} /> Done
            </div>
            <h2 className="font-display" style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
              Your thumbnails are ready
            </h2>
            <p style={{ color: 'var(--clay-muted)', margin: '6px 0 0', fontSize: 14, maxWidth: 520, fontStyle: 'italic' }}>
              "{prompt}"
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleRegen} className="clay-btn clay-btn-secondary" style={{ height: 48, padding: '0 18px', fontSize: 14 }}>
              <Icon name="refresh" size={16} /> Regenerate
            </button>
            <button onClick={handleNew} className="clay-btn clay-btn-secondary" style={{ height: 48, padding: '0 18px', fontSize: 14 }}>
              <Icon name="plus" size={16} /> New thumbnail
            </button>
          </div>
        </div>

        {/* Hero display */}
        <div style={{
          padding: 18, borderRadius: 28,
          background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
          marginBottom: 22, display: 'grid', placeItems: 'center',
        }}>
          {heroThumb ? (
            <img
              src={heroThumb.imagekitUrl}
              alt={`Thumbnail option ${picked + 1}`}
              style={{ maxWidth: '100%', borderRadius: 14, boxShadow: '0 12px 30px rgba(20,15,40,0.25)' }}
            />
          ) : (
            <FauxThumbnail size={isMobile ? 'md' : 'xl'} style={styleSel} />
          )}
        </div>

        {/* Variant picker — only shown when multiple options exist */}
        {thumbs.length > 1 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${thumbs.length}, 1fr)`,
            gap: 12, marginBottom: 24,
          }}>
            {thumbs.map((v, i) => (
              <button
                key={v.thumbnailId}
                onClick={() => setPicked(i)}
                className={picked === i ? 'surface-1' : 'surface-glass'}
                style={{
                  padding: 8, border: 0, borderRadius: 18, cursor: 'pointer',
                  transition: 'all 200ms',
                  boxShadow: picked === i ? 'var(--shadow-clay-card)' : 'var(--shadow-clay-soft)',
                  transform: picked === i ? 'translateY(-3px)' : 'none',
                }}
              >
                <div style={{ borderRadius: 12, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
                  <img
                    src={v.imagekitUrl}
                    alt={STYLE_LABELS[v.styleName] ?? v.styleName}
                    style={{ width: '100%', borderRadius: 10 }}
                  />
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="font-display" style={{ fontWeight: 800, fontSize: 13 }}>
                    {STYLE_LABELS[v.styleName] ?? v.styleName}
                  </div>
                  {picked === i && (
                    <div style={{
                      width: 18, height: 18, borderRadius: 99,
                      background: 'var(--clay-accent)',
                      display: 'grid', placeItems: 'center', color: '#fff',
                    }}>
                      <Icon name="check" size={11} stroke={3} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Download row */}
        <div className="clay-card surface-3" style={{ padding: 18, borderRadius: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 16 }}>
              Download{' '}
              {thumbs.length > 0 && (
                <span style={{ color: 'var(--clay-accent)' }}>
                  {STYLE_LABELS[thumbs[picked]?.styleName] ?? thumbs[picked]?.styleName}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--clay-muted)' }}>Pick the format you need — we'll resize it.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(ASPECTS).map(([key, a], i) => {
              const url = heroThumb
                ? (heroThumb.variants?.[a.trKey] ?? heroThumb.imagekitUrl)
                : null;
              const busy = downloadingKey === key;
              return (
                <button
                  key={key}
                  disabled={!url || busy}
                  onClick={async () => {
                    if (!url) return;
                    setDownloadingKey(key);
                    const styleName = heroThumb ? (STYLE_LABELS[heroThumb.styleName] ?? heroThumb.styleName) : 'thumbnail';
                    const result = await downloadUrl(url, `hookframe-${styleName}-${a.trKey}.jpg`);
                    setDownloadingKey(null);
                    if (result === 'downloaded') {
                      toast.success(`${a.label} (${a.dim}) saved!`);
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
                      : <Icon name={a.icon} size={14} />
                    }
                    {a.label}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8, fontWeight: 700 }}>{a.dim}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: details */}
      <div className="results-sidebar">
        <div className="clay-card" style={{ padding: 24, borderRadius: 28 }}>
          <div className="font-display" style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>Generation details</div>
          {[
            ['Style', STYLE_LABELS[styleSel] ?? styleSel],
            ['Variations', `${thumbs.length}/${count}`],
            ['Aspect', ASPECTS[aspect]?.label ?? aspect],
            ['Credits used', `${count}`],
            ['Engine', 'Hookframe v1.0'],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '1px dashed var(--clay-divider)',
            }}>
              <span style={{ fontSize: 13, color: 'var(--clay-muted)', fontWeight: 600 }}>{k}</span>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 800 }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="clay-card surface-3" style={{ padding: 18, borderRadius: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="font-display" style={{ fontWeight: 900, fontSize: 14 }}>Saved to history</div>
              <div style={{ fontSize: 12, color: 'var(--clay-muted)' }}>Auto-saved · find it later</div>
            </div>
            <div style={{
              width: 40, height: 22, borderRadius: 99,
              background: 'var(--clay-accent)', padding: 2, position: 'relative',
            }}>
              <div className="knob" style={{ width: 18, height: 18, borderRadius: 99, position: 'absolute', right: 2, top: 2 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
