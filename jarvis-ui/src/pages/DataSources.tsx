import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Database, Plus, Trash2, TestTube, Edit2, X, Check } from 'lucide-react';
import api from '../api/client';
import { Button, Card, PageHeader, DataTable, TextInput, SelectInput, StatusBadge } from '@jarvis/design-system';
import { DB_ENGINE_OPTIONS } from '../utils/constants';
import type { Datasource } from '../types';

const ENGINE_DEFAULTS: Record<string, { port: number; npmLibrary: string; username: string; schema: string }> = {
  PostgreSQL:   { port: 5432,  npmLibrary: 'pg',     username: 'postgres', schema: 'public' },
  MySQL:        { port: 3306,  npmLibrary: 'mysql2',  username: 'root',     schema: '' },
  'SQL Server': { port: 1433,  npmLibrary: 'mssql',   username: 'sa',       schema: 'dbo' },
};

const EMPTY: Omit<Datasource, 'id'> = { engine: 'PostgreSQL', host: 'localhost', port: 5432, username: 'postgres', password: '', database: '', schema: 'public', instanceName: '', npmLibrary: 'pg' };

export default function DataSources() {
  const [list, setList] = useState<Datasource[]>([]);
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

  const startEdit = (ds: Datasource) => {
    setForm({ engine: ds.engine, host: ds.host, port: ds.port, username: ds.username, password: ds.password, database: ds.database, schema: ds.schema ?? '', instanceName: ds.instanceName ?? '', npmLibrary: ds.npmLibrary });
    setEditId(ds.id); setShowForm(true);
  };

  const onEngineChange = (engine: string) => {
    const defaults = ENGINE_DEFAULTS[engine];
    if (defaults) setForm(f => ({ ...f, engine, port: defaults.port, npmLibrary: defaults.npmLibrary, username: defaults.username, schema: defaults.schema }));
    else setForm(f => ({ ...f, engine }));
  };

  const engineOptions = [...DB_ENGINE_OPTIONS];

  const columns = [
    {
      key: 'engine',
      label: 'Motor',
      render: (_: unknown, row: Datasource) => <StatusBadge label={row.engine} variant="primary" />,
    },
    { key: 'host', label: 'Host' },
    { key: 'port', label: 'Puerto' },
    { key: 'database', label: 'Database' },
    {
      key: 'schema',
      label: 'Schema',
      render: (_: unknown, row: Datasource) => (
        <code style={{ background: 'var(--jarvis-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: 'var(--jarvis-primary)' }}>
          {row.schema || '—'}
        </code>
      ),
    },
    {
      key: 'npmLibrary',
      label: 'Librería',
      render: (_: unknown, row: Datasource) => (
        <code style={{ background: 'var(--jarvis-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: 'var(--jarvis-primary)' }}>
          {row.npmLibrary}
        </code>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: unknown, row: Datasource) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="secondary" onClick={() => test(row.id)} disabled={testing === row.id}>
            <TestTube size={13} style={{ marginRight: 4 }} />{testing === row.id ? 'Probando...' : 'Test'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => startEdit(row)}><Edit2 size={13} /></Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}><Trash2 size={13} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<Database size={20} />}
        title="DataSources"
        description="Gestión de conexiones a bases de datos"
        actions={
          <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); }}>
            <Plus size={15} style={{ marginRight: 6 }} /> Nueva conexión
          </Button>
        }
      />

      {showForm && (
        <Card title={editId ? 'Editar Datasource' : 'Nueva Conexión'} style={{ marginBottom: 24 }}>
          <form onSubmit={save} style={styles.formGrid}>
            <div>
              <SelectInput
                label="Motor"
                value={form.engine}
                onChange={onEngineChange}
                options={engineOptions}
                required
              />
            </div>
            <TextInput
              label="Host"
              value={form.host}
              onChange={(v) => setForm({ ...form, host: v })}
              placeholder="192.168.1.10"
              required
            />
            <TextInput
              label="Puerto"
              value={String(form.port)}
              onChange={(v) => setForm({ ...form, port: Number(v) })}
              type="number"
              required
            />
            <TextInput
              label="Usuario"
              value={form.username}
              onChange={(v) => setForm({ ...form, username: v })}
              required
            />
            <TextInput
              label="Password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              type="password"
            />
            <TextInput
              label="Database"
              value={form.database}
              onChange={(v) => setForm({ ...form, database: v })}
              placeholder="clinica"
              required
            />
            <TextInput
              label="Schema"
              value={form.schema ?? ''}
              onChange={(v) => setForm({ ...form, schema: v })}
              placeholder="dbo / public"
            />
            {form.engine === 'SQL Server' && (
              <TextInput
                label="Instancia (opcional)"
                value={form.instanceName ?? ''}
                onChange={(v) => setForm({ ...form, instanceName: v })}
                placeholder="INST01"
              />
            )}
            <TextInput
              label="Librería npm"
              value={form.npmLibrary}
              onChange={() => {}}
              disabled
            />
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, marginTop: 8 }}>
              <Button type="submit"><Check size={14} style={{ marginRight: 6 }} /> Guardar</Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X size={14} style={{ marginRight: 6 }} /> Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Conexiones configuradas (${list.length})`}>
        <DataTable
          columns={columns}
          rows={list}
          emptyMessage="No hay datasources configurados."
        />
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 },
};
