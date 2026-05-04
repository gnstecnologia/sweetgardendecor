'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === 'string' ? j.error : 'Falha no login');
        return;
      }
      router.replace('/admin');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.25rem' }}>Sweet Garden — admin</h1>
      <p style={{ color: '#5c6f62', fontSize: '0.9rem' }}>Introduza a senha configurada no servidor (ADMIN_PASSWORD).</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
        <label>
          <span className="sr-only">Senha</span>{' '}
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            style={{ width: '100%', minHeight: 44, padding: '0 0.75rem', borderRadius: 8, border: '1px solid #e2e8e4', fontSize: 16 }}
          />
        </label>
        {error ? (
          <p role="alert" style={{ color: '#b42318', margin: 0, fontSize: '0.9rem' }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          style={{
            minHeight: 44,
            borderRadius: 8,
            border: 'none',
            background: '#2d6a4f',
            color: '#fff',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
      <p style={{ marginTop: '2rem', fontSize: '0.85rem' }}>
        <Link href="/">← Voltar ao site</Link>
      </p>
    </div>
  );
}
