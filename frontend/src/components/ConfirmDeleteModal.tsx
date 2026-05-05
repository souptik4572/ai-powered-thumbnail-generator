import { useEffect } from 'react';
import Icon from './Icon';

interface Props {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDeleteModal({ title, description, onConfirm, onCancel, loading = false }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, loading]);

  return (
    <div
      onClick={() => { if (!loading) onCancel(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(10, 8, 20, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 200,
        display: 'grid', placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="clay-card"
        style={{
          width: '100%', maxWidth: 400,
          padding: '36px 32px 32px',
          borderRadius: 36,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
          animation: 'modal-pop 220ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 22,
          background: 'rgba(239,68,68,0.12)',
          display: 'grid', placeItems: 'center',
          marginBottom: 22,
          color: '#EF4444',
          boxShadow: '6px 6px 18px rgba(239,68,68,0.14), -4px -4px 12px rgba(255,255,255,0.55)',
        }}>
          <Icon name="trash" size={28} stroke={1.7} />
        </div>

        {/* Title */}
        <div className="font-display" style={{ fontWeight: 900, fontSize: 22, marginBottom: 10, letterSpacing: '-0.02em' }}>
          {title}
        </div>

        {/* Description */}
        <div style={{ fontSize: 14, color: 'var(--clay-muted)', lineHeight: 1.65, marginBottom: 30, maxWidth: 300 }}>
          {description}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            className="clay-btn clay-btn-secondary"
            style={{ flex: 1, height: 50, fontSize: 14 }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="clay-btn"
            style={{
              flex: 1, height: 50, fontSize: 14, gap: 7,
              background: 'linear-gradient(135deg, #F87171, #DC2626)',
              color: '#fff', border: 'none',
              boxShadow: '4px 8px 20px rgba(220,38,38,0.35), -2px -2px 8px rgba(255,255,255,0.15)',
              opacity: loading ? 0.72 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? (
              <div style={{
                width: 17, height: 17,
                border: '2.5px solid rgba(255,255,255,0.35)',
                borderTopColor: '#fff',
                borderRadius: 99,
                animation: 'spin-slow 0.7s linear infinite',
              }} />
            ) : (
              <>
                <Icon name="trash" size={15} stroke={2} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-pop {
          from { opacity: 0; transform: scale(0.90) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}
