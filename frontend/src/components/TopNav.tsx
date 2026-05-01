import useAppStore from '../store/useAppStore';
import Icon from './Icon';

export default function TopNav() {
  const { screen, setScreen, user, logout, theme, toggleTheme } = useAppStore();
  const dark = theme === 'dark';

  const activeTab = screen === 'loading' || screen === 'results' ? 'generator' : screen;

  return (
    <header style={{ padding: '20px 32px 0', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      <div className="clay-card" style={{
        display: 'flex', alignItems: 'center',
        padding: '12px 18px', borderRadius: 28, gap: 14,
      }}>
        {/* Logo */}
        <button
          onClick={() => setScreen('generator')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg,var(--clay-accent-light),var(--clay-accent))',
            display: 'grid', placeItems: 'center', color: '#fff',
            boxShadow: 'var(--shadow-clay-button)',
          }}>
            <Icon name="sparkles" size={20} stroke={2.4} />
          </div>
          <div className="font-display" style={{
            fontWeight: 900, fontSize: 18, lineHeight: 1,
            color: dark ? 'var(--clay-accent-light)' : 'var(--clay-fg)',
          }}>Hookframe</div>
        </button>

        {/* Tabs */}
        <nav style={{
          marginLeft: 8, display: 'flex', gap: 4,
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
                  height: 36, padding: '0 14px', border: 0, borderRadius: 11,
                  fontFamily: 'Nunito', fontWeight: 800, fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: active ? undefined : 'transparent',
                  color: active ? 'var(--clay-fg)' : 'var(--clay-muted)',
                  boxShadow: active ? 'var(--shadow-clay-soft)' : 'none',
                  transition: 'all 200ms',
                }}
              >
                <Icon name={t.icon} size={14} /> {t.label}
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
            color: dark ? 'var(--clay-accent-light)' : 'var(--clay-fg)',
          }}
        >
          <Icon name="bolt" size={13} />
          <span style={{ fontWeight: 800 }}>24</span>
          <span style={{ color: 'var(--clay-muted)', fontWeight: 600 }}>credits</span>
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
            width: 40, height: 40, borderRadius: 12, border: 0, padding: 0,
            background: 'linear-gradient(135deg,#F472B6,#7C3AED)',
            color: '#fff', fontFamily: 'Nunito', fontWeight: 900, fontSize: 14,
            cursor: 'pointer', boxShadow: 'var(--shadow-clay-soft)',
          }}
        >
          {(user?.name ?? 'A').slice(0, 1).toUpperCase()}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title="Log out"
          className="theme-toggle"
          style={{ width: 40, height: 40, borderRadius: 12, color: 'var(--clay-muted)' }}
        >
          <Icon name="logout" size={16} />
        </button>
      </div>
    </header>
  );
}
