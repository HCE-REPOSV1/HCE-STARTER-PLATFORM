// Generations.tsx — Historial de generaciones con re-descarga
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { History, Download, Trash2, RefreshCw } from 'lucide-react';
import api from '../api/client';
import { Button, ContentCard, PageHeader, DataTableSimple, StatusBadge } from '@hce/design-system';
import type { Generation } from '../types';
import { GENERATION_STATUS_BADGE as STATUS_BADGE_MAP } from '../utils/constants';

export default function Generations() {
  const [list, setList] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await api.get('/generations');
    setList(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const download = async (gen: Generation) => {
    try {
      const res = await api.get(`/generations/${gen.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a'); a.href = url; a.download = `${gen.serviceName}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('El ZIP ya no está disponible. Regenere el microservicio.'); }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar registro?')) return;
    await api.delete(`/generations/${id}`); toast.success('Eliminado'); load();
  };

  const columns = [
    {
      key: 'serviceName',
      label: 'Servicio',
      render: (_: unknown, row: Generation) => (
        <code style={{ background: 'var(--jarvis-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: 'var(--jarvis-primary)' }}>
          {row.serviceName}
        </code>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (_: unknown, row: Generation) => (
        <StatusBadge label={row.type} variant="primary" />
      ),
    },
    { key: 'domainName', label: 'Dominio' },
    {
      key: 'architecture',
      label: 'Arquitectura',
      render: (_: unknown, row: Generation) => (
        <StatusBadge label={row.architecture} variant="neutral" />
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (_: unknown, row: Generation) => (
        <div>
          <StatusBadge label={row.status} variant={STATUS_BADGE_MAP[row.status] ?? 'neutral'} />
          {row.errorMessage && (
            <div style={{ fontSize: 11, color: 'var(--jarvis-error)', marginTop: 2 }}>{row.errorMessage}</div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      render: (_: unknown, row: Generation) => (
        <span style={{ color: 'var(--jarvis-text-secondary)', fontSize: 12, fontFamily: 'monospace' }}>
          {new Date(row.createdAt).toLocaleString('es-PE')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: unknown, row: Generation) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {row.status === 'success' && (
            <Button size="sm" variant="secondary" onClick={() => download(row)}>
              <Download size={13} />
            </Button>
          )}
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<History size={20} />}
        title="Generaciones"
        description="Historial de microservicios generados"
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Actualizar
          </Button>
        }
      />

      <ContentCard title={`Historial (${list.length})`}>
        <DataTableSimple
          columns={columns}
          rows={list}
          emptyMessage="No hay generaciones registradas."
        />
      </ContentCard>
    </div>
  );
}
