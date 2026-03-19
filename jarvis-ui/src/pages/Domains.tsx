import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Globe, Plus, Trash2, Edit2, X, Check, Tag, PlusCircle } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';

interface EntityField { name: string; type: string; required: boolean }
interface DomainEntity { name: string; fields: EntityField[] }
interface Domain { id: string; name: string; entities: DomainEntity[]; datasourceId?: string }
interface DS { id: string; database: string; engine: string }

const FIELD_TYPES = ['string', 'number', 'boolean', 'Date'];
const EMPTY_FIELD = (): EntityField => ({ name: '', type: 'string', required: true });
const EMPTY_ENTITY = (): DomainEntity => ({ name: '', fields: [{ name: 'id', type: 'string', required: true }] });

export default function Domains() {
  const [list, setList] = useState<Domain[]>([]);
  const [datasources, setDatasources] = useState<DS[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [domainName, setDomainName] = useState('');
  const [datasourceId, setDatasourceId] = useState('');
  const [entities, setEntities] = useState<DomainEntity[]>([EMPTY_ENTITY()]);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => {
    api.get('/domains').then((r) => setList(r.data));
    api.get('/datasources').then((r) => setDatasources(r.data));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setDomainName(''); setDatasourceId('');
    setEntities([EMPTY_ENTITY()]); setEditId(null); setShowForm(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all entity names filled
    if (entities.some((en) => !en.name.trim())) { toast.error('Todas las entidades deben tener nombre'); return; }
    if (entities.some((en) => en.fields.some((f) => !f.name.trim()))) { toast.error('Todos los campos deben tener nombre'); return; }
    const payload = { name: domainName, entities, datasourceId: datasourceId || undefined };
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
    setDomainName(d.name); setDatasourceId(d.datasourceId || '');
    setEntities(d.entities.map((e) => ({ ...e, fields: e.fields.map((f) => ({ ...f })) })));
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

  return (
    <div>
      <div style={styles.pageHeader}>
        <Globe size={22} color="#003087" />
        <div>
          <h1 style={styles.pageTitle}>Domains</h1>
          <p style={styles.pageDesc}>Gestión de dominios clínicos (modelo HL7-like)</p>
        </div>
        <Btn onClick={() => { resetForm(); setShowForm(true); }} style={{ marginLeft: 'auto' }}>
          <Plus size={15} /> Nuevo dominio
        </Btn>
      </div>

      {showForm && (
        <Card title={editId ? 'Editar Dominio' : 'Nuevo Dominio'} style={{ marginBottom: 24 }}>
          <form onSubmit={save}>
            {/* Domain header */}
            <div style={styles.formRow}>
              <div style={{ ...styles.field, flex: 2 }}>
                <label style={styles.label}>Nombre del dominio</label>
                <input style={styles.input} value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="ej: Patients" required />
              </div>
              <div style={{ ...styles.field, flex: 2 }}>
                <label style={styles.label}>Datasource (opcional)</label>
                <select style={styles.input} value={datasourceId} onChange={(e) => setDatasourceId(e.target.value)}>
                  <option value="">-- Sin datasource --</option>
                  {datasources.map((ds) => <option key={ds.id} value={ds.id}>{ds.engine} — {ds.database}</option>)}
                </select>
              </div>
            </div>

            {/* Entities */}
            <div style={{ marginTop: 20 }}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Entidades del dominio</span>
                <Btn size="sm" variant="secondary" onClick={addEntity} type="button">
                  <PlusCircle size={13} /> Agregar entidad
                </Btn>
              </div>

              {entities.map((entity, ei) => (
                <div key={ei} style={styles.entityBlock}>
                  {/* Entity name row */}
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

                  {/* Fields */}
                  <div style={styles.fieldsArea}>
                    {entity.fields.map((field, fi) => (
                      <div key={fi} style={styles.fieldRow}>
                        <span style={styles.fieldIndent} />
                        <input
                          style={{ ...styles.input, ...styles.fieldNameInput }}
                          value={field.name}
                          onChange={(e) => updateField(ei, fi, { name: e.target.value })}
                          placeholder="campo"
                          disabled={fi === 0 && field.name === 'id'}
                        />
                        <span style={styles.colon}>:</span>
                        <select
                          style={{ ...styles.input, ...styles.fieldTypeSelect }}
                          value={field.type}
                          onChange={(e) => updateField(ei, fi, { type: e.target.value })}
                        >
                          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <label style={styles.requiredLabel}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(ei, fi, { required: e.target.checked })}
                            disabled={fi === 0 && field.name === 'id'}
                          />
                          <span style={{ marginLeft: 4, fontSize: 11, color: '#5a6a85' }}>requerido</span>
                        </label>
                        {!(fi === 0 && field.name === 'id') && (
                          <button type="button" style={styles.removeFieldBtn} onClick={() => removeField(ei, fi)}>
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}

                    <button type="button" style={styles.addFieldBtn} onClick={() => addField(ei)}>
                      <PlusCircle size={12} /> agregar campo
                    </button>
                  </div>

                  <div style={styles.braceClose}>{'}'}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Btn type="submit"><Check size={14} /> Guardar dominio</Btn>
              <Btn variant="ghost" onClick={resetForm} type="button"><X size={14} /> Cancelar</Btn>
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
                  <div style={styles.domainIcon}><Globe size={18} color="#003087" /></div>
                  <div>
                    <div style={styles.domainName}>{d.name}</div>
                    {ds && <div style={styles.domainDs}>{ds.engine} — {ds.database}</div>}
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <Btn size="sm" variant="ghost" onClick={() => startEdit(d)}><Edit2 size={13} /></Btn>
                    <Btn size="sm" variant="danger" onClick={() => remove(d.id)}><Trash2 size={13} /></Btn>
                  </div>
                </div>

                {d.entities.map((entity) => (
                  <div key={entity.name} style={styles.entityPreview}>
                    <div style={styles.entityPreviewName}>
                      <Tag size={11} /> {entity.name}
                    </div>
                    <div style={styles.entityPreviewFields}>
                      {entity.fields.map((f) => (
                        <span key={f.name} style={styles.fieldChip}>
                          <span style={{ color: '#003087', fontWeight: 600 }}>{f.name}</span>
                          <span style={{ color: '#5a6a85' }}>: {f.type}{f.required ? '' : '?'}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#003087' },
  pageDesc: { fontSize: 13, color: '#5a6a85', marginTop: 2 },
  formRow: { display: 'flex', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#1a2a4a' },
  input: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d9e6', fontSize: 13, outline: 'none', background: '#fff' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#003087' },
  entityBlock: {
    background: '#f8faff', border: '1.5px solid #d1d9e6', borderRadius: 10,
    padding: '14px 16px', marginBottom: 12, fontFamily: "'Fira Code', 'Consolas', monospace",
  },
  entityNameRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  entityDot: { width: 8, height: 8, borderRadius: '50%', background: '#003087', flexShrink: 0 },
  entityNameInput: { width: 160, fontWeight: 700, color: '#003087', background: '#e8f0fe', border: '1.5px solid #b3c8f0' },
  braceOpen: { color: '#5a6a85', fontSize: 16, fontWeight: 700 },
  braceClose: { color: '#5a6a85', fontSize: 16, fontWeight: 700, marginTop: 4 },
  removeEntityBtn: { marginLeft: 'auto', background: '#fdecea', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#d32f2f', display: 'flex', alignItems: 'center' },
  fieldsArea: { paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 },
  fieldRow: { display: 'flex', alignItems: 'center', gap: 8 },
  fieldIndent: { width: 16, flexShrink: 0 },
  fieldNameInput: { width: 140 },
  colon: { color: '#5a6a85', fontWeight: 700 },
  fieldTypeSelect: { width: 100, color: '#0050b3' },
  requiredLabel: { display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 },
  removeFieldBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', padding: 2, display: 'flex', alignItems: 'center' },
  addFieldBtn: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
    background: 'none', border: '1px dashed #b3c8f0', borderRadius: 6,
    padding: '5px 12px', fontSize: 12, color: '#0050b3', cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  empty: { color: '#5a6a85', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  domainHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  domainIcon: { width: 40, height: 40, borderRadius: 10, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  domainName: { fontWeight: 700, fontSize: 16, color: '#003087' },
  domainDs: { fontSize: 11, color: '#5a6a85', marginTop: 2 },
  entityPreview: { marginBottom: 10 },
  entityPreviewName: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0050b3', marginBottom: 4 },
  entityPreviewFields: { display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 16 },
  fieldChip: { background: '#f4f6f9', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace' },
};
