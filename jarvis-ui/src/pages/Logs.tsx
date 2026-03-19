// Logs.tsx — Visor de logs con filtros por usuario, acción, módulo y nivel
import { useEffect, useState } from 'react';
import { FileText, RefreshCw, Filter } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';
import type { LogEntry } from '../types';

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  INFO: { bg: '#e8f0fe', color: '#003087' },
  ERROR: { bg: '#fdecea', color: '#d32f2f' },
  WARN: { bg: '#fff8e1', color: '#f57c00' },
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#2e7d32', LOGOUT: '#5a6a85',
  CREATE_DATASOURCE: '#0050b3', UPDATE_DATASOURCE: '#f57c00', DELETE_DATASOURCE: '#d32f2f', TEST_DATASOURCE: '#1a73e8',
  CREATE_DOMAIN: '#0050b3', UPDATE_DOMAIN: '#f57c00', DELETE_DOMAIN: '#d32f2f',
  GENERATE_MICROSERVICE: '#003087', GENERATE_MICROSERVICE_FAILED: '#d32f2f',
  CREATE_USER: '#0050b3', UPDATE_USER: '#f57c00', DELETE_USER: '#d32f2f',
};

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ user: '', action: '', module: '', level: '' });
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.user) params.set('user', filters.user);
    if (filters.action) params.set('action', filters.action);
    if (filters.module) params.set('module', filters.module);
    if (filters.level) params.set('level', filters.level);
    const r = await api.get(`/logs?${params.toString()}`);
    setLogs(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clearFilters = () => { setFilters({ user: '', action: '', module: '', level: '' }); };

  return (
    <div>
      <div style={styles.pageHeader}>
        <FileText size={22} color="#003087" />
        <div><h1 style={styles.pageTitle}>Logs del Sistema</h1><p style={styles.pageDesc}>Auditoría de todas las acciones</p></div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => setShowFilters(!showFilters)}><Filter size={14} /> Filtros</Btn>
          <Btn variant="secondary" onClick={load} disabled={loading}><RefreshCw size={14} /> Actualizar</Btn>
        </div>
      </div>

      {showFilters && (
        <Card style={{ marginBottom: 16 }}>
          <div style={styles.filterGrid}>
            <div style={styles.field}><label style={styles.label}>Usuario</label><input style={styles.input} value={filters.user} onChange={(e) => setFilters({ ...filters, user: e.target.value })} placeholder="admin" /></div>
            <div style={styles.field}><label style={styles.label}>Acción</label><input style={styles.input} value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} placeholder="GENERATE" /></div>
            <div style={styles.field}><label style={styles.label}>Módulo</label>
              <select style={styles.input} value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })}>
                <option value="">Todos</option>
                {['auth', 'users', 'datasources', 'domains', 'generator', 'templates', 'system'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={styles.field}><label style={styles.label}>Nivel</label>
              <select style={styles.input} value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
                <option value="">Todos</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Btn size="sm" onClick={load}>Aplicar filtros</Btn>
            <Btn size="sm" variant="ghost" onClick={clearFilters}>Limpiar</Btn>
          </div>
        </Card>
      )}

      <Card title={`Eventos (${logs.length})`}>
        {logs.length === 0 ? <p style={styles.empty}>No hay eventos.</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Timestamp', 'Usuario', 'Módulo', 'Nivel', 'Acción', 'Detalles'].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}><span style={styles.ts}>{new Date(log.timestamp).toLocaleString('es-PE')}</span></td>
                    <td style={styles.td}><span style={styles.userBadge}>{log.user}</span></td>
                    <td style={styles.td}><span style={styles.moduleBadge}>{log.module ?? '—'}</span></td>
                    <td style={styles.td}>
                      <span style={{ ...styles.levelBadge, background: LEVEL_COLORS[log.level]?.bg ?? '#f4f6f9', color: LEVEL_COLORS[log.level]?.color ?? '#5a6a85' }}>
                        {log.level ?? 'INFO'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.actionBadge, background: `${ACTION_COLORS[log.action] ?? '#5a6a85'}18`, color: ACTION_COLORS[log.action] ?? '#5a6a85' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={styles.td}><code style={styles.details}>{JSON.stringify(log.details)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#003087' },
  pageDesc: { fontSize: 13, color: '#5a6a85', marginTop: 2 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1a2a4a' },
  input: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d9e6', fontSize: 13, outline: 'none' },
  empty: { color: '#5a6a85', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#5a6a85', background: '#f4f6f9', borderBottom: '1px solid #d1d9e6', textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { borderBottom: '1px solid #f0f2f5' },
  td: { padding: '10px 14px', fontSize: 12, color: '#1a2a4a', verticalAlign: 'middle' },
  ts: { color: '#5a6a85', fontFamily: 'monospace', fontSize: 11 },
  userBadge: { background: '#e8f0fe', color: '#003087', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  moduleBadge: { background: '#f4f6f9', color: '#5a6a85', padding: '2px 8px', borderRadius: 20, fontSize: 11 },
  levelBadge: { padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  actionBadge: { padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 },
  details: { fontSize: 10, color: '#5a6a85', background: '#f4f6f9', padding: '2px 6px', borderRadius: 4 },
};
