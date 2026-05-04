import { NextResponse } from 'next/server';
import { getSiteData, setSiteData } from '@/lib/store';
import type { SiteData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSiteData();
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function isValidPayload(x: unknown): x is SiteData {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (typeof o.version !== 'number' || !Array.isArray(o.carrossels)) return false;
  for (const c of o.carrossels as Record<string, unknown>[]) {
    if (!c || typeof c.id !== 'string' || typeof c.titulo !== 'string' || !Array.isArray(c.slides)) return false;
    for (const s of c.slides as Record<string, unknown>[]) {
      if (!s || typeof s.img !== 'string' || typeof s.link !== 'string' || typeof s.texto !== 'string') return false;
    }
  }
  return true;
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!isValidPayload(body)) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    const clean: SiteData = {
      version: body.version,
      carrossels: body.carrossels.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        reorder: !!(c as { reorder?: boolean }).reorder,
        slides: c.slides.map((s) => ({
          sid: typeof s.sid === 'string' ? s.sid : undefined,
          img: s.img,
          imgHover: s.imgHover || '',
          link: s.link,
          texto: s.texto,
          destaque: !!s.destaque,
        })),
      })),
    };
    await setSiteData(clean);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
