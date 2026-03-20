import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileCode, Plus, Trash2, Download, Check, X, Tag } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';

interface EntityField { name: string; type: string; required: boolean }
interface DomainEntity { name: string; fields: EntityField[] }
interface Domain { id: string; name: string; entities: DomainEntity[] }
interface OpenApiSpec {
  id: string; name: string; domainId: string; domainName: string;
  selectedEntities: string[]; yaml: string; createdAt: string;
}

export default function OpenApiSpecs() {
  const [list, setList] = useState<OpenApiSpec[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [specName, setSpecName] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);

  const load = () => {
    api.get('/openapi-specs').then((r) => setList(r.data));
    api.get('/domains').then((r) => setDomains(r.data));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setSpecName(''); setSelectedDomainId(''); setSelectedEntities([]); setShowForm(false);
  };

  const selectedDomain = domains.find((d) => d.id === selectedDomainId);

  const onDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    setSelectedEntities([]);
  };

  const toggleEntity = (entityName: string) => {
    setSelectedEntities((prev) =>
      prev.includes(entityName) ? prev.filter((e) => e !== entityName) : [...prev, entityName],
    );
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specName.trim()) { toast.error('El nombre es requerido'); return; }
    if (!selectedDomainId) { toast.error('Selecciona un dominio'); return; }
    if (selectedEntities.length === 0) { toast.error('Selecciona al menos una entidad'); return; }
    try {
      await api.post('/openapi-specs', { name: specName, domainId: selectedDomainId, selectedEntities });
      toast.success('OpenAPI Spec creado');
      resetForm(); load();
    } catch { toast.error('Error al crear el spec'); }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar OpenAPI Spec?')) return;
    await api.delete(`/openapi-specs/${id}`);
    toast.success('Eliminado'); load();
  };

  const download = (id: string, name: string) => {
    const filename = `${name.toLowerCase().replace(/\s+/g, '-')}-openapi.yaml`;
    api.get(`/openapi-specs/${id}/download`, { responseType: 'blob' })
      .then((r) => {
        const url = URL.createObjectURL(new Blob([r.data], { type: 'text/yaml' }));
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Error al descargar'));
  };

  return (
    <div>
      <div style={styles.pageHeader}>
        <FileCode size={22} color="#003087" />
        <div>
          <h1 style={styles.pageTitle}>OpenAPI Specs</h1>
          <p style={styles.pageDesc}>Contratos OpenAPI generados desde dominios</p>
        </div>
        <Btn onClick={() => { resetForm(); setShowForm(true); }} style={{ marginLeft: 'auto' }}>
          <Plus size={15} /> Nuevo Spec
        </Btn>
      </div>

      {showForm && (
        <Card title="Nuevo OpenAPI Spec" style={{ marginBottom: 24 }}>
          <form onSubmit={save}>
            <div style={styles.formRow}>
              <div style={{ ...styles.field, flex: 2 }}>
                <label style={styles.label}>Nombre del spec</label>
                <input
                  style={styles.input}
                  value={specName}
                  onChange={(e) => setSpecName(e.target.value)}
                  placeholder="ej: patients-api"
                  required
                />
              </div>
              <div style={{ ...styles.field, flex: 2 }}>
                <label style={styles.label}>Dominio</label>
                <select
                  style={styles.input}
                  value={selectedDomainId}
                  onChange={(e) => onDomainChange(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar dominio --</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.entities.length} entidades)</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedDomain && selectedDomain.entities.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionTitle}>Entidades a incluir</span>
                  <button
                    type="button"
                    style={styles.selectAllBtn}
                    onClick={() => {
                      if (selectedEntities.length === selectedDomain.entities.length) {
                        setSelectedEntities([]);
                      } else {
                        setSelectedEntities(selectedDomain.entities.map((e) => e.name));
                      }
                    }}
                  >
                    {selectedEntities.length === selectedDomain.entities.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                <div style={styles.entityCheckGrid}>
                  {selectedDomain.entities.map((entity) => {
                    const checked = selectedEntities.includes(entity.name);
                    return (
                      <div
                        key={entity.name}
                        onClick={() => toggleEntity(entity.name)}
                        style={{ ...styles.entityCheckItem, borderColor: checked ? '#003087' : '#d1d9e6', background: checked ? '#e8f0fe' : '#fff' }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${checked ? '#003087' : '#d1d9e6'}`,
                          background: checked ? '#003087' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {checked && <Check size={10} color="#fff" />}
                        </div>
                        <Tag size={12} color={checked ? '#003087' : '#5a6a85'} />
                        <span style={{ fontSize: 13, color: checked ? '#003087' : '#1a2a4a', fontWeight: checked ? 600 : 400 }}>
                          {entity.name}
                        </span>
                        <span style={{ fontSize: 11, color: '#5a6a85', marginLeft: 'auto' }}>
                          {entity.fields.length} campos
                        </span>
                      </div>
                    );
                  })}
                </div>
                {selectedEntities.length > 0 && (
                  <div style={styles.selectionSummary}>
                    {selectedEntities.length} entidad(es) seleccionada(s): {selectedEntities.join(', ')}
                  </div>
                )}
              </div>
            )}

            {selectedDomain && selectedDomain.entities.length === 0 && (
              <p style={{ fontSize: 13, color: '#5a6a85', marginTop: 16 }}>Este dominio no tiene entidades configuradas.</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Btn type="submit"><Check size={14} /> Generar Spec</Btn>
              <Btn variant="ghost" onClick={resetForm} type="button"><X size={14} /> Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      <div style={styles.grid}>
        {list.length === 0 ? (
          <Card><p style={styles.empty}>No hay OpenAPI Specs generados.</p></Card>
        ) : (
          list.map((spec) => (
            <Card key={spec.id} style={{ position: 'relative' }}>
              <div style={styles.specHeader}>
                <div style={styles.specIcon}><FileCode size={18} color="#003087" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.specName}>{spec.name}</div>
                  <div style={styles.specDomain}>{spec.domainName}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Btn size="sm" variant="secondary" onClick={() => download(spec.id, spec.name)}>
                    <Download size={13} /> YAML
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => remove(spec.id)}>
                    <Trash2 size={13} />
                  </Btn>
                </div>
              </div>

              <div style={styles.entitiesSection}>
                <div style={styles.entitiesLabel}>Entidades incluidas</div>
                <div style={styles.entityChips}>
                  {spec.selectedEntities.map((e) => (
                    <span key={e} style={styles.entityChip}>
                      <Tag size={10} /> {e}
                    </span>
                  ))}
                </div>
              </div>

              <div style={styles.specMeta}>
                <span style={styles.metaDate}>
                  {new Date(spec.createdAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </Card>
          ))
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
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#003087' },
  selectAllBtn: { fontSize: 12, color: '#003087', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 },
  entityCheckGrid: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', border: '1.5px solid #d1d9e6', borderRadius: 8, padding: 8, background: '#fff' },
  entityCheckItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s' },
  selectionSummary: { marginTop: 10, padding: '8px 12px', background: '#e8f0fe', borderRadius: 8, fontSize: 12, color: '#003087', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  empty: { color: '#5a6a85', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  specHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  specIcon: { width: 40, height: 40, borderRadius: 10, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  specName: { fontWeight: 700, fontSize: 15, color: '#003087', marginBottom: 2 },
  specDomain: { fontSize: 11, color: '#5a6a85' },
  entitiesSection: { marginBottom: 12 },
  entitiesLabel: { fontSize: 11, fontWeight: 700, color: '#5a6a85', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  entityChips: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  entityChip: { background: '#f4f6f9', color: '#0050b3', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 },
  specMeta: { borderTop: '1px solid #f0f2f5', paddingTop: 10, marginTop: 4 },
  metaDate: { fontSize: 11, color: '#5a6a85' },
};
