import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Globe, Plus, Trash2, Edit2, X, Check, Tag, PlusCircle, Lock } from 'lucide-react';
import api from '../api/client';
import { Button, Card, PageHeader, TextInput, SelectInput } from '@jarvis/design-system';

interface EntityField {
  name: string; type: string; required: boolean;
  size?: number;
  isPk?: boolean; isIdentity?: boolean; isUnique?: boolean;
}
interface DomainEntity { name: string; fields: EntityField[] }
interface Domain { id: string; name: string; schema?: string; entities: DomainEntity[]; datasourceId?: string }
interface DS { id: string; database: string; engine: string }

const FIELD_TYPES = ['string', 'number', 'boolean', 'Date'];

// Audit fields always appended to every entity on save — not editable by user
const AUDIT_FIELDS: EntityField[] = [
  { name: 'user_create',  type: 'string',  required: true,  size: 10 },
  { name: 'user_modify',  type: 'Date',    required: false },
  { name: 'date_create',  type: 'string',  required: true,  size: 10 },
  { name: 'date_modify',  type: 'Date',    required: false },
  { name: 'is_active',    type: 'boolean', required: true  },
];
const AUDIT_NAMES = new Set(AUDIT_FIELDS.map((f) => f.name));

const EMPTY_FIELD = (): EntityField => ({ name: '', type: 'string', required: true, size: 10 });
const EMPTY_ENTITY = (): DomainEntity => ({
  name: '',
  fields: [{ name: 'id', type: 'number', required: true, isPk: true, isIdentity: true, isUnique: true }],
});

