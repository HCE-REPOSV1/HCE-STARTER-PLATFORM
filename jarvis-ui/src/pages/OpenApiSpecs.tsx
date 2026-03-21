import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileCode, Plus, Trash2, Download, Check, X, Tag } from 'lucide-react';
import api from '../api/client';
import { Button, Card, PageHeader, TextInput, SelectInput } from '@jarvis/design-system';

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

  const domainOptions = [
    { value: '', label: '-- Seleccionar dominio --' },
    ...domains.map((d) => ({ value: d.id, label: `${d.name} (${d.entities.length} entidades)` })),
  ];

  return (
    <div>
      <PageHeader
        icon={<FileCode size={20} />}
        title="OpenAPI Specs"
        description="Contratos OpenAPI generados desde dominios"
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} style={{ marginRight: 6 }} /> Nuevo Spec
          </Button>
        }
      />

      {showForm && (
        <Card title="Nuevo OpenAPI Spec" style={{ marginBottom: 24 }}>
          <form onSubmit={save}>
            <div style={styles.formRow}>
              <div style={{ flex: 2 }}>
                <TextInput
                  label="Nombre del spec"
                  value={specName}
                  onChange={setSpecName}
                  placeholder="ej: patients-api"
                  required
                />
              </div>
              <div style={{ flex: 2 }}>
                <SelectInput
                  label="Dominio"
                  value={selectedDomainId}
                  onChange={onDomainChange}
                  options={domainOptions}
                  required
                />
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
                        style={{
                          ...styles.entityCheckItem,
                          borderColor: checked ? 'var(--jarvis-primary)' : 'var(--jarvis-border)',
                          background: checked ? 'var(--jarvis-hover)' : '#fff',
                        }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          border: `2px solid ${checked ? 'var(--jarvis-primary)' : 'var(--jarvis-border)'}`,
                          background: checked ? 'var(--jarvis-primary)' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {checked && <Check size={10} color="#fff" />}
                        </div>
                        <Tag size={12} color={checked ? 'var(--jarvis-primary)' : 'var(--jarvis-text-secondary)'} />
                        <span style={{ fontSize: 13, color: checked ? 'var(--jarvis-primary)' : 'var(--jarvis-text)', fontWeight: checked ? 600 : 400 }}>
                          {entity.name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--jarvis-text-secondary)', marginLeft: 'auto' }}>
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
              <p style={{ fontSize: 13, color: 'var(--jarvis-text-secondary)', marginTop: 16 }}>Este dominio no tiene entidades configuradas.</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <Button type="submit"><Check size={14} style={{ marginRight: 6 }} /> Generar Spec</Button>
              <Button variant="ghost" onClick={resetForm} type="button">
                <X size={14} style={{ marginRight: 6 }} /> Cancelar
              </Button>
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
                <div style={styles.specIcon}><FileCode size={18} color="var(--jarvis-primary)" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.specName}>{spec.name}</div>
                  <div style={styles.specDomain}>{spec.domainName}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="sm" variant="secondary" onClick={() => download(spec.id, spec.name)}>
                    <Download size={13} style={{ marginRight: 4 }} /> YAML
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(spec.id)}>
                    <Trash2 size={13} />
                  </Button>
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
  formRow: { display: 'flex', gap: 16 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: 'var(--jarvis-primary)' },
  selectAllBtn: { fontSize: 12, color: 'var(--jarvis-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 },
  entityCheckGrid: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto', border: '1.5px solid var(--jarvis-border)', borderRadius: 8, padding: 8, background: '#fff' },
  entityCheckItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s' },
  selectionSummary: { marginTop: 10, padding: '8px 12px', background: 'var(--jarvis-hover)', borderRadius: 8, fontSize: 12, color: 'var(--jarvis-primary)', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  empty: { color: 'var(--jarvis-text-secondary)', fontSize: 14, textAlign: 'center', padding: '32px 0' },
  specHeader: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  specIcon: { width: 40, height: 40, borderRadius: 10, background: 'var(--jarvis-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  specName: { fontWeight: 700, fontSize: 15, color: 'var(--jarvis-primary)', marginBottom: 2 },
  specDomain: { fontSize: 11, color: 'var(--jarvis-text-secondary)' },
  entitiesSection: { marginBottom: 12 },
  entitiesLabel: { fontSize: 11, fontWeight: 700, color: 'var(--jarvis-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  entityChips: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  entityChip: { background: 'var(--jarvis-bg)', color: 'var(--jarvis-primary)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 },
  specMeta: { borderTop: '1px solid var(--jarvis-border)', paddingTop: 10, marginTop: 4 },
  metaDate: { fontSize: 11, color: 'var(--jarvis-text-secondary)' },
};
