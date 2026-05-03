import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import Icon from './Icon';
import { getCredits } from '../api';
import { useBreakpoint } from '../hooks/useBreakpoint';

export default function TopNav() {
  const { screen, setScreen, user, logout, theme, toggleTheme, token, credits, setCredits } = useAppStore();
  const { isMobile } = useBreakpoint();
  const dark = theme === 'dark';

  useEffect(() => {
    if (!token) return;
    getCredits(token).then((data) => setCredits(data.credits)).catch(() => {});
  }, [token, screen]);

  const activeTab = screen === 'loading' || screen === 'results' ? 'generator' : screen;

  return (
    <header className="nav-header">
      <div className="clay-card" style={{
        display: 'flex', alignItems: 'center',
        padding: isMobile ? '8px 12px' : '12px 18px',
        borderRadius: isMobile ? 20 : 28,
        gap: isMobile ? 8 : 14,
      }}>
        {/* Logo */}
        <button
          onClick={() => setScreen('generator')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'linear-gradient(135deg,var(--clay-accent-light),var(--clay-accent))',
            display: 'grid', placeItems: 'center', color: '#fff',
            flexShrink: 0,
            boxShadow: 'var(--shadow-clay-button)',
          }}>
            <Icon name="sparkles" size={18} stroke={2.4} />
          </div>
          <span className="nav-brand-name font-display" style={{
            fontWeight: 900, fontSize: 18, lineHeight: 1,
            color: dark ? 'var(--clay-accent-light)' : 'var(--clay-fg)',
          }}>Hookframe</span>
        </button>

        {/* Tabs */}
        <nav style={{
          marginLeft: isMobile ? 0 : 8, display: 'flex', gap: 4,
          padding: 4, borderRadius: 14,
          background: dark ? 'rgba(20,15,35,0.6)' : 'var(--clay-input-bg)',
          boxShadow: 'var(--shadow-clay-pressed)',
        }}>
          {[
            { id: 'generator', label: 'Generator', icon: 'sparkles' },
            { id: 'history', label: 'History', icon: 'history' },
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setScreen(t.id as any)}
                className={active ? 'surface-1' : ''}
                style={{
                  height: 36, padding: isMobile ? '0 10px' : '0 14px', border: 0, borderRadius: 11,
                  fontFamily: 'Nunito', fontWeight: 800, fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: active ? undefined : 'transparent',
                  color: active ? 'var(--clay-fg)' : 'var(--clay-muted)',
                  boxShadow: active ? 'var(--shadow-clay-soft)' : 'none',
                  transition: 'all 200ms',
                }}
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
          style={{
            height: 36, padding: '0 12px',
            color: credits === 0
              ? '#DC2626'
              : dark ? 'var(--clay-accent-light)' : 'var(--clay-fg)',
          }}
        >
          <Icon name="bolt" size={13} />
          <span style={{ fontWeight: 800 }}>{credits ?? '…'}</span>
          <span className="nav-credits-label" style={{ color: 'var(--clay-muted)', fontWeight: 600 }}>credits</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="theme-toggle"
          style={{ width: 40, height: 40, borderRadius: 12 }}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
        </button>

        {/* User avatar */}
        <button
          title={user?.email ?? 'Account'}
          style={{
            width: 36, height: 36, borderRadius: 11, border: 0, padding: 0,
            background: 'linear-gradient(135deg,#F472B6,#7C3AED)',
            color: '#fff', fontFamily: 'Nunito', fontWeight: 900, fontSize: 14,
            cursor: 'pointer', flexShrink: 0, boxShadow: 'var(--shadow-clay-soft)',
          }}
        >
          {(user?.name ?? 'A').slice(0, 1).toUpperCase()}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title="Log out"
          className="theme-toggle"
          style={{ width: 36, height: 36, borderRadius: 11, color: 'var(--clay-muted)' }}
        >
          <Icon name="logout" size={16} />
        </button>
      </div>
    </header>
  );
}