export default function Domains() {
  const [list, setList] = useState<Domain[]>([]);
  const [datasources, setDatasources] = useState<DS[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [domainName, setDomainName] = useState('');
  const [domainSchema, setDomainSchema] = useState('');
  const [datasourceId, setDatasourceId] = useState('');
  const [entities, setEntities] = useState<DomainEntity[]>([EMPTY_ENTITY()]);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => {
    api.get('/domains').then((r) => setList(r.data));
    api.get('/datasources').then((r) => setDatasources(r.data));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setDomainName(''); setDomainSchema(''); setDatasourceId('');
    setEntities([EMPTY_ENTITY()]); setEditId(null); setShowForm(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entities.some((en) => !en.name.trim())) { toast.error('Todas las entidades deben tener nombre'); return; }
    if (entities.some((en) => en.fields.some((f) => !f.name.trim()))) { toast.error('Todos los campos deben tener nombre'); return; }
    // Inject audit fields (remove any duplicates first, then append)
    const entitiesWithAudit = entities.map((en) => ({
      ...en,
      fields: [...en.fields.filter((f) => !AUDIT_NAMES.has(f.name)), ...AUDIT_FIELDS],
    }));
    const payload = { name: domainName, schema: domainSchema || undefined, entities: entitiesWithAudit, datasourceId: datasourceId || undefined };
    try {
      if (editId) { await api.put(`/domains/${editId}`, payload); toast.success('Dominio actualizado'); }
      else { await api.post('/domains', payload); toast.success('Dominio creado'); }
      resetForm(); load();
    } catch { toast.error('Error al guardar'); }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar dominio?')) return;
    await api.delete(`/domains/${id}`);
    toast.success('Eliminado'); load();
  };

  const startEdit = (d: Domain) => {
    setDomainName(d.name); setDomainSchema(d.schema || ''); setDatasourceId(d.datasourceId || '');
    // Strip audit fields so they don't appear in the editable section
    setEntities(d.entities.map((e) => ({
      ...e,
      fields: e.fields.filter((f) => !AUDIT_NAMES.has(f.name)).map((f) => ({ ...f })),
    })));
    setEditId(d.id); setShowForm(true);
  };

  // Entity helpers
  const addEntity = () => setEntities([...entities, EMPTY_ENTITY()]);
  const removeEntity = (i: number) => setEntities(entities.filter((_, idx) => idx !== i));
  const updateEntityName = (i: number, name: string) => {
    const next = [...entities]; next[i] = { ...next[i], name }; setEntities(next);
  };

  // Field helpers
  const addField = (ei: number) => {
    const next = [...entities]; next[ei].fields = [...next[ei].fields, EMPTY_FIELD()]; setEntities(next);
  };
  const removeField = (ei: number, fi: number) => {
    const next = [...entities]; next[ei].fields = next[ei].fields.filter((_, idx) => idx !== fi); setEntities(next);
  };
  const updateField = (ei: number, fi: number, patch: Partial<EntityField>) => {
    const next = [...entities];
    next[ei].fields[fi] = { ...next[ei].fields[fi], ...patch };
    setEntities(next);
  };

  const datasourceOptions = [
    { value: '', label: '-- Sin datasource --' },
    ...datasources.map((ds) => ({ value: ds.id, label: `${ds.engine} — ${ds.database}` })),
  ];

  return (
    <div>
      <PageHeader
        icon={<Globe size={20} />}
        title="Domains"
        description="Gestión de dominios clínicos (modelo HL7-like)"
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} style={{ marginRight: 6 }} /> Nuevo dominio
          </Button>
        }
      />

      {showForm && (
        <Card title={editId ? 'Editar Dominio' : 'Nuevo Dominio'} style={{ marginBottom: 24 }}>
          <form onSubmit={save}>
            <div style={styles.formRow}>
              <div style={{ flex: 2 }}>
                <TextInput
                  label="Nombre del dominio"
                  value={domainName}
                  onChange={setDomainName}
                  placeholder="ej: Patients"
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextInput
                  label="Schema de BD"
                  value={domainSchema}
                  onChange={setDomainSchema}
                  placeholder="ej: clinica"
                />
              </div>
              <div style={{ flex: 2 }}>
                <SelectInput
                  label="Datasource (opcional)"
                  value={datasourceId}
                  onChange={setDatasourceId}
                  options={datasourceOptions}
                />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Entidades del dominio</span>
                <Button size="sm" variant="secondary" onClick={addEntity} type="button">
                  <PlusCircle size={13} style={{ marginRight: 4 }} /> Agregar entidad
                </Button>
              </div>

              {entities.map((entity, ei) => (
                <div key={ei} style={styles.entityBlock}>
                  <div style={styles.entityNameRow}>
                    <div style={styles.entityDot} />
                    <input
                      style={{ ...styles.input, ...styles.entityNameInput }}
                      value={entity.name}
                      onChange={(e) => updateEntityName(ei, e.target.value)}
                      placeholder="nombre entidad (ej: patient)"
                    />
                    <span style={styles.braceOpen}>{' {'}</span>
                    {entities.length > 1 && (
                      <button type="button" style={styles.removeEntityBtn} onClick={() => removeEntity(ei)}>
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div style={styles.fieldsArea}>
                    {entity.fields.map((field, fi) => (
                      <div key={fi} style={{ marginBottom: fi === 0 ? 10 : 0 }}>
                        <div style={styles.fieldRow}>
                          <span style={styles.fieldIndent} />
                          <input
                            style={{ ...styles.input, ...styles.fieldNameInput }}
                            value={field.name}
                            onChange={(e) => updateField(ei, fi, { name: e.target.value })}
                            placeholder="campo"
                          />
                          <span style={styles.colon}>:</span>
                          <select
                            style={{ ...styles.input, ...styles.fieldTypeSelect }}
                            value={field.type}
                            onChange={(e) => {
                              const t = e.target.value;
                              updateField(ei, fi, { type: t, size: t === 'string' ? (field.size ?? 10) : undefined });
                            }}
                          >
                            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {field.type === 'string' && (
                            <input
                              style={{ ...styles.input, ...styles.sizeInput }}
                              type="number"
                              min={1}
                              value={field.size ?? 10}
                              onChange={(e) => updateField(ei, fi, { size: Number(e.target.value) || 1 })}
                              title="Tamaño varchar"
                            />
                          )}
                          <label style={styles.requiredLabel}>
                            <input
                              type="checkbox"
                              checked={field.required}
                              disabled={fi === 0}
                              onChange={(e) => updateField(ei, fi, { required: e.target.checked })}
                            />
                            <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--jarvis-text-secondary)' }}>not null</span>
                          </label>
                          {fi > 0 && (
                            <button type="button" style={styles.removeFieldBtn} onClick={() => removeField(ei, fi)}>
                              <X size={11} />
                            </button>
                          )}
                        </div>
                        {/* PK / Identity / Unique toggles — first field only */}
                        {fi === 0 && (
                          <div style={styles.pkRow}>
                            <span style={styles.fieldIndent} /><span style={styles.fieldIndent} />
                            <label style={styles.pkToggle}>
                              <input type="checkbox" checked={!!field.isPk} onChange={(e) => updateField(ei, fi, { isPk: e.target.checked })} />
                              <span>PK</span>
                            </label>
                            <label style={{ ...styles.pkToggle, opacity: field.type !== 'number' ? 0.45 : 1 }}>
                              <input
                                type="checkbox"
                                checked={!!field.isIdentity}
                                disabled={field.type !== 'number'}
                                onChange={(e) => updateField(ei, fi, { isIdentity: e.target.checked })}
                              />
                              <span>Identity (1,1)</span>
                            </label>
                            <label style={styles.pkToggle}>
                              <input type="checkbox" checked={!!field.isUnique} onChange={(e) => updateField(ei, fi, { isUnique: e.target.checked })} />
                              <span>Unique</span>
                            </label>
                          </div>
                        )}
                      </div>
                    ))}

                    <button type="button" style={styles.addFieldBtn} onClick={() => addField(ei)}>
                      <PlusCircle size={12} /> agregar campo
                    </button>

                    {/* Audit fields — always locked */}
                    <div style={styles.auditSection}>
                      <div style={styles.auditHeader}><Lock size={10} /> campos de auditoría (obligatorios)</div>
                      {AUDIT_FIELDS.map((f) => (
                        <div key={f.name} style={styles.auditRow}>
                          <span style={styles.fieldIndent} />
                          <span style={styles.auditName}>{f.name}</span>
                          <span style={styles.colon}>:</span>
                          <span style={styles.auditType}>{f.type}{f.size ? `(${f.size})` : ''}</span>
                          <span style={styles.auditNull}>{f.required ? 'not null' : 'null'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={styles.braceClose}>{'}'}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button type="submit"><Check size={14} style={{ marginRight: 6 }} /> Guardar dominio</Button>
              <Button variant="ghost" onClick={resetForm} type="button"><X size={14} style={{ marginRight: 6 }} /> Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Domain cards */}
      <div style={styles.grid}>
        {list.length === 0 ? (
          <Card><p style={styles.empty}>No hay dominios configurados.</p></Card>
        ) : (
          list.map((d) => {
            const ds = datasources.find((x) => x.id === d.datasourceId);
            return (
              <Card key={d.id} style={{ position: 'relative' }}>
                <div style={styles.domainHeader}>
                  <div style={styles.domainIcon}><Globe size={18} color="var(--jarvis-primary)" /></div>
                  <div>
                    <div style={styles.domainName}>{d.name}</div>
                    {d.schema && <div style={styles.domainSchema}><code>{d.schema}</code></div>}
                    {ds && <div style={styles.domainDs}>{ds.engine} — {ds.database}</div>}
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(d)}><Edit2 size={13} /></Button>
                    <Button size="sm" variant="danger" onClick={() => remove(d.id)}><Trash2 size={13} /></Button>
                  </div>
                </div>

                {d.entities.map((entity) => {
                  const userFields = entity.fields.filter((f) => !AUDIT_NAMES.has(f.name));
                  return (
                    <div key={entity.name} style={styles.entityPreview}>
                      <div style={styles.entityPreviewName}>
                        <Tag size={11} /> {entity.name}
                      </div>
                      <div style={styles.entityPreviewFields}>
                        {userFields.map((f) => (
                          <span key={f.name} style={styles.fieldChip}>
                            <span style={{ color: 'var(--jarvis-primary)', fontWeight: 600 }}>{f.name}</span>
                            {f.isPk && <span style={styles.pkBadge}>PK</span>}
                            <span style={{ color: 'var(--jarvis-text-secondary)' }}>: {f.type}{f.size ? `(${f.size})` : ''}{f.required ? '' : '?'}</span>
                          </span>
                        ))}
                        <span style={styles.auditChip}><Lock size={9} /> +5 auditoría</span>
                      </div>
                    </div>
                  );
                })}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  formRow: { display: 'flex', gap: 16 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: 'var(--jarvis-primary)' },
  input: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--jarvis-border)', fontSize: 13, outline: 'none', background: '#fff' },
  entityBlock: {
    background: '#f8faff', border: '1.5px solid var(--jarvis-border)', borderRadius: 10,
    padding: '14px 16px', marginBottom: 12, fontFamily: "'Fira Code', 'Consolas', monospace",
  },
  entityNameRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  entityDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--jarvis-primary)', flexShrink: 0 },
  entityNameInput: { width: 160, fontWeight: 700, color: 'var(--jarvis-primary)', background: 'var(--jarvis-hover)', border: '1.5px solid var(--jarvis-border)' },
  braceOpen: { color: 'var(--jarvis-text-secondary)', fontSize: 16, fontWeight: 700 },
  braceClose: { color: 'var(--jarvis-text-secondary)', fontSize: 16, fontWeight: 700, marginTop: 4 },
  removeEntityBtn: { marginLeft: 'auto', background: '#FFEBEE', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: 'var(--jarvis-error)', display: 'flex', alignItems: 'center' },
  fieldsArea: { paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 },
  fieldRow: { display: 'flex', alignItems: 'center', gap: 8 },
  pkRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 },
  pkToggle: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--jarvis-primary)', cursor: 'pointer', background: 'var(--jarvis-hover)', padding: '3px 8px', borderRadius: 5, border: '1px solid var(--jarvis-border)' },
  fieldIndent: { width: 16, flexShrink: 0 },
  fieldNameInput: { width: 140 },
  colon: { color: 'var(--jarvis-text-secondary)', fontWeight: 700 },
  fieldTypeSelect: { width: 100, color: 'var(--jarvis-primary)' },
  sizeInput: { width: 56, textAlign: 'center', color: 'var(--jarvis-text-secondary)', padding: '8px 6px' },
  requiredLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 },
  removeFieldBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--jarvis-error)', padding: 2, display: 'flex', alignItems: 'center' },
  addFieldBtn: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
    background: 'none', border: '1px dashed var(--jarvis-border)', borderRadius: 6,
    padding: '5px 12px', fontSize: 12, color: 'var(--jarvis-primary)', cursor: 'pointer',
  },
  auditSection: { marginTop: 10, borderTop: '1px dashed var(--jarvis-border)', paddingTop: 8 },
  auditHeader: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'var(--jarvis-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  auditRow: { display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 },
  auditName: { fontSize: 12, color: 'var(--jarvis-text-secondary)', width: 140 },
  auditType: { fontSize: 12, color: 'var(--jarvis-primary)', width: 100 },
  auditNull: { fontSize: 11, color: '#9aabad', fontStyle: 'italic' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  empty: { color: 'var(--jarvis-text-secondary)', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  domainHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  domainIcon: { width: 40, height: 40, borderRadius: 10, background: 'var(--jarvis-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  domainName: { fontWeight: 700, fontSize: 16, color: 'var(--jarvis-primary)' },
  domainSchema: { fontSize: 11, color: 'var(--jarvis-primary)', marginTop: 2 },
  domainDs: { fontSize: 11, color: 'var(--jarvis-text-secondary)', marginTop: 2 },
  entityPreview: { marginBottom: 10 },
  entityPreviewName: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--jarvis-primary)', marginBottom: 4 },
  entityPreviewFields: { display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 16 },
  fieldChip: { background: 'var(--jarvis-bg)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 },
  pkBadge: { background: 'var(--jarvis-primary)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3 },
  auditChip: { background: 'var(--jarvis-row-alt)', color: '#9aabad', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 3 },
};
