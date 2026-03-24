// Users.tsx — CRUD de usuarios con roles ADMIN / DEV
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users as UsersIcon, Plus, Edit2, Trash2, X, Check, ShieldCheck, ShieldOff } from 'lucide-react';
import api from '../api/client';
import { Button, Card, PageHeader, DataTable, TextInput, SelectInput, StatusBadge } from '@jarvis/design-system';
import type { User } from '../types';
import { USER_ROLE_OPTIONS } from '../utils/constants';

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
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message ?? 'Error al guardar');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar usuario?')) return;
    await api.delete(`/users/${id}`); toast.success('Eliminado'); load();
  };

  const toggleActive = async (u: User) => {
    await api.put(`/users/${u.id}`, { active: !u.active });
    toast.success(u.active ? 'Usuario desactivado' : 'Usuario activado'); load();
  };

  const roleOptions = [...USER_ROLE_OPTIONS];

  const columns = [
    {
      key: 'username',
      label: 'Usuario',
      render: (_: unknown, row: User) => <strong>{row.username}</strong>,
    },
    {
      key: 'role',
      label: 'Rol',
      render: (_: unknown, row: User) => (
        <StatusBadge label={row.role} variant={row.role === 'ADMIN' ? 'primary' : 'neutral'} />
      ),
    },
    {
      key: 'active',
      label: 'Estado',
      render: (_: unknown, row: User) => (
        <StatusBadge label={row.active ? 'Activo' : 'Inactivo'} variant={row.active ? 'success' : 'error'} />
      ),
    },
    {
      key: 'createdAt',
      label: 'Creado',
      render: (_: unknown, row: User) => (
        <span style={{ color: 'var(--jarvis-text-secondary)', fontSize: 12 }}>
          {new Date(row.createdAt).toLocaleDateString('es-PE')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: unknown, row: User) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={() => {
            setForm({ username: row.username, password: '', role: row.role });
            setEditId(row.id); setShowForm(true);
          }}>
            <Edit2 size={13} />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => toggleActive(row)}>
            {row.active ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
          </Button>
          <Button size="sm" variant="danger" onClick={() => remove(row.id)}><Trash2 size={13} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={<UsersIcon size={20} />}
        title="Usuarios"
        description="Gestión de acceso a la plataforma"
        actions={
          <Button onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }); }}>
            <Plus size={15} style={{ marginRight: 6 }} /> Nuevo usuario
          </Button>
        }
      />

      {showForm && (
        <Card title={editId ? 'Editar Usuario' : 'Nuevo Usuario'} style={{ marginBottom: 24 }}>
          <form onSubmit={save} style={styles.form}>
            {!editId && (
              <TextInput
                label="Username"
                value={form.username}
                onChange={(v) => setForm({ ...form, username: v })}
                required
              />
            )}
            <TextInput
              label={editId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              type="password"
              required={!editId}
            />
            <SelectInput
              label="Rol"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v as 'ADMIN' | 'DEV' })}
              options={roleOptions}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <Button type="submit"><Check size={14} style={{ marginRight: 6 }} /> Guardar</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} type="button">
                <X size={14} style={{ marginRight: 6 }} /> Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Usuarios (${list.length})`}>
        <DataTable
          columns={columns}
          rows={list}
          emptyMessage="No hay usuarios."
        />
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 },
};
