// Initialize.tsx — Wizard de 5 pasos para generación de microservicios
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Zap, Download, ChevronRight, ChevronLeft, Check, Database } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';
import type { Domain, Datasource, GenerateDto } from '../types';

const STEPS = ['Básico', 'Técnico', 'DataSource', 'Preview', 'Generar'];

const ARCH_OPTIONS = [
  { value: 'hexagonal', label: 'Hexagonal', desc: 'Ports & Adapters — máxima separación' },
  { value: 'clean', label: 'Clean', desc: 'Clean Architecture — capas independientes' },
  { value: 'layered', label: 'Layered', desc: 'Capas tradicionales — más simple' },
];
const ORM_OPTIONS = [
  { value: 'none', label: 'Sin ORM', desc: 'Repositorios manuales' },
  { value: 'typeorm', label: 'TypeORM', desc: 'ORM clásico para NestJS' },
  { value: 'prisma', label: 'Prisma', desc: 'ORM moderno con schema' },
];
const AUTH_OPTIONS = [
  { value: 'none', label: 'Sin Auth', desc: 'Endpoints públicos' },
  { value: 'jwt', label: 'JWT', desc: 'Bearer token stateless' },
  { value: 'oauth', label: 'OAuth2', desc: 'Delegación de identidad' },
];
const TYPE_OPTIONS = [
  { value: 'UX', label: 'UX — Diseño', desc: 'API First: contrato OpenAPI/Swagger', badge: 'openapi.yaml', color: '#e65100' },
  { value: 'CN', label: 'CN — Canal', desc: 'BFF Canal: microservicio de integración', badge: 'NestJS BFF', color: '#003087' },
  { value: 'BS', label: 'BS — Negocio', desc: 'BFF Negocio: lógica de negocio', badge: 'NestJS BFF', color: '#003087' },
];

const DEFAULT_DTO: GenerateDto = {
  name: '', type: 'BS', domainId: '', datasourceId: '',
  architecture: 'hexagonal', orm: 'none', apiStyle: 'rest', authType: 'none',
  observability: { logs: true, metrics: false, tracing: false },
  gitEnabled: false, gitRepoUrl: '', gitBranch: 'main',
};

