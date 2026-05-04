import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getSupabaseServer, isSupabaseConfigured } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

function looksLikeImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const name = (file.name || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?|svg)$/i.test(name);
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Form inválido' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Ficheiro em falta' }, { status: 400 });
  }
  if (!looksLikeImageFile(file)) {
    return NextResponse.json({ error: 'Apenas ficheiros de imagem são aceites.' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const orig = file.name || 'image';
  const extMatch = orig.match(/(\.[a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : '.jpg';
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const objectPath = `uploads/${base}`;
  const contentType = file.type || 'application/octet-stream';

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
