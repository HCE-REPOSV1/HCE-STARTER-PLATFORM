import 'reflect-metadata'
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';
import { spawnSync } from 'child_process';

// ─── Detección de certificados SSL ───────────────────────────────────────────
// Prioridad 1: .pfx / .p12  (con password.txt opcional)
// Prioridad 2: *.key + *.crt / *.cer  (con password.txt opcional)
// Si el PFX no puede descifrarse, hace fallback a .key/.crt en la misma carpeta

function detectCertFormat(certDir: string) {
  try {
    const files = fs.readdirSync(certDir);

    const readPassphrase = (): string | undefined => {
      const f = fs.readdirSync(certDir);
      const pwFile = f.find(n => n.toLowerCase() === 'password.txt');
      if (!pwFile) return undefined;
      const raw = fs.readFileSync(path.join(certDir, pwFile), 'utf8').trim();
      const match = raw.match(/^(?:password|passphrase)\s*:\s*(.+)$/i);
      return match ? match[1].trim() : raw;
    };

    const pfxFile = files.find(f => /\.(pfx|p12)$/i.test(f));
    if (pfxFile) {
      return { type: 'pfx', pfx: path.join(certDir, pfxFile), passphrase: readPassphrase() };
    }

    const keyFile  = files.find(f => /\.key$/i.test(f));
    const certFile = files.find(f => /\.(crt|cer)$/i.test(f));
    if (keyFile && certFile) {
      return { type: 'pem', key: path.join(certDir, keyFile), cert: path.join(certDir, certFile), passphrase: readPassphrase() };
    }
  } catch { /* carpeta no accesible */ }
  return null;
}

function isKeyEncrypted(keyPath: string): boolean | null {
  try {
    const c = fs.readFileSync(keyPath, 'utf8');
    if (c.includes('BEGIN ENCRYPTED PRIVATE KEY')) return true;
    if (c.includes('Proc-Type:') && c.includes('ENCRYPTED')) return true;
    return false;
  } catch { return null; }
}

function logCertInfo(certBuffer: Buffer | string) {
  try {
    const x509 = new crypto.X509Certificate(certBuffer);
    const cn   = (x509.subject.match(/CN=([^,\n]+)/) || [])[1] || '(no CN)';
    console.log('   Dominio (CN):', cn);
    if (x509.subjectAltName) {
      const sans = x509.subjectAltName.split(',').map(s => s.trim()).filter(s => s.startsWith('DNS:'));
      if (sans.length) console.log('   SANs:', sans.join(', '));
    }
    console.log('   Válido hasta:', x509.validTo);
  } catch (e: any) {
    console.log('   (no se pudo leer info del certificado:', e.message + ')');
  }
}

function logPfxInfo(pfxPath: string, passphrase?: string) {
  try {
    const result = spawnSync('openssl',
      ['pkcs12', '-in', pfxPath, '-nokeys', '-clcerts', '-nodes', '-passin', `pass:${passphrase || ''}`],
      { encoding: 'utf8' },
    );
    if (result.status === 0 && result.stdout) {
      const pem = result.stdout.match(/(-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----)/);
      if (pem) logCertInfo(pem[1]);
    } else {
      console.log('   (openssl no disponible o no se pudo leer el PFX)');
    }
  } catch (e: any) {
    console.log('   (no se pudo leer info del PFX:', e.message + ')');
  }
}

