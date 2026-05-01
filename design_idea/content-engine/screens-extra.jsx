// Images, Social, Analytics, Calendar, Library, Brand Voice — Light theme
const { useState } = React;

// ─── Images Screen ───────────────────────────────────
function ImagesScreen({ session, onNavigate }) {
  const [selectedStyle, setSelectedStyle] = useState('minimal');
  const imageStyles = ['minimal', 'vibrant', 'editorial', 'abstract'];
  const mockImages = [
    { label: 'Blog Featured (1200×630)', ratio: '1200/630', color: 'linear-gradient(135deg, #e4eae4, #bccac1)' },
    { label: 'Twitter Card (1200×675)', ratio: '1200/675', color: 'linear-gradient(135deg, #d2e4ff, #a1c9ff)' },
    { label: 'LinkedIn Post (1200×627)', ratio: '1200/627', color: 'linear-gradient(135deg, #86f8c9, #68dbae)' },
    { label: 'Instagram (1080×1350)', ratio: '1080/1350', color: 'linear-gradient(135deg, #ffdad6, #ffb3ad)' },
  ];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', marginBottom: 4 }}>Images</h1>
          <p style={{ fontSize: 14, color: T.fg2 }}>AI-generated visuals for each platform</p>
        </div>
        <button style={patterns.btnPrimary} onClick={() => onNavigate('social-x')}>Continue to Distribute <Icons.ArrowRight size={16} /></button>
      </div>
      <PipelineStepper current="images" onNavigate={onNavigate} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {imageStyles.map(s => (
          <button key={s} style={{ padding: '8px 18px', borderRadius: 100, border: `1px solid ${selectedStyle === s ? T.primary : T.fg4}`, background: selectedStyle === s ? T.primaryMuted : T.bg2, color: selectedStyle === s ? T.primary : T.fg2, cursor: 'pointer', fontSize: 13, fontFamily: T.font, fontWeight: 500, textTransform: 'capitalize', transition: `all ${T.fast}` }}
            onClick={() => setSelectedStyle(s)}>{s}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={{ ...patterns.btnSecondary, fontSize: 13 }}><Icons.RefreshCw size={14} /> Regenerate All</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {mockImages.map((img, i) => (
          <div key={i} style={{ ...patterns.card, overflow: 'hidden' }}>
            <div style={{ aspectRatio: img.ratio, background: img.color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ textAlign: 'center' }}>
                <Icons.Image size={32} stroke={T.fg3} />
                <div style={{ fontSize: 12, color: T.fg2, marginTop: 8, fontFamily: T.mono }}>{selectedStyle} · AI-generated</div>
              </div>
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: T.fg2, fontWeight: 500 }}>{img.label}</span>
              <Icons.Check size={16} stroke={T.primary} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Social Distribution ─────────────────────────────
function SocialScreen({ session, onNavigate, channel }) {
  const channelNames = { 'social-x': 'X / Twitter', 'social-linkedin': 'LinkedIn', 'social-instagram': 'Instagram', 'social-newsletter': 'Newsletter', 'social-medium': 'Medium' };
  const name = channelNames[channel] || 'Distribution';
  const posts = [
    { id: 1, content: 'AI content marketing isn\'t about replacing writers—it\'s about amplifying them. Here\'s what we learned building a content engine that publishes 4x more while keeping quality above 85%.', scheduled: 'May 2, 9:00 AM', status: 'scheduled' },
    { id: 2, content: 'The math is simple: AI-assisted content = lower production costs + faster publishing + higher SEO scores = compounding organic traffic.', scheduled: 'May 2, 2:00 PM', status: 'draft' },
    { id: 3, content: 'Step 1 of building an AI content strategy: Audit what you have before generating what you don\'t.', scheduled: 'May 3, 9:00 AM', status: 'draft' },
  ];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', marginBottom: 4 }}>{name}</h1>
          <p style={{ fontSize: 14, color: T.fg2 }}>Generated posts from your article</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={patterns.btnSecondary}><Icons.RefreshCw size={15} /> Regenerate</button>
          <button style={patterns.btnPrimary}><Icons.Send size={15} /> Schedule All</button>
        </div>
      </div>
      <PipelineStepper current="social-x" onNavigate={onNavigate} />

      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {Object.entries(channelNames).map(([id, label]) => (
          <button key={id} style={{ padding: '7px 14px', borderRadius: 100, border: `1px solid ${channel === id ? T.primary : T.fg4}`, background: channel === id ? T.primaryMuted : T.bg2, color: channel === id ? T.primary : T.fg3, cursor: 'pointer', fontSize: 12, fontFamily: T.font, fontWeight: 500, transition: `all ${T.fast}` }}
            onClick={() => onNavigate(id)}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {posts.map(post => {
          const sc = statusColors[post.status] || statusColors.draft;
          return (
            <div key={post.id} style={{ ...patterns.card, padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ ...patterns.badge, background: sc.bg, color: sc.fg, textTransform: 'capitalize', fontWeight: 600, fontSize: 11 }}>{post.status}</span>
                <span style={{ fontSize: 12, color: T.fg3 }}>{post.scheduled}</span>
              </div>
              <p style={{ fontSize: 14, color: T.fg, lineHeight: 1.65, marginBottom: 14 }}>{post.content}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...patterns.btnSecondary, padding: '6px 12px', fontSize: 12 }}><Icons.PenTool size={13} /> Edit</button>
                <button style={{ ...patterns.btnSecondary, padding: '6px 12px', fontSize: 12 }}><Icons.Sparkles size={13} stroke={T.primary} /> Rewrite</button>
                <button style={{ ...patterns.btnSecondary, padding: '6px 12px', fontSize: 12 }}><Icons.Copy size={13} /> Copy</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Analytics ───────────────────────────────────────
function AnalyticsScreen() {
  const data = [
    { month: 'Nov', views: 4200 }, { month: 'Dec', views: 5800 }, { month: 'Jan', views: 7400 },
    { month: 'Feb', views: 9100 }, { month: 'Mar', views: 11600 }, { month: 'Apr', views: 14200 },
  ];
  const maxViews = Math.max(...data.map(d => d.views));

  const kpis = [
    { label: 'Overall Sentiment', value: '88.4', change: '12%', color: T.primary, bar: 88 },
    { label: 'Network Health', value: '94%', change: '4%', color: T.secondary, bar: 94 },
    { label: 'Engagement Delta', value: '+22.5k', change: 'High', color: '#993f3a', bar: null },
  ];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', marginBottom: 4 }}>Analytics &amp; Insights</h1>
          <p style={{ fontSize: 16, color: T.fg2, lineHeight: 1.5 }}>Real-time performance intelligence and persona resonance mapping.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={patterns.btnSecondary}><Icons.Calendar size={16} /> Last 30 Days</button>
          <button style={patterns.btnPrimary}><Icons.Copy size={16} /> Export PDF</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...patterns.card, padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.fg2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: k.color }}>{k.value}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.primary, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Icons.TrendingUp size={13} /> {k.change}
              </span>
            </div>
            {k.bar && (
              <div style={{ height: 6, background: `${T.fg4}30`, borderRadius: 100, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${k.bar}%`, background: k.color, borderRadius: 100 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart + Dials */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ ...patterns.card, padding: '28px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.fg, marginBottom: 24 }}>Organic Traffic</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 200 }}>
            {data.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: T.fg3, fontFamily: T.mono }}>{(d.views / 1000).toFixed(1)}k</span>
                <div style={{ width: '100%', height: `${(d.views / maxViews) * 160}px`, background: `linear-gradient(to top, ${T.primary}, ${T.primaryContainer})`, borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                <span style={{ fontSize: 11, color: T.fg3, fontWeight: 500 }}>{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[{ label: 'Joy Index', value: 80, color: T.primary }, { label: 'Trust Factor', value: 90, color: T.secondary }].map((dial, i) => (
            <div key={i} style={{ ...patterns.card, padding: '24px', textAlign: 'center', flex: 1 }}>
              <h4 style={{ fontSize: 11, fontWeight: 600, color: T.fg2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{dial.label}</h4>
              <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 12px' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke={`${T.fg4}30`} strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={dial.color} strokeWidth="6"
                    strokeDasharray={`${dial.value / 100 * 264} 264`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: dial.color }}>{dial.value}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar ────────────────────────────────────────
function CalendarScreen() {
  const days = Array.from({ length: 35 }, (_, i) => {
    const day = i - 3;
    const date = new Date(2026, 4, day);
    return { date, day: date.getDate(), inMonth: date.getMonth() === 4 };
  });
  const events = {
    1: [{ title: 'AI Content Guide', color: T.primary }],
    3: [{ title: 'LinkedIn Thread', color: T.secondary }],
    5: [{ title: 'Newsletter #24', color: T.primary }],
    8: [{ title: 'SEO Playbook', color: T.secondary }],
    12: [{ title: 'X Campaign', color: T.secondary }],
    15: [{ title: 'Case Study', color: '#993f3a' }],
    19: [{ title: 'Product Update', color: T.primary }],
    22: [{ title: 'Newsletter #25', color: T.primary }],
    26: [{ title: 'Roundup Post', color: T.secondary }],
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em' }}>Calendar</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ ...patterns.btnSecondary, padding: '6px 10px' }}><Icons.ChevronLeft size={16} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.fg, minWidth: 120, textAlign: 'center' }}>May 2026</span>
          <button style={{ ...patterns.btnSecondary, padding: '6px 10px' }}><Icons.ChevronRight size={16} /></button>
        </div>
      </div>
      <div style={{ ...patterns.card, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: T.fg3, textTransform: 'uppercase', borderBottom: `1px solid ${T.fg4}30` }}>{d}</div>
          ))}
          {days.map((d, i) => {
            const dayEvents = d.inMonth ? (events[d.day] || []) : [];
            const isToday = d.inMonth && d.day === 1;
            return (
              <div key={i} style={{ minHeight: 80, padding: '6px 8px', borderBottom: `1px solid ${T.fg4}20`, borderRight: (i + 1) % 7 !== 0 ? `1px solid ${T.fg4}20` : 'none', background: isToday ? T.primaryMuted : 'transparent', opacity: d.inMonth ? 1 : 0.3 }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? T.primary : T.fg3, marginBottom: 4 }}>{d.day}</div>
                {dayEvents.map((ev, j) => (
                  <div key={j} style={{ fontSize: 10, fontWeight: 500, color: T.fg, background: `${ev.color}15`, borderLeft: `2px solid ${ev.color}`, padding: '2px 6px', borderRadius: 3, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Library ─────────────────────────────────────────
function LibraryScreen({ onOpenSession }) {
  const [filter, setFilter] = useState('all');
  const articles = [
    { id: 1, title: 'AI in Healthcare: 2026 Trends', status: 'published', type: 'blog', date: 'Apr 28', score: 94 },
    { id: 2, title: 'Complete Guide to RAG Architecture', status: 'review', type: 'blog', date: 'Apr 27', score: 87 },
    { id: 3, title: '10 Productivity Hacks for Remote Teams', status: 'draft', type: 'blog', date: 'Apr 26', score: 72 },
    { id: 4, title: 'Why Your SaaS Needs a Content Flywheel', status: 'scheduled', type: 'newsletter', date: 'Apr 25', score: 91 },
    { id: 5, title: 'Zero to 10k: Organic Growth Playbook', status: 'published', type: 'blog', date: 'Apr 23', score: 88 },
    { id: 6, title: 'LinkedIn Thought Leadership Thread', status: 'published', type: 'social', date: 'Apr 22', score: 85 },
  ];
  const filtered = filter === 'all' ? articles : articles.filter(a => a.status === filter);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', marginBottom: 24 }}>Content Library</h1>
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {['all', 'published', 'scheduled', 'review', 'draft'].map(f => (
          <button key={f} style={{ padding: '6px 14px', borderRadius: 100, border: `1px solid ${filter === f ? T.primary : T.fg4}`, background: filter === f ? T.primaryMuted : T.bg2, color: filter === f ? T.primary : T.fg3, cursor: 'pointer', fontSize: 12, fontFamily: T.font, fontWeight: 500, textTransform: 'capitalize', transition: `all ${T.fast}` }}
            onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div style={{ ...patterns.card, overflow: 'hidden' }}>
        {filtered.map((a, i) => {
          const sc = statusColors[a.status];
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', gap: 16, borderBottom: i < filtered.length - 1 ? `1px solid ${T.fg4}30` : 'none', cursor: 'pointer', transition: `background ${T.fast}` }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg3}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => onOpenSession(a)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.fg }}>{a.title}</div>
                <div style={{ fontSize: 12, color: T.fg3, marginTop: 2 }}>{a.type} · {a.date}</div>
              </div>
              <span style={{ ...patterns.badge, background: sc.bg, color: sc.fg, textTransform: 'capitalize', fontWeight: 600, fontSize: 11 }}>{a.status}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: a.score >= 85 ? T.primary : T.warning }}>{a.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Brand Voice ─────────────────────────────────────
function BrandVoiceScreen() {
  const [activeProfile, setActiveProfile] = useState(0);
  const profiles = [
    { name: 'Primary Brand Voice', tone: 'Authoritative yet approachable', traits: ['Clear', 'Confident', 'Data-driven', 'Action-oriented'] },
    { name: 'Thought Leadership', tone: 'Visionary and insightful', traits: ['Bold', 'Forward-thinking', 'Research-backed'] },
    { name: 'Product Updates', tone: 'Concise and practical', traits: ['Technical', 'Helpful', 'Efficient'] },
  ];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em' }}>Brand Voice</h1>
        <button style={patterns.btnPrimary}><Icons.Plus size={16} /> New Profile</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {profiles.map((p, i) => (
          <div key={i} style={{ ...patterns.card, padding: '24px', cursor: 'pointer', transition: `all ${T.med}`, border: `1px solid ${activeProfile === i ? T.primary : T.fg4}40`, background: activeProfile === i ? T.primaryMuted : T.bg2 }}
            onClick={() => setActiveProfile(i)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.fg, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: T.fg2 }}>{p.tone}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {p.traits.map(t => (
                <span key={t} style={{ ...patterns.badge, background: T.bg4, color: T.fg2 }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ImagesScreen, SocialScreen, AnalyticsScreen, CalendarScreen, LibraryScreen, BrandVoiceScreen });
