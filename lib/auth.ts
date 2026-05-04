import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  isLoggedIn: boolean;
};

function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set and at least 32 characters in production');
    }
    return '0123456789abcdef0123456789abcdef';
  }
  return s;
}

const baseSessionOptions: Omit<SessionOptions, 'password'> = {
  cookieName: 'sweetgarden_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  const sessionOptions: SessionOptions = {
    ...baseSessionOptions,
    password: getSessionSecret(),
  };
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