function buildHttpsOptions(): https.ServerOptions | null {
  if (process.env.USE_SSL !== 'true') return null;

  const certsConfig = process.env.CERT_PATH || '/app/certs';
  const paths = path.isAbsolute(certsConfig)
    ? [certsConfig]
    : [`/app/${certsConfig}`, path.join(__dirname, certsConfig), path.join(__dirname, `../${certsConfig}`)];

  console.log('🔍 Buscando certificados SSL...');

  let certInfo: ReturnType<typeof detectCertFormat> = null;
  let certsPath: string | null = null;

  for (const p of paths) {
    const detected = detectCertFormat(p);
    if (detected) {
      certInfo = detected; certsPath = p;
      console.log(`   ✔ ${p}  ← usada`);
      break;
    }
    const exists = fs.existsSync(p);
    console.log(`   ✘ ${p}  (${exists ? 'sin certificados' : 'no existe'})`);
  }

  if (!certInfo) {
    console.warn('⚠️  No se encontraron certificados SSL — continuando sin HTTPS');
    console.warn('   Formatos soportados: .pfx/.p12  o  .key + .crt/.cer  (con password.txt opcional)');
    return null;
  }

  try {
    if (certInfo.type === 'pfx') {
      const pfxBuffer  = fs.readFileSync(certInfo.pfx!);
      const passphrase = certInfo.passphrase ?? '';

      try {
        tls.createSecureContext({ pfx: pfxBuffer, passphrase });
      } catch {
        console.warn('⚠️  PFX cifrado — buscando .key/.crt como fallback...');
        const files    = fs.readdirSync(certsPath!);
        const keyFile  = files.find(f => f.endsWith('.key'));
        const certFile = files.find(f => f.endsWith('.crt') || f.endsWith('.cer'));
        if (keyFile && certFile) {
          const certBuf = fs.readFileSync(path.join(certsPath!, certFile));
          console.log('🔒 HTTPS habilitado - .key/.crt (fallback desde PFX cifrado)');
          logCertInfo(certBuf);
          return { key: fs.readFileSync(path.join(certsPath!, keyFile)), cert: certBuf };
        }
        throw new Error('PFX cifrado y no se encontró .key/.crt como alternativa');
      }

      console.log('🔒 HTTPS habilitado - PFX:', certsPath);
      console.log('   Passphrase:', certInfo.passphrase ? 'desde password.txt' : 'sin passphrase');
      logPfxInfo(certInfo.pfx!, certInfo.passphrase);
      return { pfx: pfxBuffer, passphrase };

    } else {
      const certBuf = fs.readFileSync(certInfo.cert!);
      const opts: https.ServerOptions = { key: fs.readFileSync(certInfo.key!), cert: certBuf };
      if (certInfo.passphrase) opts.passphrase = certInfo.passphrase;
      console.log('🔒 HTTPS habilitado - PEM:', certsPath);
      const enc = isKeyEncrypted(certInfo.key!);
      console.log('   Clave cifrada:', enc === true ? 'Sí' + (certInfo.passphrase ? ' (passphrase desde password.txt)' : ' ⚠️ sin passphrase') : enc === false ? 'No' : 'indeterminado');
      logCertInfo(certBuf);
      return opts;
    }
  } catch (e: any) {
    console.error('❌ Error al leer certificados:', e.message, '— continuando sin HTTPS');
    return null;
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = process.env.ALLOWED_ORIGINS;
  app.enableCors({
    origin: process.env.NODE_ENV === 'development'
      ? true
      : (origins ? origins.split(',') : false),
    methods:        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials:    true,
  });

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();

  // ── HTTP siempre activo ──
  const port = Number(process.env.PORT ?? 3000);
  http.createServer(expressApp).listen(port, () => {
    console.log(`🚀 ${process.env.npm_package_name ?? 'service'} HTTP → http://localhost:${port}`);
  });

  // ── HTTPS si USE_SSL=true y hay certificados ──
  const httpsOptions = buildHttpsOptions();
  if (httpsOptions) {
    const sslPort = Number(process.env.SSL_PORT ?? 3443);
    try {
      https.createServer(httpsOptions, expressApp).listen(sslPort, () => {
        console.log(`🔒 ${process.env.npm_package_name ?? 'service'} HTTPS → https://localhost:${sslPort}`);
      });
    } catch (e: any) {
      console.error('❌ Error al iniciar HTTPS:', e.message, '— solo HTTP activo');
    }
  }
}

bootstrap().catch(err => {
  console.error('Error fatal al iniciar el servicio:', err);
  process.exit(1);
});
