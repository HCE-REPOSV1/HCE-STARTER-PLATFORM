// Templates.tsx — CRUD de templates de generación
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LayoutTemplate, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';
import type { Template } from '../types';

const EMPTY: Omit<Template, 'id' | 'createdAt'> = { name: '', type: 'nestjs', version: '1.0.0', description: '', path: '', active: true };
const TYPES = ['nestjs', 'react', 'openapi', 'docker', 'readme'];

export default function Templates() {
  const [list, setList] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => api.get('/templates').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/templates/${editId}`, form); toast.success('Template actualizado'); }
      else { await api.post('/templates', form); toast.success('Template creado'); }
      setShowForm(false); setEditId(null); setForm({ ...EMPTY }); load();
    } catch { toast.error('Error al guardar'); }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar template?')) return;
    await api.delete(`/templates/${id}`); toast.success('Eliminado'); load();
  };

  const TYPE_COLORS: Record<string, string> = { nestjs: '#e8f0fe', react: '#e3f2fd', openapi: '#fff3e0', docker: '#e8f5e9', readme: '#f3e5f5' };
  const TYPE_TEXT: Record<string, string> = { nestjs: '#003087', react: '#0050b3', openapi: '#e65100', docker: '#2e7d32', readme: '#6a1b9a' };

  return (
    <div>
      <div style={styles.pageHeader}>
        <LayoutTemplate size={22} color="#003087" />
        <div><h1 style={styles.pageTitle}>Templates</h1><p style={styles.pageDesc}>Gestión de templates de generación</p></div>
        <Btn onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); }} style={{ marginLeft: 'auto' }}>
          <Plus size={15} /> Nuevo template
        </Btn>
      </div>

      {showForm && (
        <Card title={editId ? 'Editar Template' : 'Nuevo Template'} style={{ marginBottom: 24 }}>
          <form onSubmit={save} style={styles.formGrid}>
            <div style={styles.field}><label style={styles.label}>Nombre</label><input style={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div style={styles.field}><label style={styles.label}>Tipo</label>
              <select style={styles.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={styles.field}><label style={styles.label}>Versión</label><input style={styles.input} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
            <div style={styles.field}><label style={styles.label}>Path</label><input style={styles.input} value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="nestjs/hexagonal" /></div>
            <div style={{ ...styles.field, gridColumn: '1/-1' }}><label style={styles.label}>Descripción</label><input style={styles.input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
              <Btn type="submit"><Check size={14} /> Guardar</Btn>
              <Btn variant="ghost" onClick={() => setShowForm(false)} type="button"><X size={14} /> Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      <div style={styles.grid}>
        {list.map((t) => (
          <Card key={t.id}>
            <div style={styles.tHeader}>
              <span style={{ ...styles.typeBadge, background: TYPE_COLORS[t.type] ?? '#f4f6f9', color: TYPE_TEXT[t.type] ?? '#5a6a85' }}>{t.type}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <Btn size="sm" variant="ghost" onClick={() => { setForm({ name: t.name, type: t.type as any, version: t.version, description: t.description, path: t.path, active: t.active }); setEditId(t.id); setShowForm(true); }}><Edit2 size={13} /></Btn>
                <Btn size="sm" variant="danger" onClick={() => remove(t.id)}><Trash2 size={13} /></Btn>
              </div>
            </div>
            <div style={styles.tName}>{t.name}</div>
            <div style={styles.tDesc}>{t.description}</div>
            <div style={styles.tMeta}>
              <span>v{t.version}</span>
              <span style={{ color: t.active ? '#2e7d32' : '#d32f2f' }}>{t.active ? '● Activo' : '○ Inactivo'}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#003087' },
  pageDesc: { fontSize: 13, color: '#5a6a85', marginTop: 2 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1a2a4a' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d9e6', fontSize: 14, outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  tHeader: { display: 'flex', alignItems: 'center', marginBottom: 10 },
  typeBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  tName: { fontWeight: 700, fontSize: 15, color: '#003087', marginBottom: 4 },
  tDesc: { fontSize: 13, color: '#5a6a85', marginBottom: 10 },
  tMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#5a6a85' },
};
