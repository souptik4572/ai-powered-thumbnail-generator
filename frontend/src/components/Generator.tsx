import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import useAppStore from '../store/useAppStore';
import { uploadHeadshot, createJob } from '../api';
import Icon from './Icon';
import FauxThumbnail from './FauxThumbnail';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useToast } from '../hooks/useToast';

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

  const { isMobile, isTablet } = useBreakpoint();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    pendingFileRef.current = f;
    const reader = new FileReader();
    reader.onload = (e) => {
      setHeadshotPreview(e.target?.result as string);
      setHeadshotUrl(null);
    };
    reader.readAsDataURL(f);
  };

  const clearHeadshot = () => {
    setHeadshotPreview(null);
    setHeadshotUrl(null);
    pendingFileRef.current = null;
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasCredits = credits === null || credits >= count;
  const canGenerate = !!headshotPreview && prompt.trim().length > 4 && hasCredits;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setSubmitting(true);
    try {
      let imgUrl = headshotUrl;
      if (!imgUrl) {
        const file = pendingFileRef.current;
        if (!file) throw new Error('No headshot file available. Please re-upload.');
        imgUrl = await uploadHeadshot(file);
        setHeadshotUrl(imgUrl);
      }

      if (!token) throw new Error('Not authenticated. Please log in again.');

      const { job_id } = await createJob({ prompt, numThumbnails: count, headshotUrl: imgUrl }, token);
      setJobId(job_id);
      clearLiveThumbnails();
      setScreen('loading');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeStyle = STYLES.find((s) => s.id === styleSel);
  const photoWellSize = isMobile ? 112 : 168;

  return (
    <div className="screen-enter gen-layout">

      {/* LEFT: form */}
      <div className="clay-card" style={{ padding: isMobile ? 20 : 36, borderRadius: isMobile ? 28 : 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div className="clay-pill" style={{ marginBottom: 10, background: 'rgba(124,58,237,0.12)', color: 'var(--clay-accent)' }}>
              <Icon name="sparkles" size={14} /> NEW THUMBNAIL
            </div>
            <h2 className="font-display" style={{ margin: 0, fontSize: isMobile ? 26 : 36, fontWeight: 900, letterSpacing: '-0.02em' }}>
              Tell us what to make
            </h2>
            <p style={{ color: 'var(--clay-muted)', margin: '8px 0 0', fontSize: 14 }}>
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
              borderRadius: 24, padding: 6,
              background: dragOver ? 'rgba(124,58,237,0.1)' : 'var(--clay-input-bg)',
              boxShadow: 'var(--shadow-clay-pressed)',
              transition: 'background 200ms',
              cursor: headshotPreview ? 'default' : 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 14, minHeight: photoWellSize }}>
              {/* Photo well */}
              <div style={{
                width: photoWellSize, height: photoWellSize,
                borderRadius: 18, overflow: 'hidden',
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
                        width: 28, height: 28, borderRadius: 99,
                        border: 0, background: 'rgba(0,0,0,0.6)', color: '#fff',
                        cursor: 'pointer', display: 'grid', placeItems: 'center',
                      }}
                    >
                      <Icon name="x" size={12} stroke={2.5} />
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--clay-accent)' }}>
                    <Icon name="upload" size={28} stroke={2} />
                    <div style={{ fontSize: 11, marginTop: 6, fontWeight: 700, color: 'var(--clay-muted)' }}>Drop or click</div>
                  </div>
                )}
              </div>

              {/* Hints */}
              <div style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="font-display" style={{ fontWeight: 800, fontSize: 15, marginBottom: 5 }}>
                    {headshotPreview ? 'Looking sharp.' : "We'll cut this out for you."}
                  </div>
                  <div style={{ color: 'var(--clay-muted)', fontSize: 12, lineHeight: 1.5 }}>
                    {isMobile
                      ? 'Clear, well-lit face shot. We auto-remove the background.'
                      : 'Use a clear, well-lit shot of your face — straight-on or 3/4 angle works best. We auto-remove the background.'}
                  </div>
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['JPG · PNG · WEBP', 'Up to 8 MB', '1024×1024+ recommended'].map((h) => (
                      <span key={h} className="surface-2" style={{
                        padding: '4px 10px', borderRadius: 99, fontSize: 11,
                        fontWeight: 700, color: 'var(--clay-muted)', boxShadow: 'var(--shadow-clay-soft)',
                      }}>{h}</span>
                    ))}
                  </div>
                )}
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
            style={{ minHeight: 100, resize: 'vertical', lineHeight: 1.5, fontSize: 14 }}
          />
          <div style={{ marginTop: 10 }}>
            <div className="scroll-row" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--clay-muted)', fontWeight: 700, flexShrink: 0, marginRight: 4 }}>TRY:</span>
              {PROMPT_CHIPS.map((c) => (
                <button key={c} onClick={() => setPrompt(c)} className="clay-pill surface-1" style={{ border: 0, cursor: 'pointer', flexShrink: 0 }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Step 3 — Style */}
        <Section number="3" title="Pick a style">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
            {STYLES.map((s) => {
              const active = styleSel === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStyleSel(s.id)}
                  className={active ? 'surface-1' : ''}
                  style={{
                    position: 'relative', border: 0, cursor: 'pointer',
                    padding: 12, textAlign: 'left', borderRadius: 20,
                    transition: 'transform 200ms, box-shadow 200ms',
                    background: active ? undefined : 'var(--clay-input-bg)',
                    boxShadow: active ? 'var(--shadow-clay-card)' : 'var(--shadow-clay-pressed)',
                    transform: active ? 'translateY(-2px)' : 'none',
                  }}
                >
                  <div style={{
                    width: '100%', height: 44, borderRadius: 12, background: s.grad,
                    marginBottom: 8, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
                  }} />
                  <div className="font-display" style={{ fontWeight: 800, fontSize: 13, color: 'var(--clay-fg)' }}>{s.label}</div>
                  {!isMobile && (
                    <div style={{ fontSize: 11, color: 'var(--clay-muted)', marginTop: 2 }}>{s.desc}</div>
                  )}
                  {active && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 20, height: 20, borderRadius: 99,
                      background: 'var(--clay-accent)',
                      display: 'grid', placeItems: 'center', color: '#fff',
                    }}>
                      <Icon name="check" size={11} stroke={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Step 4 */}
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.4fr 1fr', gap: 20 }}>
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
        <div style={{
          marginTop: 24,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 14,
        }}>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || submitting}
            className="clay-btn clay-btn-primary"
            style={{ flex: isMobile ? undefined : 1, height: 64, fontSize: 16 }}
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
          <div className="clay-card surface-1" style={{ padding: '10px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: isMobile ? 20 : 0, flexDirection: isMobile ? 'row' : 'column' }}>
            <div style={{ fontSize: 11, color: 'var(--clay-muted)', fontWeight: 700, letterSpacing: 0.06, textTransform: 'uppercase' }}>Cost</div>
            <div className="font-display" style={{ fontWeight: 900, fontSize: 17, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="bolt" size={13} /> {count} credit{count > 1 ? 's' : ''}
            </div>
            <div style={{
              fontSize: 11, marginTop: isMobile ? 0 : 2, fontWeight: 700,
              color: credits !== null && credits < count ? '#DC2626' : 'var(--clay-muted)',
            }}>
              {credits !== null ? `${credits} remaining` : '…'}
            </div>
          </div>
        </div>

        {!canGenerate && (
          <p style={{
            marginTop: 10, fontSize: 13, textAlign: 'center', fontWeight: 600,
            color: credits !== null && credits < count ? '#EF4444' : 'var(--clay-muted)',
          }}>
            {!headshotPreview
              ? 'Upload a headshot to continue'
              : prompt.trim().length <= 4
              ? 'Write at least a few words to describe the vibe'
              : 'Not enough credits'}
          </p>
        )}
      </div>

      {/* RIGHT: live preview — hidden on mobile to prevent 480px overflow */}
      {!isMobile && <div className="gen-sidebar">
        <div className="clay-card" style={{ padding: 22, borderRadius: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--clay-muted)', fontWeight: 800, letterSpacing: 0.08, textTransform: 'uppercase' }}>Live preview</div>
              <div className="font-display" style={{ fontWeight: 900, fontSize: 20, marginTop: 2 }}>How it'll look</div>
            </div>
            <div className="clay-pill" style={{ background: 'rgba(16,185,129,0.18)', color: '#047857' }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: '#10B981', display: 'inline-block' }} />
              composing
            </div>
          </div>
          <div style={{
            display: 'grid', placeItems: 'center', padding: 10,
            borderRadius: 22, background: 'var(--clay-input-bg)',
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
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--clay-muted)', textAlign: 'center' }}>
            Final result will differ — this is a layout sketch.
          </div>
        </div>

        {/* Tips */}
        <div className="clay-card surface-3" style={{ padding: 22, borderRadius: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 12,
              background: 'linear-gradient(135deg,#FCD34D,#F59E0B)',
              display: 'grid', placeItems: 'center', color: '#fff',
              boxShadow: '0 6px 14px rgba(245,158,11,0.4)',
            }}>
              <Icon name="bolt" size={16} stroke={2.5} />
            </div>
            <div className="font-display" style={{ fontWeight: 900, fontSize: 17 }}>Tips for better hooks</div>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ["Lead with a verb or number", "'Learn', 'Why', 'In 7 days'"],
              ['Name the thing', 'FastAPI, M5, Tokyo — be specific.'],
              ['Promise an emotion', 'shock, payoff, curiosity'],
            ].map(([h, s]) => (
              <li key={h} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 99,
                  background: 'rgba(124,58,237,0.15)', color: 'var(--clay-accent)',
                  display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1,
                }}>
                  <Icon name="check" size={11} stroke={3} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{h}</div>
                  <div style={{ fontSize: 12, color: 'var(--clay-muted)' }}>{s}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>}

      <style>{`.spinning { animation: spin-slow 0.8s linear infinite; }`}</style>
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
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 8,
            background: 'rgba(124,58,237,0.12)', color: 'var(--clay-accent)',
            display: 'grid', placeItems: 'center',
            fontFamily: 'Nunito', fontWeight: 900, fontSize: 12,
          }}>
            {number}
          </div>
          <div className="font-display" style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}
