// Initialize.tsx — Wizard de 5 pasos para generación de microservicios
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Zap, Download, ChevronRight, ChevronLeft, Check, FileCode, Plus, X, Shield, Lock } from 'lucide-react';
import api from '../api/client';
import Card from '../components/Card';
import Btn from '../components/Btn';
import type { Datasource, GenerateDto, OpenApiSpec, GatewayService } from '../types';

const STEPS = ['Básico', 'Técnico', 'DataSource / Config', 'Preview', 'Generar'];

const ARCH_OPTIONS = [
  { value: 'hexagonal', label: 'Hexagonal', desc: 'Ports & Adapters — máxima separación' },
  { value: 'clean',     label: 'Clean',     desc: 'Clean Architecture — capas independientes' },
  { value: 'layered',   label: 'Layered',   desc: 'Capas tradicionales — más simple' },
];
const ORM_OPTIONS = [
  { value: 'none',    label: 'Sin ORM', desc: 'Repositorios manuales' },
  { value: 'typeorm', label: 'TypeORM', desc: 'ORM clásico para NestJS' },
  { value: 'prisma',  label: 'Prisma',  desc: 'ORM moderno con schema' },
];
const AUTH_OPTIONS = [
  { value: 'none',  label: 'Sin Auth', desc: 'Endpoints públicos' },
  { value: 'jwt',   label: 'JWT',      desc: 'Bearer token stateless' },
  { value: 'oauth', label: 'OAuth2',   desc: 'Delegación de identidad' },
];
const TYPE_OPTIONS = [
  { value: 'CN', label: 'CN — Canal',       desc: 'BFF Canal: microservicio de integración', badge: 'NestJS BFF',     color: '#003087' },
  { value: 'BS', label: 'BS — Negocio',     desc: 'BFF Negocio: lógica de negocio',          badge: 'NestJS BFF',     color: '#003087' },
  { value: 'AG', label: 'AG — API Gateway', desc: 'Gateway con rate limit, proxy y JWT',      badge: 'API Gateway',    color: '#0d6e2b' },
  { value: 'AA', label: 'AA — Auth',        desc: 'Auth service con JWT + Refresh Token',     badge: 'JWT Auth',       color: '#7b1fa2' },
];

const DEFAULT_GATEWAY_SVC = (): GatewayService => ({ name: '', url: '', protected: true });

const DEFAULT_DTO: GenerateDto = {
  name: '', type: 'BS', domainId: '', datasourceId: '', openApiSpecId: '',
  architecture: 'hexagonal', orm: 'none', apiStyle: 'rest', authType: 'none',
  observability: { logs: true, metrics: false, tracing: false },
  gitEnabled: false, gitRepoUrl: '', gitBranch: 'main',
  // AG
  gatewayServices: [{ name: 'auth', url: 'http://localhost:10101', protected: false }],
  rateLimitTtl: 60, rateLimitMax: 100, requestTimeout: 120000,
  allowedOrigins: '', useSsl: false, sslPort: 20100, serverName: '', certPath: '/app/certs',
  // AA
  authUser: 'admin', authPassword: '', jwtExpiresIn: '4h', jwtRefreshExpiresIn: '7d',
};

