import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { SiteData } from '@/lib/types';

const KV_KEY = 'sweetgarden:site';
const LOCAL_DIR = path.join(process.cwd(), 'local-storage');
const LOCAL_FILE = path.join(LOCAL_DIR, 'site-data.json');
const SEED_FILE = path.join(process.cwd(), 'site-data.json');

function useKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** Na Vercel o filesystem do servidor não é persistente para pastas do projeto; sem KV não se pode gravar local-storage. */
function isVercelServer(): boolean {
  return process.env.VERCEL === '1';
}

async function readSeedFromDisk(): Promise<SiteData> {
  const raw = await readFile(SEED_FILE, 'utf8');
  return JSON.parse(raw) as SiteData;
}

export async function getSiteData(): Promise<SiteData> {
  if (useKv()) {
    const mod = await import('@vercel/kv');
    const kv = mod.kv;
    const raw = await kv.get<string>(KV_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as SiteData;
      } catch {
        /* fallthrough seed */
      }
    }
    const seeded = await readSeedFromDisk();
    await kv.set(KV_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const raw = await readFile(LOCAL_FILE, 'utf8');
    return JSON.parse(raw) as SiteData;
  } catch {
    const seeded = await readSeedFromDisk();
    if (isVercelServer()) {
      return seeded;
    }
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(LOCAL_FILE, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
}

export async function setSiteData(data: SiteData): Promise<void> {
  const body = JSON.stringify(data);
  if (useKv()) {
    const mod = await import('@vercel/kv');
    await mod.kv.set(KV_KEY, body);
    return;
  }
  if (isVercelServer()) {
    throw new Error(
      'Na Vercel é necessário configurar KV_REST_API_URL e KV_REST_API_TOKEN (Vercel KV) para guardar alterações.'
    );
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(LOCAL_FILE, body, 'utf8');
}
