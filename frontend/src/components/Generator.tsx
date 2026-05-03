import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import useAppStore from '../store/useAppStore';
import { uploadHeadshot, createJob } from '../api';
import Icon from './Icon';
import FauxThumbnail from './FauxThumbnail';

const STYLES = [
  {
    id: 'bold_dramatic',
    label: 'Bold Dramatic',
    desc: 'High contrast, cinematic lighting, strong composition',
    grad: 'linear-gradient(135deg,#1F2937,#7F1D1D)',
  },
  {
    id: 'clean_minimal',
    label: 'Clean Minimal',
    desc: 'Bright, light background, plenty of whitespace',
    grad: 'linear-gradient(135deg,#F8FAFC,#E2E8F0)',
  },
  {
    id: 'vibrant_energetic',
    label: 'Vibrant Energetic',
    desc: 'Colorful gradients, dynamic angles, energetic contrast',
    grad: 'linear-gradient(135deg,#0EA5E9,#F97316)',
  },
];

const PROMPT_CHIPS = [
  "I'm teaching FastAPI — highlight the framework name",
  'Reaction to the new MacBook M5 — surprised face',
  'Build a SaaS in 7 days with Next.js 15',
  'Cozy morning routine vlog in Tokyo',
];

function derivedHeadline(prompt: string) {
  if (!prompt) return 'YOUR HOOK HERE';
  const l = prompt.toLowerCase();
  if (l.includes('fastapi')) return 'LEARN FASTAPI';
  if (l.includes('react')) return 'REACT IS BACK';
  if (l.includes('macbook') || l.includes('m5')) return 'I TRIED M5';
  if (l.includes('tokyo')) return 'TOKYO MORNINGS';
  if (l.includes('saas')) return 'SaaS in 7 DAYS';
  const words = prompt.split(/\s+/).filter((w) => w.length > 3).slice(0, 2).join(' ').toUpperCase();
  return words || 'YOUR HOOK';
}

const STYLE_SUBS: Record<string, string> = {
  bold_dramatic: 'HIGH IMPACT',
  clean_minimal: 'LESS, BUT BETTER',
  vibrant_energetic: 'LOUD, BRIGHT, FAST',
};
const STYLE_BGS: Record<string, string> = {
  bold_dramatic: 'linear-gradient(135deg,#111827,#7F1D1D)',
  clean_minimal: 'linear-gradient(135deg,#F8FAFC,#E5E7EB)',
  vibrant_energetic: 'linear-gradient(135deg,#0F172A,#F97316)',
};

