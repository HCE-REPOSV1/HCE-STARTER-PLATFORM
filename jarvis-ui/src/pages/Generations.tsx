// Generations.tsx — Historial de generaciones con re-descarga
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { History, Download, Trash2, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';
import type { Generation } from '../types';

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircle size={14} color="#2e7d32" />,
  failed: <XCircle size={14} color="#d32f2f" />,
  pending: <Clock size={14} color="#f57c00" />,
};
const STATUS_COLOR: Record<string, string> = { success: '#2e7d32', failed: '#d32f2f', pending: '#f57c00' };

export default function Generations() {
  const [list, setList] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => { setLoading(true); const r = await api.get('/generations'); setList(r.data); setLoading(false); };
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

  return (
    <div>
      <div style={styles.pageHeader}>
        <History size={22} color="#003087" />
        <div><h1 style={styles.pageTitle}>Generaciones</h1><p style={styles.pageDesc}>Historial de microservicios generados</p></div>
        <Btn variant="secondary" onClick={load} disabled={loading} style={{ marginLeft: 'auto' }}><RefreshCw size={14} /> Actualizar</Btn>
      </div>

      <Card title={`Historial (${list.length})`}>
        {list.length === 0 ? <p style={styles.empty}>No hay generaciones registradas.</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Servicio', 'Tipo', 'Dominio', 'Arquitectura', 'Estado', 'Fecha', 'Acciones'].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {list.map((g) => (
                  <tr key={g.id} style={styles.tr}>
                    <td style={styles.td}><code style={styles.code}>{g.serviceName}</code></td>
                    <td style={styles.td}><span style={styles.typeBadge}>{g.type}</span></td>
                    <td style={styles.td}>{g.domainName}</td>
                    <td style={styles.td}><span style={styles.archBadge}>{g.architecture}</span></td>
                    <td style={styles.td}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: STATUS_COLOR[g.status], fontWeight: 600, fontSize: 13 }}>
                        {STATUS_ICON[g.status]} {g.status}
                      </span>
                      {g.errorMessage && <div style={styles.errMsg}>{g.errorMessage}</div>}
                    </td>
                    <td style={styles.td}><span style={styles.ts}>{new Date(g.createdAt).toLocaleString('es-PE')}</span></td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {g.status === 'success' && <Btn size="sm" variant="secondary" onClick={() => download(g)}><Download size={13} /></Btn>}
                        <Btn size="sm" variant="danger" onClick={() => remove(g.id)}><Trash2 size={13} /></Btn>
                      </div>
                    </td>
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
  empty: { color: '#5a6a85', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#5a6a85', background: '#f4f6f9', borderBottom: '1px solid #d1d9e6', textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { borderBottom: '1px solid #f0f2f5' },
  td: { padding: '11px 14px', fontSize: 13, color: '#1a2a4a', verticalAlign: 'middle' },
  code: { background: '#f4f6f9', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#0050b3' },
  typeBadge: { background: '#e8f0fe', color: '#003087', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  archBadge: { background: '#f4f6f9', color: '#5a6a85', padding: '2px 8px', borderRadius: 20, fontSize: 12 },
  ts: { color: '#5a6a85', fontSize: 12, fontFamily: 'monospace' },
  errMsg: { fontSize: 11, color: '#d32f2f', marginTop: 2 },
};
