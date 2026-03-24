// Logs.tsx — Visor de logs con filtros por usuario, acción, módulo y nivel
import { useEffect, useState } from 'react';
import { FileText, RefreshCw, Filter } from 'lucide-react';
import api from '../api/client';
import { Button, Card, PageHeader, DataTable, TextInput, SelectInput, StatusBadge } from '@jarvis/design-system';
import type { LogEntry } from '../types';
import {
  LOG_LEVEL_BADGE as LEVEL_BADGE_MAP,
  ACTION_COLORS,
  MODULE_OPTIONS,
  LOG_LEVEL_OPTIONS as LEVEL_OPTIONS,
} from '../utils/constants';

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

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (_: unknown, row: LogEntry) => (
        <span style={{ color: 'var(--jarvis-text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
          {new Date(row.timestamp).toLocaleString('es-PE')}
        </span>
      ),
    },
    {
      key: 'user',
      label: 'Usuario',
      render: (_: unknown, row: LogEntry) => (
        <StatusBadge label={row.user} variant="primary" />
      ),
    },
    {
      key: 'module',
      label: 'Módulo',
      render: (_: unknown, row: LogEntry) => (
        <StatusBadge label={row.module ?? '—'} variant="neutral" />
      ),
    },
    {
      key: 'level',
      label: 'Nivel',
      render: (_: unknown, row: LogEntry) => (
        <StatusBadge
          label={row.level ?? 'INFO'}
          variant={LEVEL_BADGE_MAP[row.level ?? 'INFO'] ?? 'neutral'}
        />
      ),
    },
    {
      key: 'action',
      label: 'Acción',
      render: (_: unknown, row: LogEntry) => {
        const color = ACTION_COLORS[row.action] ?? 'var(--jarvis-text-secondary)';
        return (
          <span style={{ background: `${color}18`, color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            {row.action}
          </span>
        );
      },
    },
    {
      key: 'details',
      label: 'Detalles',
      render: (_: unknown, row: LogEntry) => (
        <code style={{ fontSize: 10, color: 'var(--jarvis-text-secondary)', background: 'var(--jarvis-bg)', padding: '2px 6px', borderRadius: 4 }}>
          {JSON.stringify(row.details)}
        </code>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<FileText size={20} />}
        title="Logs del Sistema"
        description="Auditoría de todas las acciones"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={14} style={{ marginRight: 6 }} /> Filtros
            </Button>
            <Button variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw size={14} style={{ marginRight: 6 }} /> Actualizar
            </Button>
          </div>
        }
      />

      {showFilters && (
        <Card style={{ marginBottom: 16 }}>
          <div style={styles.filterGrid}>
            <TextInput
              label="Usuario"
              value={filters.user}
              onChange={(v) => setFilters({ ...filters, user: v })}
              placeholder="admin"
            />
            <TextInput
              label="Acción"
              value={filters.action}
              onChange={(v) => setFilters({ ...filters, action: v })}
              placeholder="GENERATE"
            />
            <SelectInput
              label="Módulo"
              value={filters.module}
              onChange={(v) => setFilters({ ...filters, module: v })}
              options={MODULE_OPTIONS}
            />
            <SelectInput
              label="Nivel"
              value={filters.level}
              onChange={(v) => setFilters({ ...filters, level: v })}
              options={LEVEL_OPTIONS}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button size="sm" onClick={load}>Aplicar filtros</Button>
            <Button size="sm" variant="ghost" onClick={clearFilters}>Limpiar</Button>
          </div>
        </Card>
      )}

      <Card title={`Eventos (${logs.length})`}>
        <DataTable
          columns={columns}
          rows={logs}
          emptyMessage="No hay eventos."
        />
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 },
};
