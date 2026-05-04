import { useEffect, useRef, useState } from 'react';
import useAppStore from '../store/useAppStore';
import { subscribeToJob } from '../api';
import Icon from './Icon';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useToastStore } from '../hooks/useToast';

const FACTS = [
  'Tip: thumbnails with a face get ~38% more clicks on average.',
  'Did you know? The first 1.2s of attention decides the click.',
  'Three high-contrast colors outperform photo-realism 2:1.',
  'A short headline (3 words) beats a long one almost every time.',
  'Bright accent shapes help your thumbnail survive low-light feeds.',
];

const STAGES = [
  { label: 'Reading your headshot', note: 'Detecting face, eyes, lighting…', icon: 'user' },
];

export default function Loading() {
  const {
    jobId, count, prompt, styleSel,
    aspect,
    liveThumbnails, addLiveThumbnail, clearLiveThumbnails,
    setScreen, saveJobToHistory, setJobError,
  } = useAppStore();

  const { isMobile } = useBreakpoint();
  const [factIdx, setFactIdx] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  // Cycle tips
  useEffect(() => {
    const t = setInterval(() => setFactIdx((i) => (i + 1) % FACTS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Advance UI stage based on received thumbnails
  useEffect(() => {
    const progress = liveThumbnails.length / Math.max(count, 1);
    const stage = Math.min(Math.floor(progress * (STAGES.length - 1)), STAGES.length - 1);
    setStageIdx(stage);
  }, [liveThumbnails.length, count]);

  // Subscribe to SSE stream
  useEffect(() => {
    if (!jobId) {
      setScreen('generator');
      return;
    }

    clearLiveThumbnails();

    const es = subscribeToJob(jobId!, {
      onThumbnailReady: (data) => {
        addLiveThumbnail({
          thumbnailId: data.thumbnail_id,
          styleName: data.style_name,
          imagekitUrl: data.imagekit_url,
          variants: data.variants ?? {},
        });
      },
      onThumbnailFailed: () => {
        // Individual failures are acceptable; handled at job completion
      },
      onJobCompleted: () => {
        const ready = useAppStore.getState().liveThumbnails;
        if (ready.length === 0) {
          setJobError('None of the thumbnails could be generated. Please try again.');
          setScreen('results');
          return;
        }
        saveJobToHistory({
          jobId: jobId!,
          prompt,
          style: styleSel,
          aspect,
          count,
          createdAt: new Date().toISOString(),
          thumbnails: ready,
        });
        useToastStore.getState().push(
          `${ready.length} thumbnail${ready.length !== 1 ? 's' : ''} ready — pick your favourite!`,
          'success',
        );
        setScreen('results');
      },
      onError: (data) => {
        const ready = useAppStore.getState().liveThumbnails;
        if (ready.length === 0) {
          const msg = (data as { message?: string })?.message;
          setJobError(msg ?? 'Something went wrong during generation. Please try again.');
        } else {
          useToastStore.getState().push('Generation encountered an issue. Showing available results.', 'warning');
        }
        setScreen('results');
      },
    });

    esRef.current = es;

    // Safety timeout: if no completion after 3 min, go to results anyway
    const timeout = setTimeout(() => {
      es.close();
      const ready = useAppStore.getState().liveThumbnails;
      if (ready.length === 0) {
        setJobError('Generation timed out. Please try again.');
      }
      setScreen('results');
    }, 180_000);

    return () => {
      es.close();
      clearTimeout(timeout);
    };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const received = liveThumbnails.length;
  const progressPct = count > 0 ? Math.round((received / count) * 100) : 0;
  const displayPct = Math.max(progressPct, stageIdx * (100 / STAGES.length));
  const currentStage = STAGES[stageIdx];

  const orbSize = isMobile ? 160 : 220;
  const orbitRadius = isMobile ? 78 : 110;

  return (
    <div className="clay-card screen-enter" style={{ padding: isMobile ? 28 : 48, borderRadius: isMobile ? 28 : 48, position: 'relative', overflow: 'hidden' }}>
      {/* Breathing orb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative', width: orbSize, height: orbSize }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 99,
            background: 'linear-gradient(135deg,#A78BFA,#7C3AED)',
            boxShadow: 'var(--shadow-clay-button)',
            animation: 'clay-breathe 2.4s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 16, borderRadius: 99,
            background: 'rgba(255,255,255,0.18)',
            animation: 'spin-slow 6s linear infinite',
            border: '2px dashed rgba(255,255,255,0.5)',
          }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
            <div style={{ textAlign: 'center' }}>
              <Icon name={currentStage.icon} size={isMobile ? 34 : 44} stroke={2.2} />
              <div className="font-display" style={{ fontWeight: 900, fontSize: isMobile ? 24 : 30, marginTop: 5 }}>
                {displayPct}%
              </div>
            </div>
          </div>
          {/* Orbiting sparkles */}
          {[0, 120, 240].map((deg, i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%', width: 0, height: 0,
              transform: `rotate(${deg}deg)`,
              animation: `spin-slow ${5 + i}s linear infinite`,
              animationDirection: i % 2 ? 'reverse' : 'normal',
            }}>
              <div style={{
                position: 'absolute', left: orbitRadius, top: -10,
                width: isMobile ? 20 : 26, height: isMobile ? 20 : 26, borderRadius: 7,
                background: ['#F472B6', '#38BDF8', '#FCD34D'][i],
                boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
                display: 'grid', placeItems: 'center', color: '#fff',
              }}>
                <Icon name="sparkles" size={isMobile ? 10 : 14} stroke={2.5} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Headline */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 className="font-display" style={{ margin: 0, fontSize: isMobile ? 24 : 32, fontWeight: 900 }}>{currentStage.label}</h2>
        <p style={{ color: 'var(--clay-muted)', fontSize: 14, marginTop: 8 }}>{currentStage.note}</p>
        {received > 0 && (
          <p style={{ color: 'var(--clay-accent)', fontSize: 14, marginTop: 4, fontWeight: 700 }}>
            {received} of {count} thumbnail{count > 1 ? 's' : ''} ready
          </p>
        )}
      </div>

      {/* Stages list */}
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gap: 10 }}>
        {STAGES.map((s, i) => {
          const done = i < stageIdx;
          const active = i === stageIdx;
          return (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 20,
              background: active ? 'rgba(124,58,237,0.1)' : done ? 'rgba(16,185,129,0.08)' : 'var(--clay-input-bg)',
              boxShadow: active ? 'var(--shadow-clay-soft)' : 'var(--shadow-clay-pressed)',
              transition: 'all 300ms',
              opacity: i > stageIdx ? 0.6 : 1,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 10,
                display: 'grid', placeItems: 'center',
                background: done ? '#10B981' : active ? 'var(--clay-accent)' : 'var(--clay-toggle-track)',
                color: '#fff',
                flexShrink: 0,
              }}>
                {done ? <Icon name="check" size={14} stroke={3.5} /> : <Icon name={s.icon} size={14} stroke={2.4} />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-display" style={{ fontWeight: 800, fontSize: 13, color: 'var(--clay-fg)' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--clay-muted)' }}>{s.note}</div>
              </div>
              {active && (
                <div style={{
                  width: 14, height: 14, borderRadius: 99,
                  border: '2.5px solid var(--clay-accent)', borderTopColor: 'transparent',
                  animation: 'spin-slow 0.8s linear infinite',
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Fun fact */}
      <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--clay-muted)', fontSize: 13 }}>
        <Icon name="bolt" size={14} />
        <span style={{ fontWeight: 600 }} key={factIdx}>{FACTS[factIdx]}</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--clay-muted)', textAlign: 'center' }}>
        Usually 20–60 seconds. Feel free to refill your coffee.
      </div>
    </div>
  );
}
