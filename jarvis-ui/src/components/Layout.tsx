// Layout.tsx — Shell principal con sidebar expandible y navegación completa
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearUser, getUser } from '../store/auth';
import toast from 'react-hot-toast';
import { Zap, Database, Globe, FileText, LogOut, Menu, X, Users, LayoutTemplate, History, Settings, ChevronDown, ChevronRight, FileCode } from 'lucide-react';

interface NavItem { to: string; icon: React.ReactNode; label: string }
interface NavGroup { label: string; icon: React.ReactNode; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Generación',
    icon: <Zap size={15} />,
    items: [
      { to: '/dashboard/initialize', icon: <Zap size={16} />, label: 'Initialize' },
      { to: '/dashboard/generations', icon: <History size={16} />, label: 'Generaciones' },
    ],
  },
  {
    label: 'Configuración',
    icon: <Settings size={15} />,
    items: [
      { to: '/dashboard/datasources', icon: <Database size={16} />, label: 'DataSources' },
      { to: '/dashboard/domains', icon: <Globe size={16} />, label: 'Domains' },
      { to: '/dashboard/openapi-specs', icon: <FileCode size={16} />, label: 'OpenAPI Specs' },
      { to: '/dashboard/templates', icon: <LayoutTemplate size={16} />, label: 'Templates' },
    ],
  },
  {
    label: 'Administración',
    icon: <Users size={15} />,
    items: [
      { to: '/dashboard/users', icon: <Users size={16} />, label: 'Usuarios' },
      { to: '/dashboard/logs', icon: <FileText size={16} />, label: 'Logs' },
    ],
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Generación: true, Configuración: true, Administración: true });

  const logout = () => { clearUser(); toast.success('Sesión cerrada'); navigate('/'); };
  const toggleGroup = (label: string) => setOpenGroups((g) => ({ ...g, [label]: !g[label] }));

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: collapsed ? 64 : 230 }}>
        <div style={{ ...styles.sidebarTop, justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <div style={styles.brand}>
              <div style={styles.brandIcon}>J</div>
              <div><div style={styles.brandText}>Jarvis</div><div style={styles.brandSub}>Platform</div></div>
            </div>
          )}
          <button style={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <Menu size={15} /> : <X size={15} />}
          </button>
        </div>

        <nav style={styles.nav}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <button style={styles.groupHeader} onClick={() => toggleGroup(group.label)}>
                  <span style={styles.groupIcon}>{group.icon}</span>
                  <span style={styles.groupLabel}>{group.label}</span>
                  <span style={{ marginLeft: 'auto' }}>{openGroups[group.label] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                </button>
              )}
              {(collapsed || openGroups[group.label]) && group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    ...styles.navItem,
                    paddingLeft: collapsed ? 20 : 28,
                    background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                    borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                  })}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button
          style={{ ...styles.logoutBtn, justifyContent: collapsed ? 'center' : 'flex-start', margin: collapsed ? '12px auto' : 12, width: collapsed ? 40 : 'auto' }}
          onClick={logout}
          title={collapsed ? 'Salir' : undefined}
        >
          <LogOut size={15} />
          {!collapsed && <span>Salir</span>}
        </button>
      </aside>

      {/* Main */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerTitle}>Jarvis Platform</span>
            <span style={styles.headerSep}>|</span>
            <span style={styles.headerSub}>XXXXXXX</span>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.headerDate}>{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <div style={styles.userBadge}>{user}</div>
          </div>
        </header>
        <main style={styles.content}><Outlet /></main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    background: 'linear-gradient(180deg, #1A3A6B 0%, #1E4FA3 60%, #2B5BA8 100%)',
    color: '#fff', display: 'flex', flexDirection: 'column',
    transition: 'width 0.25s', flexShrink: 0,
    position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden',
  },
  sidebarTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 12px 14px' },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 36, height: 36, borderRadius: 8,
    background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 18, flexShrink: 0,
  },
  brandText: { fontWeight: 800, fontSize: 16, letterSpacing: 0.5 },
  brandSub: { fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' },
  collapseBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 6, padding: 6, cursor: 'pointer', flexShrink: 0 },
  nav: { flex: 1, padding: '4px 0' },
  groupHeader: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', marginTop: 8 },
  groupIcon: { flexShrink: 0 },
  groupLabel: {},
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'background 0.15s' },
  navIcon: { flexShrink: 0 },
  navLabel: {},
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 8, margin: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', fontSize: 13, cursor: 'pointer' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  header: { background: '#fff', borderBottom: '1px solid #D0DBF0', padding: '13px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerTitle: { fontWeight: 700, color: '#1A3A6B', fontSize: 15 },
  headerSep: { color: '#D0DBF0' },
  headerSub: { fontSize: 13, color: '#5A6A85' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  headerDate: { fontSize: 12, color: '#5A6A85' },
  userBadge: { background: '#EEF2F9', color: '#1E4FA3', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  content: { flex: 1, padding: 28, overflowY: 'auto' },
};
