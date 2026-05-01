// Auth, Dashboard Home, New Session screens — Light theme
const { useState, useEffect, useRef, useCallback } = React;

// ─── Auth Screen ────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => onLogin(), 900);
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg0, backgroundImage: 'radial-gradient(at 0% 0%, rgba(0,105,76,0.05) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(55,138,221,0.05) 0px, transparent 50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.font, padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <img src="logo.png" alt="Content Studio" style={{ width: 72, height: 72, borderRadius: 16, marginBottom: 14, objectFit: 'cover' }} />
          <h1 style={{ fontSize: 26, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em' }}>Content Studio</h1>
          <p style={{ fontSize: 14, color: T.fg3, marginTop: 4 }}>Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div style={{ background: T.bg2, borderRadius: T.r4, boxShadow: T.shadow3, padding: '32px 36px', border: `1px solid ${T.fg4}30` }}>
          {/* Google button */}
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', height: 48, background: T.bg2, border: `1px solid ${T.fg4}`, borderRadius: T.r1, cursor: 'pointer', fontFamily: T.font, fontSize: 14, fontWeight: 500, color: T.fg, transition: `all ${T.fast}`, marginBottom: 20 }}
            onMouseEnter={e => e.currentTarget.style.background = T.bg3}
            onMouseLeave={e => e.currentTarget.style.background = T.bg2}
            onClick={() => { setLoading(true); setTimeout(() => onLogin(), 600); }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: `${T.fg4}60` }} />
            <span style={{ fontSize: 12, color: T.fg3 }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: `${T.fg4}60` }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: T.fg, marginBottom: 6, display: 'block' }}>Email address</label>
              <input style={patterns.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                onFocus={e => Object.assign(e.target.style, patterns.inputFocus)}
                onBlur={e => { e.target.style.borderColor = T.fg4; e.target.style.boxShadow = 'none'; }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>Password</label>
                <span style={{ fontSize: 12, color: T.primary, fontWeight: 500, cursor: 'pointer' }}>Forgot?</span>
              </div>
              <input style={patterns.input} type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Your password"
                onFocus={e => Object.assign(e.target.style, patterns.inputFocus)}
                onBlur={e => { e.target.style.borderColor = T.fg4; e.target.style.boxShadow = 'none'; }} />
            </div>
            <button type="submit" style={{ ...patterns.btnPrimary, width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15, borderRadius: T.r2, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In to Workspace'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: T.fg2 }}>
            Don't have an account? <span style={{ color: T.fg, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setLoading(true); setTimeout(() => onLogin(), 600); }}>Create one</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Home (Hub) ───────────────────────────
const MOCK_SESSIONS = [
  { id: 1, title: 'AI in Healthcare: 2026 Trends', status: 'published', date: 'Apr 28', channels: ['Blog', 'LinkedIn', 'X'], score: 94 },
  { id: 2, title: 'Complete Guide to RAG Architecture', status: 'review', date: 'Apr 27', channels: ['Blog', 'Newsletter'], score: 87 },
  { id: 3, title: '10 Productivity Hacks for Remote Teams', status: 'draft', date: 'Apr 26', channels: ['Blog', 'Medium'], score: 72 },
  { id: 4, title: 'Why Your SaaS Needs a Content Flywheel', status: 'scheduled', date: 'Apr 25', channels: ['Blog', 'X', 'LinkedIn', 'Newsletter'], score: 91 },
  { id: 5, title: 'Zero to 10k: Organic Growth Playbook', status: 'published', date: 'Apr 23', channels: ['Blog'], score: 88 },
];

const statusColors = {
  published: { bg: T.successMuted, fg: T.success },
  review: { bg: T.warningMuted, fg: T.warning },
  draft: { bg: `${T.fg3}18`, fg: T.fg3 },
  scheduled: { bg: T.infoMuted, fg: T.info },
};

const QUICK_STATS = [
  { label: 'Articles This Month', value: '23', change: '+12%', icon: 'FileText' },
  { label: 'Organic Traffic', value: '14.2k', change: '+28%', icon: 'TrendingUp' },
  { label: 'Avg. SEO Score', value: '87', change: '+4', icon: 'Target' },
  { label: 'Credits Left', value: '842', change: '', icon: 'Zap' },
];

function DashboardHome({ onNavigate, onOpenSession }) {
  const [hoveredSession, setHoveredSession] = useState(null);
  const [hoveredStat, setHoveredStat] = useState(null);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', lineHeight: 1.2 }}>Content Studio Hub</h1>
        <p style={{ fontSize: 16, color: T.fg2, marginTop: 6, lineHeight: 1.5 }}>Real-time status of your intelligence engine and content pipeline.</p>
      </div>

      {/* Stats — Bento */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '28px 0' }}>
        {QUICK_STATS.map((s, i) => {
          const IconComp = Icons[s.icon];
          return (
            <div key={i}
              style={{ ...patterns.card, padding: '20px 22px', cursor: 'default', transition: `all ${T.med}`, ...(hoveredStat === i ? patterns.cardHover : {}) }}
              onMouseEnter={() => setHoveredStat(i)} onMouseLeave={() => setHoveredStat(null)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.fg3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
                <div style={{ color: i === 1 ? T.secondary : T.primary, opacity: 0.7 }}>{IconComp && <IconComp size={18} />}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em' }}>{s.value}</span>
                {s.change && <span style={{ fontSize: 12, fontWeight: 600, color: T.primary, display: 'flex', alignItems: 'center', gap: 2 }}><Icons.TrendingUp size={12} /> {s.change}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
        {[
          { label: 'New from Topic', icon: 'Sparkles', page: 'new-session' },
          { label: 'Upload Article', icon: 'Upload', page: 'new-session' },
          { label: 'Repurpose URL', icon: 'Link', page: 'new-session' },
          { label: 'Data Pipeline', icon: 'Database', page: 'new-session' },
        ].map((a, i) => {
          const IconComp = Icons[a.icon];
          return (
            <button key={i} style={{ ...patterns.btnSecondary, flex: 1, justifyContent: 'center', padding: '12px 16px', fontSize: '13px' }}
              onClick={() => onNavigate(a.page)}
              onMouseEnter={e => { e.currentTarget.style.background = T.bg3; e.currentTarget.style.borderColor = T.fg3; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.bg2; e.currentTarget.style.borderColor = T.fg4; }}>
              {IconComp && <IconComp size={16} />}
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Recent Sessions */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: T.fg }}>Recent Sessions</h2>
        <button style={{ background: 'none', border: 'none', color: T.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>View all</button>
      </div>
      <div style={{ ...patterns.card, overflow: 'hidden' }}>
        {MOCK_SESSIONS.map((session, i) => {
          const sc = statusColors[session.status];
          return (
            <div key={session.id}
              style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', gap: 16, borderBottom: i < MOCK_SESSIONS.length - 1 ? `1px solid ${T.fg4}30` : 'none', cursor: 'pointer', background: hoveredSession === session.id ? T.bg3 : 'transparent', transition: `background ${T.fast}` }}
              onMouseEnter={() => setHoveredSession(session.id)}
              onMouseLeave={() => setHoveredSession(null)}
              onClick={() => onOpenSession(session)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.fg, marginBottom: 4 }}>{session.title}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {session.channels.map(ch => (
                    <span key={ch} style={{ fontSize: 11, color: T.fg2, background: T.bg4, padding: '2px 8px', borderRadius: 100, fontWeight: 500 }}>{ch}</span>
                  ))}
                </div>
              </div>
              <span style={{ ...patterns.badge, background: sc.bg, color: sc.fg, textTransform: 'capitalize', fontWeight: 600, fontSize: 11 }}>{session.status}</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: session.score >= 85 ? T.primary : session.score >= 70 ? T.warning : T.fg3, width: 32, textAlign: 'right' }}>{session.score}</div>
              <span style={{ fontSize: 12, color: T.fg3, width: 56, textAlign: 'right' }}>{session.date}</span>
              <Icons.ChevronRight size={16} stroke={T.fg4} />
            </div>
          );
        })}
      </div>

      {/* AI Insight Bar */}
      <div style={{ marginTop: 28, background: 'linear-gradient(to right, rgba(29,158,117,0.05), rgba(55,138,221,0.05))', border: `1px solid rgba(29,158,117,0.2)`, borderRadius: T.r4, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,105,76,0.25)', flexShrink: 0 }}>
          <Icons.Sparkles size={20} stroke="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.primary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>AI Insight Engine</p>
          <p style={{ fontSize: 14, color: T.fg, lineHeight: 1.5 }}>Your "RAG Architecture" guide is trending +15% in organic clicks. Consider creating a follow-up pillar page on "Vector Databases" to capture related traffic.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button style={{ ...patterns.btnSecondary, padding: '8px 16px', fontSize: 13 }}>Apply Strategy</button>
          <button style={{ ...patterns.btnPrimary, padding: '8px 16px', fontSize: 13 }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

// ─── New Session ─────────────────────────────────────
function NewSessionScreen({ onNavigate, onStartSession }) {
  const [tab, setTab] = useState('topic');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('authority');
  const [keywords, setKeywords] = useState('');
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleCreate = () => {
    setGenerating(true);
    setTimeout(() => onStartSession({ topic: topic || 'AI-Powered Content Marketing', audience, tone, keywords }), 1200);
  };

  const tabs = [
    { id: 'topic', label: 'Start from Topic', icon: 'Sparkles' },
    { id: 'upload', label: 'Upload Article', icon: 'Upload' },
    { id: 'url', label: 'Repurpose URL', icon: 'Link' },
    { id: 'data', label: 'Data Pipeline', icon: 'Database' },
  ];

  const focusInput = (e) => Object.assign(e.target.style, patterns.inputFocus);
  const blurInput = (e) => { e.target.style.borderColor = T.fg4; e.target.style.boxShadow = 'none'; };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 720 }}>
      <button style={{ background: 'none', border: 'none', color: T.fg3, fontSize: 13, cursor: 'pointer', fontFamily: T.font, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24, padding: 0 }}
        onClick={() => onNavigate('dashboard')}>
        <Icons.ChevronLeft size={16} /> Back to Hub
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', marginBottom: 6 }}>Create New Session</h1>
      <p style={{ fontSize: 14, color: T.fg2, marginBottom: 28 }}>Start with a topic, upload existing content, or paste a URL to repurpose.</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: T.bg4, borderRadius: T.r2, padding: 4 }}>
        {tabs.map(t => {
          const IconComp = Icons[t.icon];
          return (
            <button key={t.id}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 12px', borderRadius: T.r1, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, fontFamily: T.font, background: tab === t.id ? T.bg2 : 'transparent', color: tab === t.id ? T.fg : T.fg3, transition: `all ${T.fast}`, boxShadow: tab === t.id ? T.shadow1 : 'none' }}
              onClick={() => setTab(t.id)}>
              {IconComp && <IconComp size={15} />} {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'topic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.fg2, marginBottom: 6, display: 'block' }}>Topic</label>
            <input style={patterns.input} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. AI-powered content marketing strategies for SaaS" onFocus={focusInput} onBlur={blurInput} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.fg2, marginBottom: 6, display: 'block' }}>Target Audience</label>
            <input style={patterns.input} value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Marketing managers at B2B SaaS companies" onFocus={focusInput} onBlur={blurInput} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.fg2, marginBottom: 6, display: 'block' }}>Tone</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['authority', 'casual', 'storytelling'].map(t => (
                <button key={t} style={{ flex: 1, padding: '10px', borderRadius: T.r1, border: `1px solid ${tone === t ? T.primary : T.fg4}`, background: tone === t ? T.primaryMuted : T.bg2, color: tone === t ? T.primary : T.fg2, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: T.font, textTransform: 'capitalize', transition: `all ${T.fast}` }}
                  onClick={() => setTone(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.fg2, marginBottom: 6, display: 'block' }}>Keywords <span style={{ color: T.fg3, fontWeight: 400 }}>(optional)</span></label>
            <input style={patterns.input} value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="content marketing, seo, ai writing" onFocus={focusInput} onBlur={blurInput} />
          </div>
        </div>
      )}

      {tab === 'url' && (
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: T.fg2, marginBottom: 6, display: 'block' }}>Paste a URL to repurpose</label>
          <input style={patterns.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/blog/article-to-repurpose" onFocus={focusInput} onBlur={blurInput} />
          <p style={{ fontSize: 12, color: T.fg3, marginTop: 8 }}>We'll extract content from blog posts, YouTube videos, podcasts, and more.</p>
        </div>
      )}

      {tab === 'upload' && (
        <div style={{ border: `2px dashed ${T.fg4}`, borderRadius: T.r3, padding: '48px 32px', textAlign: 'center', cursor: 'pointer', transition: `border-color ${T.fast}` }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.fg4}>
          <Icons.Upload size={32} stroke={T.fg3} />
          <p style={{ fontSize: 14, color: T.fg2, marginTop: 12 }}>Drop a file here, or click to browse</p>
          <p style={{ fontSize: 12, color: T.fg3, marginTop: 4 }}>Supports .md, .txt, .pdf, .docx</p>
        </div>
      )}

      {tab === 'data' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 14, color: T.fg2, marginBottom: 4 }}>Generate content from structured data sources.</p>
          {['Google Analytics Report', 'Search Console Data', 'CSV / Spreadsheet', 'API Endpoint'].map(src => (
            <div key={src} style={{ ...patterns.card, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: `all ${T.fast}` }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = T.shadow3}
              onMouseLeave={e => e.currentTarget.style.boxShadow = T.shadow2}>
              <span style={{ fontSize: 14, color: T.fg }}>{src}</span>
              <Icons.ChevronRight size={16} stroke={T.fg3} />
            </div>
          ))}
        </div>
      )}

      <button style={{ ...patterns.btnPrimary, width: '100%', justifyContent: 'center', marginTop: 28, padding: '14px', fontSize: 15, opacity: generating ? 0.7 : 1 }}
        onClick={handleCreate}>
        {generating ? (
          <><Icons.RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating brief…</>
        ) : (
          <><Icons.Sparkles size={16} /> Create Session</>
        )}
      </button>
    </div>
  );
}

Object.assign(window, { AuthScreen, DashboardHome, NewSessionScreen, statusColors });