export default function Initialize() {
  const [step, setStep] = useState(0);
  const [dto, setDto] = useState<GenerateDto>({ ...DEFAULT_DTO });
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [openApiSpecs, setOpenApiSpecs] = useState<OpenApiSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/datasources').then((r) => setDatasources(r.data));
    api.get('/openapi-specs').then((r) => setOpenApiSpecs(r.data));
  }, []);

  const patch = (p: Partial<GenerateDto>) => setDto((d) => ({ ...d, ...p }));

  const isGateway = dto.type === 'AG';
  const isAuth    = dto.type === 'AA';
  const isBff     = dto.type === 'CN' || dto.type === 'BS';

  const canNext = () => {
    if (step === 0) return dto.name.trim().length >= 2;
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

  // Gateway services helpers
  const addGwSvc = () => patch({ gatewayServices: [...(dto.gatewayServices ?? []), DEFAULT_GATEWAY_SVC()] });
  const removeGwSvc = (i: number) => patch({ gatewayServices: (dto.gatewayServices ?? []).filter((_, idx) => idx !== i) });
  const updateGwSvc = (i: number, p: Partial<GatewayService>) => {
    const next = [...(dto.gatewayServices ?? [])];
    next[i] = { ...next[i], ...p };
    patch({ gatewayServices: next });
  };

  const selectedDs   = datasources.find((d) => d.id === dto.datasourceId);
  const selectedSpec = openApiSpecs.find((s) => s.id === dto.openApiSpecId);

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
        {/* ── Step 0: Datos básicos ─────────────────────────────── */}
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
                  <div key={t.value} onClick={() => patch({ type: t.value as any })} style={{ ...styles.optCard, borderColor: dto.type === t.value ? t.color : '#d1d9e6', background: dto.type === t.value ? `${t.color}12` : '#fff' }}>
                    <div style={{ ...styles.optLabel, color: t.color }}>{t.label}</div>
                    <div style={styles.optDesc}>{t.desc}</div>
                    <span style={{ ...styles.optBadge, background: `${t.color}18`, color: t.color }}>{t.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Configuración técnica ─────────────────────── */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h3 style={styles.stepTitle}>Configuración técnica</h3>

            {/* AG / AA: arquitectura fija hexagonal */}
            {(isGateway || isAuth) && (
              <div style={styles.infoBox}>
                <Shield size={14} style={{ flexShrink: 0 }} />
                <span>Arquitectura <strong>Hexagonal</strong> fija para {isGateway ? 'API Gateway' : 'Auth Service'}. ORM y Auth configurados internamente.</span>
              </div>
            )}

            {/* BFF: selección de arquitectura */}
            {isBff && (
              <div style={styles.field}>
                <label style={styles.label}>Arquitectura</label>
                <div style={styles.optGrid3}>
                  {ARCH_OPTIONS.map((o) => (
                    <div key={o.value} onClick={() => patch({ architecture: o.value as any })} style={{ ...styles.optCard, borderColor: dto.architecture === o.value ? '#003087' : '#d1d9e6', background: dto.architecture === o.value ? '#e8f0fe' : '#fff' }}>
                      <div style={styles.optLabel}>{o.label}</div>
                      <div style={styles.optDesc}>{o.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BFF: ORM + Auth */}
            {isBff && (
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
            )}

            {/* Todos los tipos: observabilidad + git */}
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
          </div>
        )}

        {/* ── Step 2: DataSource / Config ───────────────────────── */}
        {step === 2 && (
          <div style={styles.stepContent}>

            {/* BFF: datasource + openapi */}
            {isBff && (
              <>
                <h3 style={styles.stepTitle}>DataSource</h3>
                <div style={styles.field}>
                  <label style={styles.label}>Datasource (opcional)</label>
                  <select style={styles.input} value={dto.datasourceId} onChange={(e) => patch({ datasourceId: e.target.value })}>
                    <option value="">-- Sin datasource --</option>
                    {datasources.map((ds) => (
                      <option key={ds.id} value={ds.id}>{ds.engine} — {ds.database} ({ds.status ?? 'untested'})</option>
                    ))}
                  </select>
                  <p style={styles.hint}>Selecciona la conexión de base de datos para generar el archivo .env del microservicio.</p>
                </div>
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f2f5' }}>
                  <div style={styles.openApiHeader}>
                    <FileCode size={16} color="#003087" />
                    <span style={styles.openApiTitle}>OpenAPI Spec</span>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Spec a utilizar (opcional)</label>
                    <select style={styles.input} value={dto.openApiSpecId} onChange={(e) => {
                      const specId = e.target.value;
                      const spec = openApiSpecs.find((s) => s.id === specId);
                      patch({ openApiSpecId: specId, domainId: spec?.domainId ?? '' });
                    }}>
                      <option value="">-- Sin OpenAPI Spec --</option>
                      {openApiSpecs.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} — {s.domainName} ({s.selectedEntities.length} entidades)</option>
                      ))}
                    </select>
                    {openApiSpecs.length === 0 && (
                      <p style={styles.hint}>No hay specs creados. <span style={styles.link} onClick={() => navigate('/dashboard/openapi-specs')}>Crear OpenAPI Spec →</span></p>
                    )}
                  </div>
                  {selectedSpec && (
                    <div style={styles.specPreview}>
                      <div style={styles.specPreviewTitle}>Entidades del spec seleccionado</div>
                      <div style={styles.specEntityChips}>
                        {selectedSpec.selectedEntities.map((e) => <span key={e} style={styles.specEntityChip}>{e}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* AG: gateway config */}
            {isGateway && (
              <>
                <h3 style={styles.stepTitle}>Configuración API Gateway</h3>

                {/* Services list */}
                <div style={styles.field}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={styles.label}>Servicios backend</label>
                    <Btn size="sm" variant="secondary" onClick={addGwSvc} type="button"><Plus size={12} /> Agregar</Btn>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {(dto.gatewayServices ?? []).map((svc, i) => (
                      <div key={i} style={styles.gwSvcRow}>
                        <input style={{ ...styles.input, flex: 1 }} value={svc.name} onChange={(e) => updateGwSvc(i, { name: e.target.value })} placeholder="nombre (ej: auth)" />
                        <input style={{ ...styles.input, flex: 2 }} value={svc.url} onChange={(e) => updateGwSvc(i, { url: e.target.value })} placeholder="http://localhost:10101" />
                        <label style={styles.gwProtectedLabel}>
                          <input type="checkbox" checked={svc.protected} onChange={(e) => updateGwSvc(i, { protected: e.target.checked })} />
                          <Lock size={11} />
                          <span style={{ fontSize: 11 }}>JWT</span>
                        </label>
                        {(dto.gatewayServices ?? []).length > 1 && (
                          <button style={styles.removeBtn} onClick={() => removeGwSvc(i)}><X size={12} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p style={styles.hint}>Marca JWT en los servicios que requieran autenticación. El servicio <code>auth</code> generalmente no se protege.</p>
                </div>

                {/* Rate limit */}
                <div style={styles.twoCol}>
                  <div style={styles.field}>
                    <label style={styles.label}>Rate Limit — ventana (segundos)</label>
                    <input style={styles.input} type="number" min={1} value={dto.rateLimitTtl} onChange={(e) => patch({ rateLimitTtl: Number(e.target.value) })} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Rate Limit — máx requests</label>
                    <input style={styles.input} type="number" min={1} value={dto.rateLimitMax} onChange={(e) => patch({ rateLimitMax: Number(e.target.value) })} />
                  </div>
                </div>

                {/* Timeout + CORS */}
                <div style={styles.twoCol}>
                  <div style={styles.field}>
                    <label style={styles.label}>Request timeout (ms)</label>
                    <input style={styles.input} type="number" min={1000} step={1000} value={dto.requestTimeout} onChange={(e) => patch({ requestTimeout: Number(e.target.value) })} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>CORS — orígenes permitidos</label>
                    <input style={styles.input} value={dto.allowedOrigins} onChange={(e) => patch({ allowedOrigins: e.target.value })} placeholder="http://localhost:3000,https://app.com" />
                    <p style={styles.hint}>Separar por coma, sin espacios. Vacío = permisivo en dev.</p>
                  </div>
                </div>

                {/* SSL */}
                <div style={{ ...styles.field, marginTop: 8 }}>
                  <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={dto.useSsl} onChange={(e) => patch({ useSsl: e.target.checked })} />
                    Habilitar SSL / HTTPS
                  </label>
                  {dto.useSsl && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, padding: '12px 14px', background: '#f0fff4', borderRadius: 8, border: '1px solid #b7ebcd' }}>
                      <div style={styles.twoCol}>
                        <div style={styles.field}>
                          <label style={styles.label}>Puerto HTTP</label>
                          <input style={styles.input} type="number" value={10100} disabled style={{ ...styles.input, color: '#9aabad' }} />
                        </div>
                        <div style={styles.field}>
                          <label style={styles.label}>Puerto HTTPS (SSL_PORT)</label>
                          <input style={styles.input} type="number" value={dto.sslPort} onChange={(e) => patch({ sslPort: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Ruta certificados (CERT_PATH)</label>
                        <input style={styles.input} value={dto.certPath} onChange={(e) => patch({ certPath: e.target.value })} placeholder="/app/certs" />
                        <p style={styles.hint}>Se leen <code>server.key</code> y <code>server.crt</code> desde esta ruta. Se configura en el .env del servicio generado.</p>
                      </div>
                      <div style={styles.field}>
                        <label style={styles.label}>Nombre del servidor (SERVER_NAME)</label>
                        <input style={styles.input} value={dto.serverName} onChange={(e) => patch({ serverName: e.target.value })} placeholder="pruebas.microservicioscsf.sanfelipe.com" />
                        <p style={styles.hint}>Debe coincidir con el CN del certificado.</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* AA: auth config */}
            {isAuth && (
              <>
                <h3 style={styles.stepTitle}>Configuración Auth Service</h3>
                <div style={{ ...styles.infoBox, marginBottom: 20 }}>
                  <Lock size={13} style={{ flexShrink: 0 }} />
                  <span>Autenticación con usuario y contraseña fijos (sin base de datos ni AD). Las credenciales se almacenan en el <code>.env</code> del servicio generado.</span>
                </div>
                <div style={styles.twoCol}>
                  <div style={styles.field}>
                    <label style={styles.label}>Usuario por defecto (AUTH_USER)</label>
                    <input style={styles.input} value={dto.authUser} onChange={(e) => patch({ authUser: e.target.value })} placeholder="admin" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Contraseña por defecto (AUTH_PASSWORD)</label>
                    <input style={styles.input} type="password" value={dto.authPassword} onChange={(e) => patch({ authPassword: e.target.value })} placeholder="•••••••••" />
                  </div>
                </div>
                <div style={styles.twoCol}>
                  <div style={styles.field}>
                    <label style={styles.label}>Expiración Access Token (JWT_EXPIRES_IN)</label>
                    <input style={styles.input} value={dto.jwtExpiresIn} onChange={(e) => patch({ jwtExpiresIn: e.target.value })} placeholder="4h" />
                    <p style={styles.hint}>Ejemplos: 15m, 1h, 4h, 1d</p>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Expiración Refresh Token (JWT_REFRESH_EXPIRES_IN)</label>
                    <input style={styles.input} value={dto.jwtRefreshExpiresIn} onChange={(e) => patch({ jwtRefreshExpiresIn: e.target.value })} placeholder="7d" />
                    <p style={styles.hint}>Ejemplos: 1d, 7d, 30d</p>
                  </div>
                </div>
                <div style={{ ...styles.field, marginTop: 4 }}>
                  <label style={styles.label}>Endpoints generados</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['POST /auth/login', 'POST /auth/refresh', 'POST /auth/validate', 'POST /auth/logout', 'GET /auth/health'].map((e) => (
                      <span key={e} style={{ ...styles.specEntityChip, background: '#f3e5f5', color: '#7b1fa2' }}>{e}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Preview ───────────────────────────────────── */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <h3 style={styles.stepTitle}>Preview de generación</h3>
            <div style={styles.previewGrid}>
              <PreviewRow label="Servicio"     value={`${dto.type.toLowerCase()}-${dto.name}`} />
              <PreviewRow label="Tipo"         value={dto.type} />
              {isBff && <PreviewRow label="Dominio"      value={selectedSpec?.domainName ?? '—'} />}
              {isBff && <PreviewRow label="Arquitectura" value={dto.architecture ?? '—'} />}
              {isBff && <PreviewRow label="ORM"          value={dto.orm ?? '—'} />}
              {isBff && <PreviewRow label="Auth"         value={dto.authType ?? '—'} />}
              {isBff && <PreviewRow label="DataSource"   value={selectedDs ? `${selectedDs.engine} — ${selectedDs.database}` : 'Ninguno'} />}
              {isBff && selectedSpec && <PreviewRow label="OpenAPI Spec" value={`${selectedSpec.name} (${selectedSpec.selectedEntities.length} entidades)`} />}
              {isGateway && <PreviewRow label="Arquitectura" value="Hexagonal (fijo)" />}
              {isGateway && <PreviewRow label="Rate Limit"   value={`${dto.rateLimitMax} req / ${dto.rateLimitTtl}s`} />}
              {isGateway && <PreviewRow label="SSL"          value={dto.useSsl ? `Sí — Puerto ${dto.sslPort}` : 'No'} />}
              {isGateway && <PreviewRow label="Cert Path"    value={dto.useSsl ? (dto.certPath ?? '/app/certs') : '—'} />}
              {isGateway && <PreviewRow label="Servicios"    value={`${(dto.gatewayServices ?? []).length} configurados`} />}
              {isAuth && <PreviewRow label="Arquitectura"    value="Hexagonal (fijo)" />}
              {isAuth && <PreviewRow label="Access Token"    value={dto.jwtExpiresIn ?? '4h'} />}
              {isAuth && <PreviewRow label="Refresh Token"   value={dto.jwtRefreshExpiresIn ?? '7d'} />}
              {isAuth && <PreviewRow label="Auth User"       value={dto.authUser ?? 'admin'} />}
              <PreviewRow label="Git" value={dto.gitEnabled ? dto.gitRepoUrl || 'Habilitado' : 'No'} />
            </div>

            {/* Gateway services table */}
            {isGateway && (dto.gatewayServices ?? []).length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.label}>Servicios backend proxiados</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {(dto.gatewayServices ?? []).map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8faff', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
                      <code style={{ color: '#003087', fontWeight: 700 }}>/{s.name}</code>
                      <span style={{ color: '#5a6a85', flex: 1 }}>{s.url}</span>
                      {s.protected
                        ? <span style={{ ...styles.specEntityChip, background: '#fff3e0', color: '#e65100' }}><Lock size={9} /> JWT</span>
                        : <span style={{ ...styles.specEntityChip, background: '#e8f5e9', color: '#2e7d32' }}>Público</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BFF entities */}
            {isBff && selectedSpec && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.label}>Entidades del OpenAPI Spec</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {selectedSpec.selectedEntities.map((e) => <div key={e} style={styles.entityPreviewChip}>{e}</div>)}
                </div>
              </div>
            )}

            <div style={{ ...styles.infoBox, marginTop: 20 }}>
              El ZIP incluirá: código fuente, <code>Dockerfile</code>, <code>.env</code>, <code>.env.example</code>, <code>README.md</code>
            </div>
          </div>
        )}

        {/* ── Step 4: Generar ───────────────────────────────────── */}
        {step === 4 && (
          <div style={{ ...styles.stepContent, textAlign: 'center', padding: '40px 20px' }}>
            <div style={styles.generateIcon}><Zap size={40} color="#003087" /></div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#003087', marginBottom: 8 }}>Listo para generar</h3>
            <p style={{ color: '#5a6a85', marginBottom: 32, fontSize: 14 }}>
              Se generará <strong>{dto.type.toLowerCase()}-{dto.name}.zip</strong>
              {isBff && <> con arquitectura <strong>{dto.architecture}</strong></>}
              {isGateway && <> con <strong>{(dto.gatewayServices ?? []).length} servicios</strong> y rate limit <strong>{dto.rateLimitMax} req/{dto.rateLimitTtl}s</strong></>}
              {isAuth && <> con JWT <strong>{dto.jwtExpiresIn}</strong> + Refresh <strong>{dto.jwtRefreshExpiresIn}</strong></>}
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
  pageHeader:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  pageTitle:       { fontSize: 22, fontWeight: 700, color: '#003087' },
  pageDesc:        { fontSize: 13, color: '#5a6a85', marginTop: 2 },
  stepper:         { display: 'flex', alignItems: 'center', marginBottom: 24, background: '#fff', borderRadius: 12, padding: '16px 24px', boxShadow: '0 2px 12px rgba(0,48,135,0.07)' },
  stepItem:        { display: 'flex', alignItems: 'center', flex: 1 },
  stepCircle:      { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  stepLabel:       { fontSize: 12, marginLeft: 8, whiteSpace: 'nowrap' },
  stepLine:        { flex: 1, height: 2, margin: '0 8px' },
  stepContent:     { minHeight: 300 },
  stepTitle:       { fontSize: 16, fontWeight: 700, color: '#003087', marginBottom: 20 },
  field:           { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  label:           { fontSize: 13, fontWeight: 600, color: '#1a2a4a' },
  input:           { padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d1d9e6', fontSize: 14, outline: 'none' },
  optGrid:         { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 },
  optGrid3:        { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 },
  optCard:         { padding: '14px 16px', borderRadius: 10, border: '2px solid', cursor: 'pointer', transition: 'all 0.15s' },
  optLabel:        { fontWeight: 700, fontSize: 14, color: '#003087', marginBottom: 4 },
  optDesc:         { fontSize: 12, color: '#5a6a85', marginBottom: 8 },
  optBadge:        { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 },
  twoCol:          { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  radioRow:        { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d9e6' },
  radioLabel:      { fontWeight: 600, fontSize: 13, color: '#1a2a4a' },
  radioDesc:       { fontSize: 12, color: '#5a6a85', marginLeft: 4 },
  infoBox:         { background: '#e8f0fe', border: '1px solid #b3c8f0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a2a4a', display: 'flex', alignItems: 'flex-start', gap: 8 },
  hint:            { fontSize: 12, color: '#5a6a85' },
  link:            { color: '#003087', fontWeight: 600, cursor: 'pointer' },
  openApiHeader:   { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
  openApiTitle:    { fontSize: 15, fontWeight: 700, color: '#003087' },
  specPreview:     { background: '#f8faff', border: '1.5px solid #d1d9e6', borderRadius: 10, padding: '12px 16px', marginTop: 12 },
  specPreviewTitle:{ fontSize: 12, fontWeight: 700, color: '#5a6a85', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  specEntityChips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  specEntityChip:  { background: '#e8f0fe', color: '#003087', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  previewGrid:     { background: '#f8faff', borderRadius: 10, padding: '4px 16px' },
  entityPreviewChip:{ background: '#e8f0fe', color: '#003087', padding: '6px 14px', borderRadius: 8, fontSize: 13 },
  generateIcon:    { width: 80, height: 80, borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  navRow:          { display: 'flex', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f2f5' },
  gwSvcRow:        { display: 'flex', alignItems: 'center', gap: 8 },
  gwProtectedLabel:{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#5a6a85', flexShrink: 0 },
  removeBtn:       { background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 },
};
