import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD não configurada no servidor' },
      { status: 500 }
    );
  }
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const password = body.password ?? '';
  if (!safeEqual(password, admin)) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }
  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();
  return NextResponse.json({ ok: true });
}