export default function Generator() {
  const {
    headshotPreview, headshotUrl,
    setHeadshotPreview, setHeadshotUrl,
    prompt, setPrompt,
    styleSel, setStyleSel,
    count, setCount,
    token, credits,
    setJobId, clearLiveThumbnails, setScreen,
  } = useAppStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setHeadshotPreview(e.target?.result as string);
      setHeadshotUrl(null); // reset imagekit URL when new file selected
    };
    reader.readAsDataURL(f);
    // Store file reference for upload
    (fileRef as any)._pendingFile = f;
  };

  const clearHeadshot = () => {
    setHeadshotPreview(null);
    setHeadshotUrl(null);
    (fileRef as any)._pendingFile = null;
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasCredits = credits === null || credits >= count;
  const canGenerate = !!headshotPreview && prompt.trim().length > 4 && hasCredits;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setSubmitting(true);
    setError(null);
    try {
      // Upload headshot if not already uploaded
      let imgUrl = headshotUrl;
      if (!imgUrl) {
        const file = (fileRef as any)._pendingFile as File | null;
        if (!file) throw new Error('No headshot file available. Please re-upload.');
        imgUrl = await uploadHeadshot(file);
        setHeadshotUrl(imgUrl);
      }

      if (!token) throw new Error('Not authenticated. Please log in again.');

      // Create job
      const { job_id } = await createJob({ prompt, numThumbnails: count, headshotUrl: imgUrl }, token);
      setJobId(job_id);
      clearLiveThumbnails();
      setScreen('loading');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeStyle = STYLES.find((s) => s.id === styleSel);

  return (
    <div className="screen-enter" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 28, alignItems: 'start' }}>

      {/* LEFT: form */}
      <div className="clay-card" style={{ padding: 36, borderRadius: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div className="clay-pill" style={{ marginBottom: 12, background: 'rgba(124,58,237,0.12)', color: 'var(--clay-accent)' }}>
              <Icon name="sparkles" size={14} /> NEW THUMBNAIL
            </div>
            <h2 className="font-display" style={{ margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em' }}>
              Tell us what to make
            </h2>
            <p style={{ color: 'var(--clay-muted)', margin: '8px 0 0', fontSize: 15 }}>
              A photo + a sentence. We do the rest.
            </p>
          </div>
        </div>

        {/* Step 1 — Headshot */}
        <Section number="1" title="Drop your headshot">
          <div
            onClick={() => !headshotPreview && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            style={{
              borderRadius: 28, padding: 6,
              background: dragOver ? 'rgba(124,58,237,0.1)' : 'var(--clay-input-bg)',
              boxShadow: 'var(--shadow-clay-pressed)',
              transition: 'background 200ms',
              cursor: headshotPreview ? 'default' : 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, minHeight: 168 }}>
              {/* Photo well */}
              <div style={{
                width: 168, height: 168, borderRadius: 22, overflow: 'hidden',
                flexShrink: 0,
                background: headshotPreview ? 'transparent' : 'rgba(124,58,237,0.06)',
                border: headshotPreview ? '0' : '2px dashed rgba(124,58,237,0.35)',
                display: 'grid', placeItems: 'center', position: 'relative',
              }}>
                {headshotPreview ? (
                  <>
                    <img src={headshotPreview} alt="headshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); clearHeadshot(); }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        width: 32, height: 32, borderRadius: 99,
                        border: 0, background: 'rgba(0,0,0,0.6)', color: '#fff',
                        cursor: 'pointer', display: 'grid', placeItems: 'center',
                      }}
                    >
                      <Icon name="x" size={14} stroke={2.5} />
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--clay-accent)' }}>
                    <Icon name="upload" size={32} stroke={2} />
                    <div style={{ fontSize: 12, marginTop: 8, fontWeight: 700, color: 'var(--clay-muted)' }}>Drop or click</div>
                  </div>
                )}
              </div>

              {/* Hints */}
              <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="font-display" style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
                    {headshotPreview ? 'Looking sharp.' : "We'll cut this out for you."}
                  </div>
                  <div style={{ color: 'var(--clay-muted)', fontSize: 13, lineHeight: 1.5 }}>
                    Use a clear, well-lit shot of your face — straight-on or 3/4 angle works best. We auto-remove the background.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['JPG · PNG · WEBP', 'Up to 8 MB', '1024×1024+ recommended'].map((h) => (
                    <span key={h} className="surface-2" style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 11,
                      fontWeight: 700, color: 'var(--clay-muted)', boxShadow: 'var(--shadow-clay-soft)',
                    }}>{h}</span>
                  ))}
                </div>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </Section>

        {/* Step 2 — Prompt */}
        <Section
          number="2"
          title="Describe the vibe"
          extra={<span style={{ color: 'var(--clay-muted)', fontSize: 13 }}>{prompt.length}/240</span>}
        >
          <textarea
            className="clay-input"
            placeholder="e.g. A FastAPI tutorial thumbnail with bold text and a dark green tech background"
            maxLength={240}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ minHeight: 110, resize: 'vertical', lineHeight: 1.5, fontSize: 15 }}
          />
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--clay-muted)', fontWeight: 700, alignSelf: 'center', marginRight: 4 }}>TRY:</span>
            {PROMPT_CHIPS.map((c) => (
              <button key={c} onClick={() => setPrompt(c)} className="clay-pill surface-1" style={{ border: 0, cursor: 'pointer' }}>
                {c}
              </button>
            ))}
          </div>
        </Section>

        {/* Step 3 — Style */}
        <Section number="3" title="Pick a style">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
            {STYLES.map((s) => {
              const active = styleSel === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStyleSel(s.id)}
                  className={active ? 'surface-1' : ''}
                  style={{
                    position: 'relative', border: 0, cursor: 'pointer',
                    padding: 14, textAlign: 'left', borderRadius: 22,
                    transition: 'transform 200ms, box-shadow 200ms',
                    background: active ? undefined : 'var(--clay-input-bg)',
                    boxShadow: active ? 'var(--shadow-clay-card)' : 'var(--shadow-clay-pressed)',
                    transform: active ? 'translateY(-2px)' : 'none',
                  }}
                >
                  <div style={{
                    width: '100%', height: 50, borderRadius: 14, background: s.grad,
                    marginBottom: 10, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
                  }} />
                  <div className="font-display" style={{ fontWeight: 800, fontSize: 14, color: 'var(--clay-fg)' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--clay-muted)', marginTop: 2 }}>{s.desc}</div>
                  {active && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 22, height: 22, borderRadius: 99,
                      background: 'var(--clay-accent)',
                      display: 'grid', placeItems: 'center', color: '#fff',
                    }}>
                      <Icon name="check" size={12} stroke={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Step 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          <Section number="4" title="Variations">
            <div style={{
              display: 'flex', gap: 8, padding: 6, borderRadius: 20,
              background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
            }}>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={count === n ? 'surface-1' : ''}
                  style={{
                    flex: 1, height: 50, border: 0, borderRadius: 12, cursor: 'pointer',
                    fontFamily: 'Nunito', fontWeight: 900, fontSize: 22,
                    background: count === n ? undefined : 'transparent',
                    color: count === n ? 'var(--clay-accent)' : 'var(--clay-muted)',
                    boxShadow: count === n ? 'var(--shadow-clay-soft)' : 'none',
                    transition: 'all 200ms',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* Generate CTA */}
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || submitting}
            className="clay-btn clay-btn-primary"
            style={{ flex: 1, height: 68, fontSize: 17 }}
          >
            {submitting ? (
              <>
                <Icon name="loader" size={20} className="spinning" />
                Uploading…
              </>
            ) : (
              <>
                <Icon name="sparkles" size={20} stroke={2.4} />
                Generate {count} thumbnail{count > 1 ? 's' : ''}
              </>
            )}
          </button>
          <div className="clay-card surface-1" style={{ padding: '12px 18px', borderRadius: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--clay-muted)', fontWeight: 700, letterSpacing: 0.06, textTransform: 'uppercase' }}>Cost</div>
            <div className="font-display" style={{ fontWeight: 900, fontSize: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="bolt" size={14} /> {count} credit{count > 1 ? 's' : ''}
            </div>
            <div style={{
              fontSize: 11, marginTop: 2, fontWeight: 700,
              color: credits !== null && credits < count ? '#DC2626' : 'var(--clay-muted)',
            }}>
              {credits !== null ? `${credits} remaining` : '…'}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 14, fontSize: 13, color: '#DC2626', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}
        {!canGenerate && !error && (
          <div style={{ marginTop: 14, fontSize: 13, color: credits !== null && credits < count ? '#DC2626' : 'var(--clay-muted)', textAlign: 'center' }}>
            {!headshotPreview
              ? 'Add a headshot to continue'
              : prompt.trim().length <= 4
              ? 'Write at least a few words to continue'
              : 'Not enough credits'}
          </div>
        )}
      </div>

      {/* RIGHT: live preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 24 }}>
        <div className="clay-card" style={{ padding: 24, borderRadius: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--clay-muted)', fontWeight: 800, letterSpacing: 0.08, textTransform: 'uppercase' }}>Live preview</div>
              <div className="font-display" style={{ fontWeight: 900, fontSize: 22, marginTop: 2 }}>How it'll look</div>
            </div>
            <div className="clay-pill" style={{ background: 'rgba(16,185,129,0.18)', color: '#047857' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: '#10B981', display: 'inline-block' }} />
              composing
            </div>
          </div>
          <div style={{
            display: 'grid', placeItems: 'center', padding: 12,
            borderRadius: 24, background: 'var(--clay-input-bg)',
            boxShadow: 'var(--shadow-clay-pressed)',
          }}>
            <FauxThumbnail
              size="lg"
              style={styleSel}
              headshot={headshotPreview}
              data={{
                headline: derivedHeadline(prompt),
                sub: STYLE_SUBS[styleSel] ?? 'SUBTITLE',
                accent: activeStyle?.grad?.match(/#[0-9A-F]+/i)?.[0] ?? '#10B981',
                bg: STYLE_BGS[styleSel] ?? 'linear-gradient(135deg,#0F172A,#134E4A)',
              }}
            />
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--clay-muted)', textAlign: 'center' }}>
            Final result will differ — this is a layout sketch.
          </div>
        </div>

        {/* Tips */}
        <div className="clay-card surface-3" style={{ padding: 24, borderRadius: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: 'linear-gradient(135deg,#FCD34D,#F59E0B)',
              display: 'grid', placeItems: 'center', color: '#fff',
              boxShadow: '0 6px 14px rgba(245,158,11,0.4)',
            }}>
              <Icon name="bolt" size={18} stroke={2.5} />
            </div>
            <div className="font-display" style={{ fontWeight: 900, fontSize: 18 }}>Tips for better hooks</div>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ["Lead with a verb or number", "'Learn', 'Why', 'In 7 days'"],
              ['Name the thing', 'FastAPI, M5, Tokyo — be specific.'],
              ['Promise an emotion', 'shock, payoff, curiosity'],
            ].map(([h, s]) => (
              <li key={h} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 99,
                  background: 'rgba(124,58,237,0.15)', color: 'var(--clay-accent)',
                  display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1,
                }}>
                  <Icon name="check" size={12} stroke={3} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{h}</div>
                  <div style={{ fontSize: 13, color: 'var(--clay-muted)' }}>{s}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <style>{`
        .spinning { animation: spin-slow 0.8s linear infinite; }
        @media (max-width: 900px) {
          .generator-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Section({
  number, title, children, extra,
}: {
  number: string | number;
  title: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 9,
            background: 'rgba(124,58,237,0.12)', color: 'var(--clay-accent)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'Nunito', fontWeight: 900, fontSize: 13,
          }}>
            {number}
          </div>
          <div className="font-display" style={{ fontWeight: 800, fontSize: 16 }}>{title}</div>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}
