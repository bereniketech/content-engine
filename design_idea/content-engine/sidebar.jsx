// Sidebar — Light theme, teal accents, left-border active state
const { useState } = React;

const NAV_SECTIONS = [
  { id: 'main', items: [
    { id: 'dashboard', label: 'Hub', icon: 'Layout' },
    { id: 'research', label: 'Research', icon: 'Compass' },
    { id: 'seo', label: 'SEO', icon: 'Target' },
    { id: 'blog', label: 'Blog', icon: 'FileText' },
    { id: 'images', label: 'Images', icon: 'Image' },
  ]},
  { id: 'social', title: 'Distribute', items: [
    { id: 'social-x', label: 'X / Twitter', icon: 'Hash' },
    { id: 'social-linkedin', label: 'LinkedIn', icon: 'Users' },
    { id: 'social-instagram', label: 'Instagram', icon: 'Image' },
    { id: 'social-newsletter', label: 'Newsletter', icon: 'Mail' },
    { id: 'social-medium', label: 'Medium', icon: 'BookOpen' },
  ]},
  { id: 'tools', title: 'Manage', items: [
    { id: 'calendar', label: 'Calendar', icon: 'Calendar' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
    { id: 'library', label: 'Library', icon: 'Layers' },
    { id: 'brand-voice', label: 'Brand Voice', icon: 'Palette' },
  ]},
];

const sidebarStyles = {
  root: {
    width: '248px',
    minWidth: '248px',
    height: '100vh',
    background: '#f8faf8',
    borderRight: `1px solid #e2e8e4`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: T.font,
    overflow: 'hidden',
    transition: `width ${T.slow}, min-width ${T.slow}`,
    zIndex: 50,
  },
  collapsed: {
    width: '60px',
    minWidth: '60px',
  },
  brandCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '16px 16px 8px',
    padding: '12px',
    background: T.bg2,
    borderRadius: T.r2,
    boxShadow: T.shadow1,
    border: `1px solid #e8ece8`,
    cursor: 'pointer',
  },
  logoMark: {
    width: 36, height: 36,
    background: T.primaryContainer,
    borderRadius: T.r1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  nav: {
    flex: 1, overflow: 'auto', padding: '4px 0',
    display: 'flex', flexDirection: 'column', gap: '1px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: T.fg3,
    marginTop: '16px',
    padding: '4px 20px 6px',
  },
  item: (active, hovered) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 16px 9px 18px',
    margin: '1px 8px',
    borderRadius: T.r1,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: active ? 600 : 500,
    color: active ? T.primary : hovered ? T.fg : '#4a5c54',
    background: active ? T.primaryMuted : hovered ? T.bgHover : 'transparent',
    borderLeft: active ? `3px solid ${T.primary}` : '3px solid transparent',
    transition: `all ${T.fast}`,
    whiteSpace: 'nowrap', overflow: 'hidden',
    userSelect: 'none',
  }),
  itemIcon: (active) => ({
    flexShrink: 0,
    color: active ? T.primary : T.fg3,
    transition: `color ${T.fast}`,
  }),
  footer: {
    borderTop: `1px solid #e2e8e4`,
    padding: '12px 8px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
};

function Sidebar({ activePage, onNavigate, collapsed, onToggleCollapse }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ ...sidebarStyles.root, ...(collapsed ? sidebarStyles.collapsed : {}) }}>
      {/* Brand Card */}
      {!collapsed && (
        <div style={sidebarStyles.brandCard} onClick={onToggleCollapse}>
          <img src="logo.png" alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: T.fg, letterSpacing: '-0.01em' }}>Content Studio</div>
            <div style={{ fontSize: '11px', color: T.fg3 }}>Pro Plan</div>
          </div>
        </div>
      )}
      {collapsed && (
        <div style={{ padding: '16px 12px 8px', display: 'flex', justifyContent: 'center' }} onClick={onToggleCollapse}>
        <img src="logo.png" alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', cursor: 'pointer' }} />
        </div>
      )}

      {/* New Project Button */}
      <div style={{ padding: '8px 16px' }}>
        {!collapsed ? (
          <button
            style={{ ...patterns.btnPrimary, width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '13px', borderRadius: T.r1 }}
            onClick={() => onNavigate('new-session')}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Icons.Plus size={16} /> New Project
          </button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: T.r1, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,105,76,0.2)' }}
              onClick={() => onNavigate('new-session')}>
              <Icons.Plus size={16} stroke="#fff" />
            </div>
          </div>
        )}
      </div>

      <div style={sidebarStyles.nav}>
        {NAV_SECTIONS.map(section => (
          <React.Fragment key={section.id}>
            {section.title && !collapsed && <div style={sidebarStyles.sectionTitle}>{section.title}</div>}
            {section.title && collapsed && <div style={{ height: 1, background: '#e2e8e4', margin: '10px 12px' }} />}
            {section.items.map(item => {
              const IconComp = Icons[item.icon];
              const active = activePage === item.id;
              return (
                <div key={item.id}
                  style={sidebarStyles.item(active, hovered === item.id)}
                  onMouseEnter={() => setHovered(item.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}>
                  <div style={sidebarStyles.itemIcon(active)}>
                    {IconComp && <IconComp size={18} />}
                  </div>
                  {!collapsed && item.label}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div style={sidebarStyles.footer}>
        {[{ label: 'Help', icon: 'Compass' }, { label: 'Logout', icon: 'LogOut' }].map(item => {
          const IconComp = Icons[item.icon];
          return (
            <div key={item.label}
              style={sidebarStyles.item(false, hovered === item.label)}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}>
              <div style={{ flexShrink: 0, color: T.fg3 }}>{IconComp && <IconComp size={17} />}</div>
              {!collapsed && item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, NAV_SECTIONS });
