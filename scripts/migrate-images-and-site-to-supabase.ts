/**
 * Descarrega todas as imagens (img / imgHover) referenciadas no site-data,
 * envia-as para o bucket site-media e grava o JSON atualizado em site_config.
 *
 * Uso (na raiz do projeto, com .env.local ou env exportada):
 *   npm run migrate:supabase
 *
 * Variáveis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 * Opcional: SITE_DATA_SOURCE (URL do GET JSON), default URL de preview Vercel no plano.
 *
 * Flags:
 *   --skip-failed  mantém URLs que falharam e conclui mesmo assim (exit 0).
 */

import { createHash } from 'crypto';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { SiteData } from '../lib/types';

loadEnv({ path: '.env.local' });
loadEnv();

const DEFAULT_SOURCE =
  'https://sweetgardendecor-g35wtw5sf-genesis-projects-23454f64.vercel.app/api/public/site-data';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function isAlreadySupabaseMedia(url: string, projectBase: string): boolean {
  const u = url.trim();
  const base = projectBase.replace(/\/+$/, '');
  return u.startsWith(`${base}/storage/v1/object/public/site-media/`);
}

function extFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/(\.[a-z0-9]+)$/i);
    if (m) return m[1].toLowerCase();
  } catch {
    /* ignore */
  }
  return '';
}

function pickExt(contentType: string | null, url: string): string {
  if (contentType) {
    const ct = contentType.split(';')[0].trim().toLowerCase();
    if (MIME_EXT[ct]) return MIME_EXT[ct];
  }
  const fromUrl = extFromUrl(url);
  if (fromUrl) return fromUrl;
  return '.jpg';
}

function collectImageUrls(data: SiteData): string[] {
  const set = new Set<string>();
  for (const c of data.carrossels) {
    for (const s of c.slides) {
      if (s.img?.trim()) set.add(s.img.trim());
      if (s.imgHover?.trim()) set.add(s.imgHover.trim());
    }
  }
  return [...set];
}

function rewriteUrls(
  data: SiteData,
  map: Map<string, string>,
): SiteData {
  const repl = (u: string) => map.get(u.trim()) ?? u;
  return {
    version: data.version,
    carrossels: data.carrossels.map((c) => ({
      ...c,
      slides: c.slides.map((s) => ({
        ...s,
        img: repl(s.img),
        imgHover: s.imgHover ? repl(s.imgHover) : s.imgHover,
      })),
    })),
  };
}

function isValidSiteData(x: unknown): x is SiteData {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (typeof o.version !== 'number' || !Array.isArray(o.carrossels)) return false;
  for (const c of o.carrossels as Record<string, unknown>[]) {
    if (!c || typeof c.id !== 'string' || typeof c.titulo !== 'string' || !Array.isArray(c.slides))
      return false;
    for (const s of c.slides as Record<string, unknown>[]) {
      if (!s || typeof s.img !== 'string' || typeof s.link !== 'string' || typeof s.texto !== 'string')
        return false;
    }
  }
  return true;
}

async function main() {
  const skipFailed = process.argv.includes('--skip-failed');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY (.env.local ou export).');
    process.exit(1);
  }

  const source = process.env.SITE_DATA_SOURCE || DEFAULT_SOURCE;
  console.info('Fonte:', source);

  const res = await fetch(source, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    console.error('Falha ao obter site-data:', res.status, await res.text());
    process.exit(1);
  }
  const raw = (await res.json()) as unknown;
  if (!isValidSiteData(raw)) {
    console.error('JSON inválido (estrutura SiteData).');
    process.exit(1);
  }
  const siteData = raw;

  const projectBase = url.replace(/\/+$/, '');
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const candidates = collectImageUrls(siteData).filter(
    (u) => isHttpUrl(u) && !isAlreadySupabaseMedia(u, projectBase),
  );

  console.info('URLs a migrar:', candidates.length);

  const urlToPublic = new Map<string, string>();
  const failures: { url: string; reason: string }[] = [];

  for (const imageUrl of candidates) {
    const hash = createHash('sha256').update(imageUrl, 'utf8').digest('hex');
    let r: Response;
    try {
      r = await fetch(imageUrl, {
        redirect: 'follow',
        headers: {
          Accept: 'image/*,*/*;q=0.8',
          'User-Agent': 'SweetGarden-migrate/1.0',
        },
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      failures.push({ url: imageUrl, reason });
      if (!skipFailed) {
        console.error('Fetch falhou:', imageUrl, reason);
        process.exit(1);
      }
      continue;
    }
    if (!r.ok) {
      failures.push({ url: imageUrl, reason: `HTTP ${r.status}` });
      if (!skipFailed) {
        console.error('HTTP:', imageUrl, r.status);
        process.exit(1);
      }
      continue;
    }

    const buf = Buffer.from(await r.arrayBuffer());
    const ext = pickExt(r.headers.get('content-type'), imageUrl);
    const objectPath = `mirrored/${hash}${ext}`;

    const rawCt = r.headers.get('content-type');
    const contentType = rawCt ? rawCt.split(';')[0].trim() : 'application/octet-stream';
    const { error: upErr } = await supabase.storage.from('site-media').upload(objectPath, buf, {
      contentType,
      upsert: true,
    });
    if (upErr) {
      failures.push({ url: imageUrl, reason: upErr.message });
      if (!skipFailed) {
        console.error('Upload falhou:', imageUrl, upErr.message);
        process.exit(1);
      }
      continue;
    }

    const { data: pub } = supabase.storage.from('site-media').getPublicUrl(objectPath);
    urlToPublic.set(imageUrl, pub.publicUrl);
    console.info('OK', imageUrl.slice(0, 72) + (imageUrl.length > 72 ? '…' : ''));
  }

  if (failures.length) {
    console.warn('Falhas:', failures.length);
    for (const f of failures) console.warn(' -', f.url, '→', f.reason);
  }

  const updated = rewriteUrls(siteData, urlToPublic);

  const { error: dbErr } = await supabase.from('site_config').upsert({
    id: 'default',
    payload: updated,
    updated_at: new Date().toISOString(),
  });
  if (dbErr) {
    console.error('Upsert site_config:', dbErr.message);
    process.exit(1);
  }

  console.info('site_config atualizado. Imagens migradas:', urlToPublic.size);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
