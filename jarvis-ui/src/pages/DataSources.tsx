import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Database, Plus, Trash2, TestTube, Edit2, X, Check } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';

interface DS {
  id: string; engine: string; host: string; port: number;
  username: string; password: string; database: string; schema?: string;
  instanceName?: string; npmLibrary: string;
}

const ENGINE_DEFAULTS: Record<string, { port: number; npmLibrary: string; username: string; schema: string }> = {
  PostgreSQL:   { port: 5432,  npmLibrary: 'pg',     username: 'postgres', schema: 'public' },
  MySQL:        { port: 3306,  npmLibrary: 'mysql2',  username: 'root',     schema: '' },
  'SQL Server': { port: 1433,  npmLibrary: 'mssql',   username: 'sa',       schema: 'dbo' },
};

const EMPTY: Omit<DS, 'id'> = { engine: 'PostgreSQL', host: 'localhost', port: 5432, username: 'postgres', password: '', database: '', schema: 'public', instanceName: '', npmLibrary: 'pg' };

export default function DataSources() {
  const [list, setList] = useState<DS[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const load = () => api.get('/datasources').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/datasources/${editId}`, form);
        toast.success('Datasource actualizado');
      } else {
        await api.post('/datasources', form);
        toast.success('Datasource creado');
      }
      setShowForm(false); setEditId(null); setForm({ ...EMPTY }); load();
    } catch { toast.error('Error al guardar'); }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar datasource?')) return;
    await api.delete(`/datasources/${id}`);
    toast.success('Eliminado'); load();
  };

  const test = async (id: string) => {
    setTesting(id);
    try {
      const r = await api.post(`/datasources/${id}/test`);
      toast.success(r.data.message);
    } catch { toast.error('Conexión fallida'); }
    finally { setTesting(null); }
  };

  const startEdit = (ds: DS) => {
    setForm({ engine: ds.engine, host: ds.host, port: ds.port, username: ds.username, password: ds.password, database: ds.database, schema: ds.schema ?? '', instanceName: ds.instanceName ?? '', npmLibrary: ds.npmLibrary });
    setEditId(ds.id); setShowForm(true);
  };

  const onEngineChange = (engine: string) => {
    const defaults = ENGINE_DEFAULTS[engine];
    if (defaults) setForm(f => ({ ...f, engine, port: defaults.port, npmLibrary: defaults.npmLibrary, username: defaults.username, schema: defaults.schema }));
    else setForm(f => ({ ...f, engine }));
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <Database size={22} color="#003087" />
        <div>
          <h1 style={styles.pageTitle}>DataSources</h1>
          <p style={styles.pageDesc}>Gestión de conexiones a bases de datos</p>
        </div>
        <Btn onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); }} style={{ marginLeft: 'auto' }}>
          <Plus size={15} /> Nueva conexión
        </Btn>
      </div>

      {showForm && (
        <Card title={editId ? 'Editar Datasource' : 'Nueva Conexión'} style={{ marginBottom: 24 }}>
          <form onSubmit={save} style={styles.formGrid}>
            {/* Motor — controla defaults del formulario */}
            <div style={styles.field}>
              <label style={styles.label}>Motor</label>
              <select style={styles.input} value={form.engine} onChange={(e) => onEngineChange(e.target.value)} required>
                {Object.keys(ENGINE_DEFAULTS).map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Host</label>
              <input style={styles.input} value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.10" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Puerto</label>
              <input style={styles.input} type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Usuario</label>
              <input style={styles.input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input style={styles.input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Database</label>
              <input style={styles.input} value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} placeholder="clinica" required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Schema</label>
              <input style={styles.input} value={form.schema ?? ''} onChange={(e) => setForm({ ...form, schema: e.target.value })} placeholder="dbo / public" />
            </div>
            {/* SQL Server: campo de instancia opcional */}
            {form.engine === 'SQL Server' && (
              <div style={styles.field}>
                <label style={styles.label}>Instancia (opcional)</label>
                <input style={styles.input} value={form.instanceName ?? ''} onChange={(e) => setForm({ ...form, instanceName: e.target.value })} placeholder="INST01" />
              </div>
            )}
            <div style={styles.field}>
              <label style={styles.label}>Librería npm</label>
              <input style={{ ...styles.input, background: '#f4f6f9', color: '#5a6a85' }} value={form.npmLibrary} readOnly />
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, marginTop: 8 }}>
              <Btn type="submit"><Check size={14} /> Guardar</Btn>
              <Btn variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}><X size={14} /> Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Conexiones configuradas (${list.length})`}>
        {list.length === 0 ? (
          <p style={styles.empty}>No hay datasources configurados.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>{['Motor', 'Host', 'Puerto', 'Database', 'Schema', 'Librería', 'Acciones'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {list.map((ds) => (
                  <tr key={ds.id} style={styles.tr}>
                    <td style={styles.td}><span style={styles.badge}>{ds.engine}</span></td>
                    <td style={styles.td}>{ds.host}</td>
                    <td style={styles.td}>{ds.port}</td>
                    <td style={styles.td}>{ds.database}</td>
                    <td style={styles.td}><code style={styles.code}>{ds.schema || '—'}</code></td>
                    <td style={styles.td}><code style={styles.code}>{ds.npmLibrary}</code></td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn size="sm" variant="secondary" onClick={() => test(ds.id)} disabled={testing === ds.id}>
                          <TestTube size={13} />{testing === ds.id ? 'Probando...' : 'Test'}
                        </Btn>
                        <Btn size="sm" variant="ghost" onClick={() => startEdit(ds)}><Edit2 size={13} /></Btn>
                        <Btn size="sm" variant="danger" onClick={() => remove(ds.id)}><Trash2 size={13} /></Btn>
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
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1a2a4a' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d9e6', fontSize: 14, outline: 'none' },
  empty: { color: '#5a6a85', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#5a6a85', background: '#f4f6f9', borderBottom: '1px solid #d1d9e6', textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { borderBottom: '1px solid #f0f2f5' },
  td: { padding: '12px 14px', fontSize: 14, color: '#1a2a4a' },
  badge: { background: '#e8f0fe', color: '#003087', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  code: { background: '#f4f6f9', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#0050b3' },
};
