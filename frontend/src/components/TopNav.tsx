import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import type { Accent } from '../store/useAppStore';
import Icon from './Icon';
import { getCredits } from '../api';
import { useBreakpoint } from '../hooks/useBreakpoint';

const ACCENTS: { id: Accent; color: string; label: string }[] = [
  { id: 'violet', color: '#7C3AED', label: 'Violet' },
  { id: 'blue',   color: '#0EA5E9', label: 'Blue'   },
  { id: 'pink',   color: '#DB2777', label: 'Pink'   },
  { id: 'green',  color: '#10B981', label: 'Green'  },
  { id: 'amber',  color: '#F59E0B', label: 'Amber'  },
];

export default function TopNav() {
  const {
    user, logout, setGenerateView,
    theme, toggleTheme, token, credits, setCredits,
    accent, setAccent, showBlobs, setShowBlobs,
  } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const dark = theme === 'dark';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    getCredits(token).then((d) => setCredits(d.credits)).catch(() => {});
  }, [token, location.pathname, setCredits]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  const activeTab = location.pathname.startsWith('/history') ? 'history' : 'generator';

  return (
    <header className="nav-header">
      <div className="clay-card" style={{
        display: 'flex', alignItems: 'center',
        padding: isMobile ? '8px 12px' : '10px 16px',
        borderRadius: isMobile ? 20 : 26,
        gap: isMobile ? 8 : 12,
      }}>

        {/* Logo */}
        <button
          onClick={() => { setGenerateView('form'); navigate('/generate'); }}
          aria-label="Go to generator"
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            border: 0, background: 'transparent', cursor: 'pointer', padding: 0,
          }}
        >
          <div style={{
            width: 34, height: 34, borderRadius: 11,
            background: 'linear-gradient(135deg,var(--clay-accent-light),var(--clay-accent))',
            display: 'grid', placeItems: 'center', color: '#fff',
            flexShrink: 0, boxShadow: 'var(--shadow-clay-button)',
          }}>
            <Icon name="sparkles" size={17} stroke={2.4} />
          </div>
          <span className="nav-brand-name font-display" style={{
            fontWeight: 900, fontSize: 18, lineHeight: 1,
            color: dark ? 'var(--clay-accent-light)' : 'var(--clay-fg)',
          }}>
            Hookframe
          </span>
        </button>

        {/* Tabs */}
        <nav aria-label="Main navigation" style={{
          marginLeft: isMobile ? 0 : 6,
          display: 'flex', gap: 4,
          padding: 4, borderRadius: 14,
          background: dark ? 'rgba(20,15,35,0.60)' : 'var(--clay-input-bg)',
          boxShadow: 'var(--shadow-clay-pressed)',
        }}>
          {[
            { id: 'generator', label: 'Generate', icon: 'sparkles' },
            { id: 'history',   label: 'History',  icon: 'history'  },
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === 'generator') { setGenerateView('form'); navigate('/generate'); }
                  else navigate('/history');
                }}
                aria-current={active ? 'page' : undefined}
                className={`clay-tab${active ? ' is-active' : ''}`}
                style={{ height: 34 }}
              >
                <Icon name={t.icon} size={14} />
                <span className="nav-tab-label">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Credits pill */}
        <div
          className="clay-pill surface-2"
          aria-label={`${credits ?? '…'} credits remaining`}
          style={{
            height: 34, padding: '0 12px',
            color: credits === 0 ? '#EF4444' : dark ? 'var(--clay-accent-light)' : 'var(--clay-fg)',
            transition: 'color 300ms',
          }}
        >
          <Icon name="bolt" size={13} />
          <span style={{ fontWeight: 800 }}>{credits ?? '…'}</span>
          <span className="nav-credits-label" style={{ color: 'var(--clay-muted)', fontWeight: 600 }}>
            credits
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
          className="theme-toggle"
          style={{ width: 38, height: 38, borderRadius: 12 }}
        >
          <Icon name={dark ? 'sun' : 'moon'} size={16} />
        </button>

        {/* User avatar → dropdown trigger */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="User menu"
            style={{
              width: 34, height: 34, borderRadius: 11, border: 0, padding: 0,
              background: 'linear-gradient(135deg,#F472B6,#7C3AED)',
              color: '#fff', fontFamily: 'Nunito', fontWeight: 900, fontSize: 14,
              cursor: 'pointer', flexShrink: 0,
              boxShadow: menuOpen ? 'var(--shadow-clay-button)' : 'var(--shadow-clay-soft)',
              transition: 'box-shadow 200ms, transform 200ms',
              transform: menuOpen ? 'scale(0.94)' : 'scale(1)',
            }}
          >
            {(user?.name ?? 'A').slice(0, 1).toUpperCase()}
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                width: 256,
                background: dark ? 'rgba(22, 17, 36, 0.97)' : 'rgba(252, 250, 255, 0.98)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                border: `1px solid ${dark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.12)'}`,
                borderRadius: 20,
                boxShadow: dark
                  ? '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
                  : '0 20px 60px rgba(100,80,160,0.18), 0 4px 12px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                zIndex: 200,
                transformOrigin: 'top right',
                animation: 'dropdown-in 200ms cubic-bezier(.2,.8,.3,1) both',
              }}
            >
              {/* User info header */}
              <div style={{
                padding: '16px',
                background: dark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)',
                borderBottom: `1px solid ${dark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.1)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: 'linear-gradient(135deg,#F472B6,#7C3AED)',
                    display: 'grid', placeItems: 'center',
                    color: '#fff', fontFamily: 'Nunito', fontWeight: 900, fontSize: 18,
                    boxShadow: '0 4px 12px rgba(124,58,237,0.35)',
                  }}>
                    {(user?.name ?? 'A').slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div className="font-display" style={{
                      fontWeight: 800, fontSize: 15,
                      color: 'var(--clay-fg)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {user?.name ?? 'User'}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--clay-muted)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}>
                      {user?.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Accent colour */}
              <div style={{ padding: '14px 16px 10px' }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: 'var(--clay-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
                }}>
                  Accent colour
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAccent(a.id)}
                      aria-label={a.label}
                      title={a.label}
                      style={{
                        width: 28, height: 28, borderRadius: 99,
                        background: a.color, border: 0, cursor: 'pointer', flexShrink: 0,
                        boxShadow: accent === a.id
                          ? `0 0 0 3px ${dark ? 'rgba(22,17,36,0.97)' : 'rgba(252,250,255,0.98)'}, 0 0 0 5px ${a.color}`
                          : `0 3px 8px ${a.color}66`,
                        transition: 'box-shadow 150ms, transform 150ms',
                        transform: accent === a.id ? 'scale(1.18)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Animated background toggle */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px 14px',
                borderBottom: `1px solid ${dark ? 'rgba(124,58,237,0.12)' : 'rgba(0,0,0,0.07)'}`,
              }}>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--clay-fg)',
                }}>
                  Animated background
                </span>
                <button
                  role="switch"
                  aria-checked={showBlobs}
                  aria-label="Toggle animated background"
                  onClick={() => setShowBlobs(!showBlobs)}
                  style={{
                    width: 44, height: 24, borderRadius: 99,
                    background: showBlobs ? 'var(--clay-accent)' : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'),
                    border: 0, padding: '3px', cursor: 'pointer',
                    position: 'relative', transition: 'background 200ms',
                    flexShrink: 0,
                  }}
                >
                  <div className="knob" style={{
                    width: 18, height: 18, borderRadius: 99,
                    position: 'absolute', top: 3,
                    left: showBlobs ? 23 : 3,
                    transition: 'left 200ms cubic-bezier(.2,.8,.3,1)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                  }} />
                </button>
              </div>

              {/* Logout */}
              <div style={{ padding: '8px' }}>
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); logout(); navigate('/auth'); }}
                  style={{
                    width: '100%', padding: '11px 12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    border: '1px solid rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.06)',
                    cursor: 'pointer',
                    color: '#EF4444',
                    fontFamily: 'Nunito', fontWeight: 800, fontSize: 14,
                    borderRadius: 12, textAlign: 'left',
                    transition: 'background 150ms, border-color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.14)';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
                  }}
                >
                  <Icon name="logout" size={16} />
                  Log out
                </button>
              </div>

              <style>{`
                @keyframes dropdown-in {
                  from { opacity: 0; transform: scale(0.94) translateY(-6px); }
                  to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
