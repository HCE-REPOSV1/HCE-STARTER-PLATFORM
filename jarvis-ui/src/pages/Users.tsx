// Users.tsx — CRUD de usuarios con roles ADMIN / DEV
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users as UsersIcon, Plus, Edit2, Trash2, X, Check, ShieldCheck, ShieldOff } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';
import type { User } from '../types';

const EMPTY = { username: '', password: '', role: 'DEV' as const };

export default function Users() {
  const [list, setList] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ username: string; password: string; role: 'ADMIN' | 'DEV' }>({ ...EMPTY });
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => api.get('/users').then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) { await api.put(`/users/${editId}`, { role: form.role, ...(form.password && { password: form.password }) }); toast.success('Usuario actualizado'); }
      else { await api.post('/users', form); toast.success('Usuario creado'); }
      setShowForm(false); setEditId(null); setForm({ ...EMPTY }); load();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error al guardar'); }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar usuario?')) return;
    await api.delete(`/users/${id}`); toast.success('Eliminado'); load();
  };

  const toggleActive = async (u: User) => {
    await api.put(`/users/${u.id}`, { active: !u.active });
    toast.success(u.active ? 'Usuario desactivado' : 'Usuario activado'); load();
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <UsersIcon size={22} color="#003087" />
        <div><h1 style={styles.pageTitle}>Usuarios</h1><p style={styles.pageDesc}>Gestión de acceso a la plataforma</p></div>
        <Btn onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); }} style={{ marginLeft: 'auto' }}>
          <Plus size={15} /> Nuevo usuario
        </Btn>
      </div>

      {showForm && (
        <Card title={editId ? 'Editar Usuario' : 'Nuevo Usuario'} style={{ marginBottom: 24 }}>
          <form onSubmit={save} style={styles.form}>
            {!editId && (
              <div style={styles.field}>
                <label style={styles.label}>Username</label>
                <input style={styles.input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
            )}
            <div style={styles.field}>
              <label style={styles.label}>{editId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
              <input style={styles.input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Rol</label>
              <select style={styles.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
                <option value="ADMIN">ADMIN</option>
                <option value="DEV">DEV</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn type="submit"><Check size={14} /> Guardar</Btn>
              <Btn variant="ghost" onClick={() => setShowForm(false)} type="button"><X size={14} /> Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Usuarios (${list.length})`}>
        {list.length === 0 ? <p style={styles.empty}>No hay usuarios.</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Usuario', 'Rol', 'Estado', 'Creado', 'Acciones'].map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}><strong>{u.username}</strong></td>
                    <td style={styles.td}><span style={{ ...styles.badge, background: u.role === 'ADMIN' ? '#003087' : '#e8f0fe', color: u.role === 'ADMIN' ? '#fff' : '#003087' }}>{u.role}</span></td>
                    <td style={styles.td}><span style={{ ...styles.badge, background: u.active ? '#e8f5e9' : '#fdecea', color: u.active ? '#2e7d32' : '#d32f2f' }}>{u.active ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={styles.td}><span style={styles.ts}>{new Date(u.createdAt).toLocaleDateString('es-PE')}</span></td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn size="sm" variant="ghost" onClick={() => { setForm({ username: u.username, password: '', role: u.role }); setEditId(u.id); setShowForm(true); }}><Edit2 size={13} /></Btn>
                        <Btn size="sm" variant="secondary" onClick={() => toggleActive(u)}>{u.active ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}</Btn>
                        <Btn size="sm" variant="danger" onClick={() => remove(u.id)}><Trash2 size={13} /></Btn>
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
  form: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1a2a4a' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d9e6', fontSize: 14, outline: 'none' },
  empty: { color: '#5a6a85', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#5a6a85', background: '#f4f6f9', borderBottom: '1px solid #d1d9e6', textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { borderBottom: '1px solid #f0f2f5' },
  td: { padding: '12px 14px', fontSize: 14, color: '#1a2a4a' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  ts: { color: '#5a6a85', fontSize: 12 },
};
