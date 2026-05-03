import { useEffect } from 'react';
import useAppStore from './store/useAppStore';
import type { Accent } from './store/useAppStore';
import BlobField from './components/BlobField';
import AuthScreen from './components/AuthScreen';
import TopNav from './components/TopNav';
import Generator from './components/Generator';
import Loading from './components/Loading';
import Results from './components/Results';
import History from './components/History';
import ToastContainer from './components/ToastContainer';
import Icon from './components/Icon';

const ACCENT_PRESETS: Record<Accent, { main: string; light: string; pink: string }> = {
  violet: { main: '#7C3AED', light: '#A78BFA', pink: '#DB2777' },
  blue:   { main: '#0EA5E9', light: '#7DD3FC', pink: '#3B82F6' },
  pink:   { main: '#DB2777', light: '#F472B6', pink: '#A78BFA' },
  green:  { main: '#10B981', light: '#6EE7B7', pink: '#0EA5E9' },
  amber:  { main: '#F59E0B', light: '#FCD34D', pink: '#DB2777' },
};

export default function App() {
  const { screen, theme, accent, showBlobs } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const a = ACCENT_PRESETS[accent] ?? ACCENT_PRESETS.violet;
    document.documentElement.style.setProperty('--clay-accent',       a.main);
    document.documentElement.style.setProperty('--clay-accent-light', a.light);
    document.documentElement.style.setProperty('--clay-accent-pink',  a.pink);
  }, [accent]);

  const showShell = screen !== 'auth';

  return (
    <>
      {showBlobs && <BlobField />}

      {!showShell ? (
        <AuthScreen />
      ) : (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <TopNav />

          {/* key forces re-mount → screen-enter animation plays on every navigation */}
          <main key={screen} className="page-main" style={{ flex: 1 }}>
            {screen === 'generator' && <Generator />}
            {screen === 'loading'   && <Loading />}
            {screen === 'results'   && <Results />}
            {screen === 'history'   && <History />}
          </main>

          <AppFooter />
        </div>
      )}

      <ToastContainer />
    </>
  );
}

function AppFooter() {
  return (
    <footer className="page-footer">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px', color: 'var(--clay-muted)', fontSize: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="sparkles" size={13} />
          © 2026 Hookframe
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          {['Docs', 'Changelog', 'Support'].map((l) => (
            <a
              key={l}
              href="#"
              style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, transition: 'color 150ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--clay-accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--clay-muted)')}
            >
              {l}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