export default function Initialize() {
  const [step, setStep] = useState(0);
  const [dto, setDto] = useState<GenerateDto>({ ...DEFAULT_DTO });
  const [domains, setDomains] = useState<Domain[]>([]);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/domains').then((r) => setDomains(r.data));
    api.get('/datasources').then((r) => setDatasources(r.data));
  }, []);

  const patch = (p: Partial<GenerateDto>) => setDto((d) => ({ ...d, ...p }));

  const loadTables = async (dsId: string) => {
    if (!dsId) { setTables([]); return; }
    setLoadingTables(true);
    try {
      const r = await api.get(`/datasources/${dsId}/tables`);
      setTables(r.data);
    } catch { setTables([]); toast.error('No se pudo conectar al datasource'); }
    finally { setLoadingTables(false); }
  };

  const canNext = () => {
    if (step === 0) return dto.name.trim().length >= 2 && !!dto.domainId;
    return true;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/generate', dto, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url; a.download = `${dto.type.toLowerCase()}-${dto.name}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Microservicio generado y descargado');
      setStep(0); setDto({ ...DEFAULT_DTO });
    } catch { toast.error('Error al generar el microservicio'); }
    finally { setLoading(false); }
  };

  const selectedDomain = domains.find((d) => d.id === dto.domainId);
  const selectedDs = datasources.find((d) => d.id === dto.datasourceId);

  return (
    <div>
      <div style={styles.pageHeader}>
        <Zap size={22} color="#003087" />
        <div>
          <h1 style={styles.pageTitle}>Initialize</h1>
          <p style={styles.pageDesc}>Genera un microservicio en {STEPS.length} pasos</p>
        </div>
      </div>

      {/* Stepper */}
      <div style={styles.stepper}>
        {STEPS.map((s, i) => (
          <div key={s} style={styles.stepItem}>
            <div style={{ ...styles.stepCircle, background: i <= step ? '#003087' : '#d1d9e6', color: i <= step ? '#fff' : '#5a6a85' }}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span style={{ ...styles.stepLabel, color: i === step ? '#003087' : '#5a6a85', fontWeight: i === step ? 700 : 400 }}>{s}</span>
            {i < STEPS.length - 1 && <div style={{ ...styles.stepLine, background: i < step ? '#003087' : '#d1d9e6' }} />}
          </div>
        ))}
      </div>

      <Card>
        {/* Step 0: Datos básicos */}
        {step === 0 && (
          <div style={styles.stepContent}>
            <h3 style={styles.stepTitle}>Datos básicos</h3>
            <div style={styles.field}>
              <label style={styles.label}>Nombre del servicio</label>
              <input style={styles.input} value={dto.name} onChange={(e) => patch({ name: e.target.value })} placeholder="ej: patient-service" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Tipo de microservicio</label>
              <div style={styles.optGrid}>
                {TYPE_OPTIONS.map((t) => (
                  <div key={t.value} onClick={() => patch({ type: t.value as any })} style={{ ...styles.optCard, borderColor: dto.type === t.value ? '#003087' : '#d1d9e6', background: dto.type === t.value ? '#e8f0fe' : '#fff' }}>
                    <div style={styles.optLabel}>{t.label}</div>
                    <div style={styles.optDesc}>{t.desc}</div>
                    <span style={{ ...styles.optBadge, background: `${t.color}18`, color: t.color }}>{t.badge}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Dominio</label>
              {domains.length === 0
                ? <div style={styles.emptyHint}>No hay dominios. <span style={styles.link} onClick={() => navigate('/dashboard/domains')}>Crear dominio →</span></div>
                : <select style={styles.input} value={dto.domainId} onChange={(e) => patch({ domainId: e.target.value })}>
                    <option value="">-- Seleccionar --</option>
                    {domains.map((d) => <option key={d.id} value={d.id}>{d.name} ({(d.entities ?? []).length} entidades)</option>)}
                  </select>
              }
            </div>
          </div>
        )}

        {/* Step 1: Configuración técnica */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h3 style={styles.stepTitle}>Configuración técnica</h3>
            {dto.type === 'UX'
              ? <div style={styles.infoBox}>El tipo UX genera solo el contrato OpenAPI. Las opciones técnicas aplican a CN/BS.</div>
              : <>
                  <div style={styles.field}>
                    <label style={styles.label}>Arquitectura</label>
                    <div style={styles.optGrid}>
                      {ARCH_OPTIONS.map((o) => (
                        <div key={o.value} onClick={() => patch({ architecture: o.value as any })} style={{ ...styles.optCard, borderColor: dto.architecture === o.value ? '#003087' : '#d1d9e6', background: dto.architecture === o.value ? '#e8f0fe' : '#fff' }}>
                          <div style={styles.optLabel}>{o.label}</div>
                          <div style={styles.optDesc}>{o.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={styles.twoCol}>
                    <div style={styles.field}>
                      <label style={styles.label}>ORM</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {ORM_OPTIONS.map((o) => (
                          <label key={o.value} style={styles.radioRow}>
                            <input type="radio" name="orm" value={o.value} checked={dto.orm === o.value} onChange={() => patch({ orm: o.value as any })} />
                            <span style={styles.radioLabel}>{o.label}</span>
                            <span style={styles.radioDesc}>{o.desc}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Autenticación</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {AUTH_OPTIONS.map((o) => (
                          <label key={o.value} style={styles.radioRow}>
                            <input type="radio" name="auth" value={o.value} checked={dto.authType === o.value} onChange={() => patch({ authType: o.value as any })} />
                            <span style={styles.radioLabel}>{o.label}</span>
                            <span style={styles.radioDesc}>{o.desc}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Observabilidad</label>
                    <div style={{ display: 'flex', gap: 16 }}>
                      {(['logs', 'metrics', 'tracing'] as const).map((k) => (
                        <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                          <input type="checkbox" checked={dto.observability?.[k] ?? false} onChange={(e) => patch({ observability: { ...dto.observability!, [k]: e.target.checked } })} />
                          {k.charAt(0).toUpperCase() + k.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={styles.field}>
                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={dto.gitEnabled} onChange={(e) => patch({ gitEnabled: e.target.checked })} />
                      Integración Git
                    </label>
                    {dto.gitEnabled && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <input style={{ ...styles.input, flex: 3 }} value={dto.gitRepoUrl} onChange={(e) => patch({ gitRepoUrl: e.target.value })} placeholder="https://github.com/org/repo.git" />
                        <input style={{ ...styles.input, flex: 1 }} value={dto.gitBranch} onChange={(e) => patch({ gitBranch: e.target.value })} placeholder="main" />
                      </div>
                    )}
                  </div>
                </>
            }
          </div>
        )}

        {/* Step 2: DataSource + tablas */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <h3 style={styles.stepTitle}>DataSource</h3>
            <div style={styles.field}>
              <label style={styles.label}>Datasource (opcional)</label>
              <select style={styles.input} value={dto.datasourceId} onChange={(e) => { patch({ datasourceId: e.target.value }); loadTables(e.target.value); }}>
                <option value="">-- Sin datasource --</option>
                {datasources.map((ds) => (
                  <option key={ds.id} value={ds.id}>{ds.engine} — {ds.database} ({ds.status ?? 'untested'})</option>
                ))}
              </select>
            </div>
            {dto.datasourceId && (
              <div style={styles.field}>
                <label style={styles.label}>Tablas disponibles {loadingTables && '(cargando...)'}</label>
                {tables.length === 0 && !loadingTables && <p style={styles.hint}>No se encontraron tablas o la conexión falló.</p>}
                <div style={styles.tableGrid}>
                  {tables.map((t) => (
                    <div key={t} style={styles.tableChip}><Database size={12} /> {t}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <h3 style={styles.stepTitle}>Preview de generación</h3>
            <div style={styles.previewGrid}>
              <PreviewRow label="Servicio" value={`${dto.type.toLowerCase()}-${dto.name}`} />
              <PreviewRow label="Tipo" value={dto.type} />
              <PreviewRow label="Dominio" value={selectedDomain?.name ?? '—'} />
              <PreviewRow label="Arquitectura" value={dto.architecture ?? '—'} />
              <PreviewRow label="ORM" value={dto.orm ?? '—'} />
              <PreviewRow label="Auth" value={dto.authType ?? '—'} />
              <PreviewRow label="DataSource" value={selectedDs ? `${selectedDs.engine} — ${selectedDs.database}` : 'Ninguno'} />
              <PreviewRow label="Git" value={dto.gitEnabled ? dto.gitRepoUrl || 'Habilitado' : 'No'} />
            </div>
            {selectedDomain && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.label}>Entidades a generar</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {(selectedDomain.entities ?? []).map((e) => {
                    const entityName = typeof e === 'string' ? e : e.name;
                    const fieldCount = typeof e === 'string' ? 0 : (e.fields?.length ?? 0);
                    return (
                      <div key={entityName} style={styles.entityPreviewChip}>
                        <strong>{entityName}</strong> — {fieldCount} campos
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ ...styles.infoBox, marginTop: 20 }}>
              El ZIP incluirá: código fuente, <code>Dockerfile</code>, <code>.env</code>, <code>README.md</code>, <code>openapi.yaml</code>
            </div>
          </div>
        )}

        {/* Step 4: Generar */}
        {step === 4 && (
          <div style={{ ...styles.stepContent, textAlign: 'center', padding: '40px 20px' }}>
            <div style={styles.generateIcon}><Zap size={40} color="#003087" /></div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#003087', marginBottom: 8 }}>Listo para generar</h3>
            <p style={{ color: '#5a6a85', marginBottom: 32, fontSize: 14 }}>
              Se generará <strong>{dto.type.toLowerCase()}-{dto.name}.zip</strong> con arquitectura <strong>{dto.architecture}</strong>
            </p>
            <Btn onClick={handleGenerate} disabled={loading} style={{ padding: '14px 40px', fontSize: 16 }}>
              <Download size={18} />
              {loading ? 'Generando...' : 'Generar y Descargar ZIP'}
            </Btn>
          </div>
        )}

        {/* Navigation */}
        <div style={styles.navRow}>
          {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}><ChevronLeft size={15} /> Anterior</Btn>}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 && (
            <Btn onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Siguiente <ChevronRight size={15} />
            </Btn>
          )}
        </div>
      </Card>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #f0f2f5', padding: '10px 0' }}>
      <span style={{ width: 140, fontSize: 13, color: '#5a6a85', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a2a4a', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700, color: '#003087' },
  pageDesc: { fontSize: 13, color: '#5a6a85', marginTop: 2 },
  stepper: { display: 'flex', alignItems: 'center', marginBottom: 24, background: '#fff', borderRadius: 12, padding: '16px 24px', boxShadow: '0 2px 12px rgba(0,48,135,0.07)' },
  stepItem: { display: 'flex', alignItems: 'center', flex: 1 },
  stepCircle: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  stepLabel: { fontSize: 12, marginLeft: 8, whiteSpace: 'nowrap' },
  stepLine: { flex: 1, height: 2, margin: '0 8px' },
  stepContent: { minHeight: 300 },
  stepTitle: { fontSize: 16, fontWeight: 700, color: '#003087', marginBottom: 20 },
  field: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: 600, color: '#1a2a4a' },
  input: { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d9e6', fontSize: 14, outline: 'none' },
  optGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 },
  optCard: { padding: '14px 16px', borderRadius: 10, border: '2px solid', cursor: 'pointer', transition: 'all 0.15s' },
  optLabel: { fontWeight: 700, fontSize: 14, color: '#003087', marginBottom: 4 },
  optDesc: { fontSize: 12, color: '#5a6a85', marginBottom: 8 },
  optBadge: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  radioRow: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d9e6' },
  radioLabel: { fontWeight: 600, fontSize: 13, color: '#1a2a4a' },
  radioDesc: { fontSize: 12, color: '#5a6a85', marginLeft: 4 },
  infoBox: { background: '#e8f0fe', border: '1px solid #b3c8f0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a2a4a' },
  hint: { fontSize: 12, color: '#5a6a85' },
  emptyHint: { fontSize: 13, color: '#5a6a85' },
  link: { color: '#003087', fontWeight: 600, cursor: 'pointer' },
  tableGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tableChip: { background: '#f4f6f9', color: '#0050b3', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 },
  previewGrid: { background: '#f8faff', borderRadius: 10, padding: '4px 16px' },
  entityPreviewChip: { background: '#e8f0fe', color: '#003087', padding: '6px 14px', borderRadius: 8, fontSize: 13 },
  generateIcon: { width: 80, height: 80, borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  navRow: { display: 'flex', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f2f5' },
};
