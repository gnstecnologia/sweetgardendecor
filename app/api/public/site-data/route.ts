import { NextResponse } from 'next/server';
import { getSiteData } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getSiteData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
