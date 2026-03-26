// Templates.tsx — CRUD de templates de generación
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LayoutTemplate, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import api from '../api/client';
import { Button, ContentCard, PageHeader, TextInput, SelectInput, StatusBadge } from '@hce/design-system';
import type { Template } from '../types';
import { TEMPLATE_TYPE_OPTIONS, TEMPLATE_TYPE_BADGE_MAP as TYPE_BADGE_MAP } from '../utils/constants';

const EMPTY: Omit<Template, 'id' | 'createdAt'> = { name: '', type: 'nestjs', version: '1.0.0', description: '', path: '', active: true };

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

  const typeOptions = TEMPLATE_TYPE_OPTIONS;

  return (
    <div>
      <PageHeader
        icon={<LayoutTemplate size={20} />}
        title="Templates"
        description="Gestión de templates de generación"
        actions={
          <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); }}>
            <Plus size={15} style={{ marginRight: 6 }} /> Nuevo template
          </Button>
        }
      />

      {showForm && (
        <ContentCard title={editId ? 'Editar Template' : 'Nuevo Template'} style={{ marginBottom: 24 }}>
          <form onSubmit={save} style={styles.formGrid}>
            <TextInput label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <SelectInput
              label="Tipo"
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v as Template['type'] })}
              options={typeOptions}
            />
            <TextInput label="Versión" value={form.version} onChange={(v) => setForm({ ...form, version: v })} />
            <TextInput label="Path" value={form.path} onChange={(v) => setForm({ ...form, path: v })} placeholder="nestjs/hexagonal" />
            <div style={{ gridColumn: '1/-1' }}>
              <TextInput label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10 }}>
              <Button type="submit"><Check size={14} style={{ marginRight: 6 }} /> Guardar</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} type="button">
                <X size={14} style={{ marginRight: 6 }} /> Cancelar
              </Button>
            </div>
          </form>
        </ContentCard>
      )}

      <div style={styles.grid}>
        {list.map((t) => (
          <ContentCard key={t.id}>
            <div style={styles.tHeader}>
              <StatusBadge label={t.type} variant={TYPE_BADGE_MAP[t.type] ?? 'neutral'} />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <Button size="sm" variant="ghost" onClick={() => {
                  setForm({ name: t.name, type: t.type as Template['type'], version: t.version, description: t.description, path: t.path, active: t.active });
                  setEditId(t.id); setShowForm(true);
                }}>
                  <Edit2 size={13} />
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(t.id)}><Trash2 size={13} /></Button>
              </div>
            </div>
            <div style={styles.tName}>{t.name}</div>
            <div style={styles.tDesc}>{t.description}</div>
            <div style={styles.tMeta}>
              <span>v{t.version}</span>
              <StatusBadge label={t.active ? 'Activo' : 'Inactivo'} variant={t.active ? 'success' : 'error'} />
            </div>
          </ContentCard>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  tHeader: { display: 'flex', alignItems: 'center', marginBottom: 10 },
  tName: { fontWeight: 700, fontSize: 15, color: 'var(--jarvis-primary)', marginBottom: 4 },
  tDesc: { fontSize: 13, color: 'var(--jarvis-text-secondary)', marginBottom: 10 },
  tMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--jarvis-text-secondary)' },
};
