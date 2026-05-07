import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getSupabaseServer, isSupabaseConfigured } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/jfif': '.jfif',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/jxl': '.jxl',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

function extFromMime(mime: string): string | null {
  const key = mime.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXT[key] ?? null;
}

function looksLikeImageByMeta(name: string, mime: string): boolean {
  if (mime.startsWith('image/')) return true;
  const n = (name || '').toLowerCase();
  return /\.(jpe?g|jfif|png|gif|webp|avif|heic|heif|bmp|tiff?|svg|jxl)$/i.test(n);
}

/** Alguns telemóveis enviam octet-stream ou tipo vazio; aceitar por assinatura mágica. */
function looksLikeImageByMagic(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)
    return true;
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && (buf[3] === 0x18 || buf[3] === 0x1c || buf[3] === 0x20) && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70)
    return true;
  return false;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    const hint = e instanceof Error ? e.message : '';
    return NextResponse.json(
      { error: `Form inválido ou corpo demasiado grande. ${hint}`.trim() },
      { status: 400 }
    );
  }

  const raw = form.get('file');
  if (raw == null || typeof raw === 'string') {
    return NextResponse.json({ error: 'Ficheiro em falta' }, { status: 400 });
  }
  if (!(raw instanceof Blob) || raw.size === 0) {
    return NextResponse.json({ error: 'Ficheiro em falta' }, { status: 400 });
  }

  const orig = raw instanceof File ? raw.name : 'image';
  const mime = raw.type || '';

  const buf = Buffer.from(await raw.arrayBuffer());

  if (!looksLikeImageByMeta(orig, mime) && !looksLikeImageByMagic(buf)) {
    return NextResponse.json({ error: 'Apenas ficheiros de imagem são aceites.' }, { status: 400 });
  }

  const extMatch = orig.match(/(\.[a-z0-9]+)$/i);
  const extFromName = extMatch ? extMatch[1].toLowerCase() : null;
  const ext = extFromName && /\.(jpe?g|jfif|png|gif|webp|avif|heic|heif|bmp|tiff?|svg|jxl)$/i.test(extFromName)
    ? extFromName
    : extFromMime(mime) || '.jpg';
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const objectPath = `uploads/${base}`;
  const contentTypeFromExt = (e: string): string => {
    const m: Record<string, string> = {
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.avif': 'image/avif',
      '.jxl': 'image/jxl',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.jfif': 'image/jpeg',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
    };
    return m[e.toLowerCase()] || 'image/jpeg';
  };
  let contentType = mime.split(';')[0].trim();
  if (!contentType || contentType === 'application/octet-stream') {
    contentType = extFromMime(mime) || contentTypeFromExt(ext);
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServer();
      const { error } = await supabase.storage.from('site-media').upload(objectPath, buf, {
        contentType,
        upsert: false,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const { data: pub } = supabase.storage.from('site-media').getPublicUrl(objectPath);
      return NextResponse.json({ url: pub.publicUrl });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro no Storage';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const key = `uploads/${base}`;
    const blob = await put(key, buf, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url });
  }

  const rel = `uploads/${base}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), 'public', rel), buf);
  return NextResponse.json({ url: '/' + rel.replace(/^\/+/, '') });
}
