import { useEffect, useState } from 'react';
import { useToastStore, type ToastItem, type ToastType } from '../hooks/useToast';
import Icon from './Icon';
import { useBreakpoint } from '../hooks/useBreakpoint';

const CFG: Record<ToastType, { icon: string; accent: string; bg: string }> = {
  success: { icon: 'check',    accent: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  error:   { icon: 'x',       accent: '#EF4444', bg: 'rgba(239,68,68,0.1)'    },
  warning: { icon: 'bolt',    accent: '#F59E0B', bg: 'rgba(245,158,11,0.1)'   },
  info:    { icon: 'sparkles', accent: 'var(--clay-accent)', bg: 'rgba(124,58,237,0.1)' },
};

function Toast({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [visible, setVisible] = useState(false);
  const cfg = CFG[toast.type];

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(() => dismiss(toast.id), 320);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px 17px',
        borderRadius: 20,
        background: 'var(--clay-card-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: 'var(--shadow-clay-card)',
        minWidth: 260, maxWidth: 380,
        position: 'relative',
        overflow: 'hidden',
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(48px) scale(0.94)',
        opacity: visible ? 1 : 0,
        transition: 'transform 360ms cubic-bezier(.17,.84,.44,1), opacity 260ms ease',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        background: cfg.bg, color: cfg.accent,
        display: 'grid', placeItems: 'center',
        boxShadow: `0 0 0 1.5px ${cfg.accent}44`,
      }}>
        <Icon name={cfg.icon} size={16} stroke={2.5} />
      </div>

      <p style={{
        flex: 1, margin: 0, paddingTop: 3,
        fontSize: 13, fontWeight: 700,
        color: 'var(--clay-fg)', lineHeight: 1.45,
      }}>
        {toast.message}
      </p>

      <button
        onClick={close}
        aria-label="Dismiss notification"
        style={{
          width: 24, height: 24, borderRadius: 8, border: 0,
          background: 'transparent', color: 'var(--clay-muted)',
          cursor: 'pointer', display: 'grid', placeItems: 'center',
          flexShrink: 0, marginTop: 1,
          transition: 'background 150ms',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--clay-input-bg)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Icon name="x" size={12} stroke={2.5} />
      </button>

      {/* Auto-dismiss progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${cfg.accent}, ${cfg.accent}88)`,
        borderRadius: '0 0 20px 20px',
        transformOrigin: 'left',
        animation: `toast-shrink ${toast.duration}ms linear forwards`,
      }} />
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const { isMobile } = useBreakpoint();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 24,
        right: isMobile ? 16 : 24,
        left: isMobile ? 16 : 'auto',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 10,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <Toast toast={t} />
        </div>
      ))}
    </div>
  );
}
