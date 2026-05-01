// Research, SEO, Blog Editor — Light theme
const { useState } = React;

// ─── Pipeline Stepper ────────────────────────────────
const PIPELINE_STEPS = [
  { id: 'research', label: 'Research', icon: 'Compass' },
  { id: 'seo', label: 'SEO', icon: 'Target' },
  { id: 'blog', label: 'Write', icon: 'PenTool' },
  { id: 'images', label: 'Images', icon: 'Image' },
  { id: 'social-x', label: 'Distribute', icon: 'Send' },
];

function PipelineStepper({ current, onNavigate }) {
  const currentIdx = PIPELINE_STEPS.findIndex(s => s.id === current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28, background: T.bg2, borderRadius: T.r2, padding: '6px 8px', boxShadow: T.shadow1, border: `1px solid ${T.fg4}30` }}>
      {PIPELINE_STEPS.map((step, i) => {
        const IconComp = Icons[step.icon];
        const isActive = step.id === current;
        const isDone = i < currentIdx;
        return (
          <React.Fragment key={step.id}>
            {i > 0 && <div style={{ width: 28, height: 2, background: isDone ? T.primary : `${T.fg4}60`, margin: '0 2px', borderRadius: 1 }} />}
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: T.r1, border: 'none', cursor: 'pointer', fontFamily: T.font, fontSize: 12, fontWeight: isActive ? 600 : 500, background: isActive ? T.primaryMuted : 'transparent', color: isActive ? T.primary : isDone ? T.fg2 : T.fg3, transition: `all ${T.fast}` }}
              onClick={() => onNavigate(step.id)}>
              {isDone ? <Icons.Check size={14} stroke={T.primary} /> : IconComp && <IconComp size={14} />}
              {step.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Research Screen ─────────────────────────────────
const MOCK_RESEARCH = {
  competitors: [
    { url: 'hubspot.com', title: 'The Ultimate Guide to AI Content Marketing', wordCount: 3200, score: 92, keywords: 14 },
    { url: 'semrush.com', title: 'AI Content Strategy: A Complete Framework', wordCount: 2800, score: 88, keywords: 11 },
    { url: 'contentmarketinginstitute.com', title: 'How AI is Transforming Content', wordCount: 2100, score: 85, keywords: 9 },
  ],
  suggestedKeywords: [
    { kw: 'ai content marketing', vol: '12.1k', diff: 67, intent: 'informational' },
    { kw: 'ai writing tools', vol: '8.4k', diff: 54, intent: 'commercial' },
    { kw: 'content automation', vol: '5.2k', diff: 42, intent: 'informational' },
    { kw: 'ai seo optimization', vol: '3.8k', diff: 38, intent: 'commercial' },
    { kw: 'content marketing strategy 2026', vol: '2.9k', diff: 45, intent: 'informational' },
    { kw: 'automated content creation', vol: '2.1k', diff: 31, intent: 'commercial' },
  ],
  outline: [
    { h: 'H1', text: 'AI-Powered Content Marketing: The Complete 2026 Guide' },
    { h: 'H2', text: 'What is AI Content Marketing?' },
    { h: 'H2', text: 'Why AI Content Marketing Matters in 2026' },
    { h: 'H3', text: 'The Rise of Personalized Content at Scale' },
    { h: 'H3', text: 'Cost Efficiency and ROI' },
    { h: 'H2', text: 'Building Your AI Content Strategy' },
    { h: 'H3', text: 'Step 1: Audit Your Current Content' },
    { h: 'H3', text: 'Step 2: Define Your Brand Voice Profile' },
    { h: 'H3', text: 'Step 3: Set Up Your Content Pipeline' },
    { h: 'H2', text: 'Best AI Tools for Content Marketing' },
    { h: 'H2', text: 'Measuring Success: KPIs and Analytics' },
    { h: 'H2', text: 'Common Pitfalls to Avoid' },
    { h: 'H2', text: 'Conclusion and Next Steps' },
  ],
};

function ResearchScreen({ session, onNavigate }) {
  const [activeTab, setActiveTab] = useState('keywords');
  const [hoveredRow, setHoveredRow] = useState(null);
  const tabs = [{ id: 'keywords', label: 'Keywords' }, { id: 'competitors', label: 'Competitors' }, { id: 'outline', label: 'Content Brief' }];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', marginBottom: 4 }}>Research</h1>
          <p style={{ fontSize: 14, color: T.fg2 }}>{session?.topic || 'AI-Powered Content Marketing'}</p>
        </div>
        <button style={patterns.btnPrimary} onClick={() => onNavigate('seo')}>
          Continue to SEO <Icons.ArrowRight size={16} />
        </button>
      </div>
      <PipelineStepper current="research" onNavigate={onNavigate} />

      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${T.fg4}60`, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: T.font, fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400, color: activeTab === t.id ? T.primary : T.fg3, borderBottom: activeTab === t.id ? `2px solid ${T.primary}` : '2px solid transparent', marginBottom: -1, transition: `all ${T.fast}` }}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'keywords' && (
        <div style={{ ...patterns.card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 100px', padding: '10px 22px', borderBottom: `1px solid ${T.fg4}40` }}>
            {['Keyword', 'Volume', 'KD', 'Intent'].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: T.fg3, letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>
          {MOCK_RESEARCH.suggestedKeywords.map((kw, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 100px', padding: '13px 22px', borderBottom: i < MOCK_RESEARCH.suggestedKeywords.length - 1 ? `1px solid ${T.fg4}30` : 'none', background: hoveredRow === `kw-${i}` ? T.bg3 : 'transparent', transition: `background ${T.fast}`, cursor: 'pointer' }}
              onMouseEnter={() => setHoveredRow(`kw-${i}`)} onMouseLeave={() => setHoveredRow(null)}>
              <span style={{ fontSize: 14, color: T.fg, fontWeight: 500 }}>{kw.kw}</span>
              <span style={{ fontSize: 13, color: T.fg2, fontFamily: T.mono }}>{kw.vol}</span>
              <span style={{ fontSize: 13, fontFamily: T.mono, fontWeight: 600, color: kw.diff > 60 ? T.error : kw.diff > 40 ? T.warning : T.primary }}>{kw.diff}</span>
              <span style={{ ...patterns.badge, background: kw.intent === 'commercial' ? T.secondaryMuted : T.primaryMuted, color: kw.intent === 'commercial' ? T.secondary : T.primary, fontSize: 11, textTransform: 'capitalize' }}>{kw.intent}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'competitors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MOCK_RESEARCH.competitors.map((c, i) => (
            <div key={i} style={{ ...patterns.card, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: T.fg, marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: T.fg3 }}>{c.url} · {c.wordCount.toLocaleString()} words · {c.keywords} keywords</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.score >= 90 ? T.primary : T.secondary }}>{c.score}</div>
                <div style={{ fontSize: 10, color: T.fg3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'outline' && (
        <div style={{ ...patterns.card, padding: '28px' }}>
          {MOCK_RESEARCH.outline.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: item.h === 'H3' ? '5px 0 5px 32px' : '7px 0' }}>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: T.mono, color: item.h === 'H1' ? T.primary : item.h === 'H2' ? T.fg3 : T.fg4, width: 24, flexShrink: 0 }}>{item.h}</span>
              <span style={{ fontSize: item.h === 'H1' ? 17 : item.h === 'H2' ? 14 : 13, fontWeight: item.h === 'H1' ? 700 : item.h === 'H2' ? 600 : 400, color: item.h === 'H1' ? T.fg : T.fg2 }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SEO Screen ──────────────────────────────────────
function SEOScreen({ session, onNavigate }) {
  const [seoScore] = useState(82);
  const seoChecks = [
    { label: 'Primary keyword in title', status: 'pass' },
    { label: 'Meta description length', status: 'pass' },
    { label: 'Keyword density (1.2%)', status: 'pass' },
    { label: 'Internal links (3 found)', status: 'warn' },
    { label: 'Image alt text', status: 'fail' },
    { label: 'Header structure (H1→H2→H3)', status: 'pass' },
    { label: 'NLP term coverage (78%)', status: 'warn' },
    { label: 'Word count target (2,400 / 2,500)', status: 'pass' },
  ];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', marginBottom: 4 }}>SEO Optimization</h1>
          <p style={{ fontSize: 14, color: T.fg2 }}>{session?.topic || 'AI-Powered Content Marketing'}</p>
        </div>
        <button style={patterns.btnPrimary} onClick={() => onNavigate('blog')}>Continue to Editor <Icons.ArrowRight size={16} /></button>
      </div>
      <PipelineStepper current="seo" onNavigate={onNavigate} />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        <div style={{ ...patterns.card, padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 16 }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="60" fill="none" stroke={`${T.fg4}40`} strokeWidth="8" />
              <circle cx="70" cy="70" r="60" fill="none" stroke={seoScore >= 80 ? T.primary : T.warning} strokeWidth="8"
                strokeDasharray={`${seoScore / 100 * 377} 377`} strokeLinecap="round" transform="rotate(-90 70 70)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 38, fontWeight: 800, color: T.fg }}>{seoScore}</span>
              <span style={{ fontSize: 11, color: T.fg3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>SEO Score</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600 }}>
            <span style={{ color: T.primary }}>6 passed</span>
            <span style={{ color: T.warning }}>2 warnings</span>
            <span style={{ color: T.error }}>1 issue</span>
          </div>
        </div>

        <div style={{ ...patterns.card, padding: 0, overflow: 'hidden' }}>
          {seoChecks.map((check, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderBottom: i < seoChecks.length - 1 ? `1px solid ${T.fg4}30` : 'none' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: check.status === 'pass' ? T.successMuted : check.status === 'warn' ? T.warningMuted : T.errorMuted, flexShrink: 0 }}>
                {check.status === 'pass' && <Icons.Check size={13} stroke={T.primary} />}
                {check.status === 'warn' && <span style={{ fontSize: 13, fontWeight: 700, color: T.warning }}>!</span>}
                {check.status === 'fail' && <Icons.X size={13} stroke={T.error} />}
              </div>
              <span style={{ fontSize: 14, color: check.status === 'fail' ? T.error : T.fg2, fontWeight: check.status === 'fail' ? 500 : 400, flex: 1 }}>{check.label}</span>
              {check.status !== 'pass' && (
                <button style={{ background: 'none', border: `1px solid ${T.fg4}`, borderRadius: T.r1, padding: '4px 12px', fontSize: 12, color: T.primary, cursor: 'pointer', fontFamily: T.font, fontWeight: 600 }}>Fix</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Blog Editor ─────────────────────────────────────
const MOCK_ARTICLE = `# AI-Powered Content Marketing: The Complete 2026 Guide

The landscape of content marketing has fundamentally shifted. What once required teams of writers, editors, and strategists can now be orchestrated by a single marketer armed with the right AI tools.

## What is AI Content Marketing?

AI content marketing combines artificial intelligence with traditional content strategy to create, optimize, and distribute content at scale. Unlike basic text generators, modern AI content platforms understand search intent, brand voice, audience preferences, and competitive positioning.

## Why AI Content Marketing Matters in 2026

The numbers tell the story. Companies using AI-powered content workflows publish 4x more content while maintaining quality scores above 85%.

### The Rise of Personalized Content at Scale

Today's audiences expect content tailored to their specific needs, industry, and stage in the buying journey. AI makes it possible to create dozens of content variations from a single brief.

### Cost Efficiency and ROI

A single AI-assisted content marketer can produce the output of a 5-person team. Lower production costs, faster time-to-publish, and higher SEO performance equals compounding returns.`;

function BlogEditorScreen({ session, onNavigate }) {
  const [content, setContent] = useState(MOCK_ARTICLE);
  const [showAiPanel, setShowAiPanel] = useState(false);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: T.fg, letterSpacing: '-0.02em', marginBottom: 4 }}>Editor</h1>
          <p style={{ fontSize: 14, color: T.fg2 }}>{session?.topic || 'AI-Powered Content Marketing'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={patterns.btnSecondary} onClick={() => setShowAiPanel(!showAiPanel)}>
            <Icons.Sparkles size={16} stroke={T.primary} /> AI Assist
          </button>
          <button style={patterns.btnPrimary} onClick={() => onNavigate('images')}>Continue <Icons.ArrowRight size={16} /></button>
        </div>
      </div>
      <PipelineStepper current="blog" onNavigate={onNavigate} />

      <div style={{ display: 'grid', gridTemplateColumns: showAiPanel ? '1fr 280px' : '1fr', gap: 16 }}>
        <div style={{ ...patterns.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 16px', borderBottom: `1px solid ${T.fg4}30`, flexWrap: 'wrap' }}>
            {['B', 'I', 'U', '|', 'H1', 'H2', 'H3', '|', 'Link', 'Image', 'Quote', '|', 'List', 'Code'].map((btn, i) => (
              btn === '|' ? <div key={i} style={{ width: 1, height: 20, background: `${T.fg4}60`, margin: '0 4px' }} /> :
              <button key={i} style={{ background: 'none', border: 'none', color: T.fg3, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: btn.length <= 2 ? 700 : 500, fontFamily: btn.length <= 2 ? T.mono : T.font, transition: `all ${T.fast}` }}
                onMouseEnter={e => { e.currentTarget.style.background = T.bg3; e.currentTarget.style.color = T.fg; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = T.fg3; }}>{btn}</button>
            ))}
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            style={{ width: '100%', minHeight: 440, background: 'transparent', border: 'none', color: T.fg, fontSize: 15, lineHeight: 1.75, padding: '24px 28px', fontFamily: "'Georgia', serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 22px', borderTop: `1px solid ${T.fg4}30`, fontSize: 12, color: T.fg3 }}>
            <span>2,412 words</span>
            <span>~10 min read</span>
          </div>
        </div>

        {showAiPanel && (
          <div style={{ ...patterns.card, padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 4 }}>AI Assist</div>
            {['Expand this section', 'Make more concise', 'Change tone to casual', 'Add statistics', 'Rewrite for SEO', 'Generate conclusion'].map((action, i) => (
              <button key={i} style={{ ...patterns.btnSecondary, width: '100%', justifyContent: 'flex-start', padding: '10px 12px', fontSize: 12 }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                onMouseLeave={e => e.currentTarget.style.background = T.bg2}>
                <Icons.Sparkles size={14} stroke={T.primary} /> {action}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ResearchScreen, SEOScreen, BlogEditorScreen, PipelineStepper });
