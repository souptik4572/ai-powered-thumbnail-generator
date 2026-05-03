import { useState } from 'react';
import type { ReactNode, FormEvent } from 'react';
import useAppStore from '../store/useAppStore';
import { loginUser, registerUser } from '../api';
import Icon from './Icon';
import FauxThumbnail from './FauxThumbnail';

export default function AuthScreen() {
  const { login, toggleTheme, theme } = useAppStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === 'login';

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        const res = await loginUser({ email, password: pw });
        login({ email, name: email.split('@')[0] }, res.jwt_token);
      } else {
        const res = await registerUser({ email, password: pw, name: name || email.split('@')[0] });
        login({ email, name: name || email.split('@')[0] }, res.jwt_token);
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-grid">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title="Toggle theme"
        className="theme-toggle"
        style={{ position: 'absolute', top: 36, right: 36, zIndex: 10 }}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
      </button>

      {/* LEFT: brand */}
      <div className="auth-brand clay-card screen-enter" style={{
        borderRadius: 48, padding: '48px 56px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(244,114,182,0.18))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg,var(--clay-accent-light),var(--clay-accent))',
            display: 'grid', placeItems: 'center', color: '#fff',
            boxShadow: 'var(--shadow-clay-button)',
          }}>
            <Icon name="sparkles" size={22} stroke={2.4} />
          </div>
          <div className="font-display" style={{ fontWeight: 900, fontSize: 22 }}>Hookframe</div>
        </div>

        <div>
          <h1 className="font-display gradient-text" style={{
            fontSize: 60, lineHeight: 1, fontWeight: 900,
            margin: 0, letterSpacing: '-0.03em',
          }}>
            Drop a selfie.<br />Ship a banger thumbnail.
          </h1>
          <p style={{ marginTop: 20, fontSize: 17, color: 'var(--clay-muted)', maxWidth: 460, lineHeight: 1.55 }}>
            A headshot and a one-line idea become click-worthy YouTube thumbnails — in under a minute.
          </p>
        </div>

        <div style={{
          position: 'relative', height: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ animation: 'clay-float 9s ease-in-out infinite', transform: 'rotate(-2deg)' }}>
            <FauxThumbnail
              size="md"
              style="tutorial"
              data={{ headline: 'LEARN FASTAPI', sub: 'BUILD APIs FAST', accent: '#10B981', bg: 'linear-gradient(135deg,#0F172A,#134E4A)' }}
            />
          </div>
        </div>
      </div>

      {/* RIGHT: form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <div className="clay-card screen-enter" style={{ width: '100%', maxWidth: 440, padding: 40 }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', gap: 8, padding: 6, borderRadius: 16,
            background: 'var(--clay-input-bg)', boxShadow: 'var(--shadow-clay-pressed)',
            marginBottom: 28,
          }}>
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`clay-btn ${mode === m ? 'surface-1' : ''}`}
                style={{
                  flex: 1, height: 44, fontSize: 14, padding: 0,
                  background: mode === m ? undefined : 'transparent',
                  color: mode === m ? 'var(--clay-fg)' : 'var(--clay-muted)',
                  boxShadow: mode === m ? 'var(--shadow-clay-soft)' : 'none',
                }}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <h2 className="font-display" style={{ fontSize: 32, margin: 0, fontWeight: 900 }}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--clay-muted)', marginTop: 8, marginBottom: 28, fontSize: 15 }}>
            {isLogin ? 'Pick up where you left off.' : 'Free forever — 5 generations a day.'}
          </p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={{ marginBottom: 16 }}>
                <FormLabel icon="user">Full name</FormLabel>
                <input
                  className="clay-input"
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <FormLabel icon="mail">Email</FormLabel>
              <input
                type="email"
                className="clay-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <FormLabel icon="lock">Password</FormLabel>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="clay-input"
                  placeholder="••••••••••"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  style={{ paddingRight: 52 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    border: 0, background: 'transparent', color: 'var(--clay-muted)', cursor: 'pointer', padding: 8,
                  }}
                >
                  <Icon name={showPw ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            {isLogin && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                <a href="#" style={{ color: 'var(--clay-accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: 16, fontSize: 13, color: '#DC2626', fontWeight: 600, textAlign: 'center' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="clay-btn clay-btn-primary"
              style={{ width: '100%', height: 60, fontSize: 16, marginTop: isLogin ? 0 : 24 }}
            >
              {loading ? (
                <>
                  <Icon name="loader" size={18} className="spinning" />
                  {isLogin ? 'Logging in…' : 'Creating account…'}
                </>
              ) : (
                <>
                  {isLogin ? 'Log in' : 'Create account'}
                  <Icon name="arrow" size={18} />
                </>
              )}
            </button>
          </form>
          <style>{`.spinning { animation: spin-slow 0.8s linear infinite; }`}</style>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '24px 0', color: 'var(--clay-muted)', fontSize: 12,
            fontWeight: 700, letterSpacing: 0.06, textTransform: 'uppercase',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--clay-divider)' }} />
            or
            <div style={{ flex: 1, height: 1, background: 'var(--clay-divider)' }} />
          </div>

          <button
            disabled
            className="clay-btn clay-btn-secondary"
            style={{ width: '100%', height: 56, opacity: 0.5, cursor: 'not-allowed' }}
          >
            <Icon name="google" size={20} stroke={0} /> Continue with Google
          </button>

          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--clay-muted)', textAlign: 'center' }}>
            By continuing you agree to the{' '}
            <a href="#" style={{ color: 'var(--clay-accent)', textDecoration: 'none', fontWeight: 700 }}>Terms</a>
            {' '}and{' '}
            <a href="#" style={{ color: 'var(--clay-accent)', textDecoration: 'none', fontWeight: 700 }}>Privacy</a>.
          </p>
        </div>
      </div>

    </div>
  );
}

function FormLabel({ children, icon }: { children: ReactNode; icon?: string }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 13, fontWeight: 800, color: 'var(--clay-fg)',
      marginBottom: 8, fontFamily: 'Nunito',
    }}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </label>
  );
}
