import Icon from './Icon';

interface FauxThumbnailProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: string;
  headshot?: string | null;
  data?: {
    headline?: string;
    sub?: string;
    accent?: string;
    bg?: string;
    dark?: boolean;
  };
}

const SIZES = {
  sm:  { w: 220, h: 124, head: 40,  title: 22, sub: 9,  badge: 18 },
  md:  { w: 320, h: 180, head: 56,  title: 32, sub: 11, badge: 22 },
  lg:  { w: 480, h: 270, head: 90,  title: 50, sub: 16, badge: 30 },
  xl:  { w: 640, h: 360, head: 120, title: 64, sub: 20, badge: 38 },
};

export default function FauxThumbnail({ data, headshot, size = 'md', style = 'bold' }: FauxThumbnailProps) {
  const s = SIZES[size];
  const accent = data?.accent ?? '#10B981';
  const bg = data?.bg ?? 'linear-gradient(135deg,#0F172A 0%,#134E4A 100%)';
  const dark = data?.dark !== false;
  const textColor = dark ? '#fff' : '#1F2937';

  return (
    <div style={{
      width: s.w, height: s.h, background: bg, borderRadius: 18,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 12px 30px rgba(20,15,40,0.25)',
      flexShrink: 0,
    }}>
      {/* Style badge */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        padding: '4px 10px', borderRadius: 9999,
        background: 'rgba(0,0,0,0.55)', color: '#fff',
        fontSize: s.sub, fontWeight: 700, letterSpacing: 0.4,
        textTransform: 'uppercase', fontFamily: 'Nunito',
      }}>
        {(style ?? 'bold').toUpperCase()}
      </div>

      {/* Accent radial */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 80% 90%, ${accent}55 0%, transparent 60%)`,
      }} />

      {/* Headline */}
      <div style={{
        position: 'absolute',
        left: s.h * 0.06, top: s.h * 0.18, right: '45%',
        color: textColor, fontFamily: 'Nunito', fontWeight: 900,
        fontSize: s.title, lineHeight: 0.95,
      }}>
        <div style={{ color: accent }}>{data?.headline?.split(' ')[0] ?? 'BIG'}</div>
        <div style={{ color: textColor }}>{data?.headline?.split(' ').slice(1).join(' ') ?? 'TITLE'}</div>
      </div>

      {/* Sub-line */}
      <div style={{
        position: 'absolute',
        left: s.h * 0.06, bottom: s.h * 0.18,
        fontFamily: 'Nunito', fontWeight: 800, fontSize: s.sub,
        color: textColor, background: accent,
        padding: '3px 8px', borderRadius: 4,
        letterSpacing: 0.5, textTransform: 'uppercase',
      }}>
        {data?.sub ?? 'SUBTITLE GOES HERE'}
      </div>

      {/* Headshot cutout */}
      <div style={{
        position: 'absolute', right: s.h * 0.04, bottom: 0,
        width: '44%', height: '92%',
        background: headshot
          ? `url(${headshot}) center/cover no-repeat`
          : 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
        borderRadius: '50% 50% 12px 12px / 35% 35% 12px 12px',
        overflow: 'hidden',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
        {!headshot && (
          <div style={{ marginBottom: 8, color: 'rgba(255,255,255,0.7)', fontSize: s.sub * 0.9, fontFamily: 'monospace' }}>
            headshot
          </div>
        )}
      </div>

      {/* Corner badge */}
      <div style={{
        position: 'absolute', right: 10, top: 10,
        width: s.badge, height: s.badge, borderRadius: 6,
        background: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: dark ? '#0F172A' : '#fff',
        boxShadow: `0 4px 12px ${accent}88`,
      }}>
        <Icon name="bolt" size={s.badge * 0.6} stroke={2.5} />
      </div>
    </div>
  );
}
