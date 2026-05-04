# Supabase (SweetGarden)

## Project ref

`pcudkhfnujqbsvtlpcij` (URL: `https://pcudkhfnujqbsvtlpcij.supabase.co`)

## Aplicar migrações ao projeto remoto

### Opção A — script Node (só precisa da password da DB no `.env`)

```bash
npm run db:apply-sql
```

Usa `SUPABASE_DB_PASSWORD` e, opcionalmente, `SUPABASE_PROJECT_REF` (default `pcudkhfnujqbsvtlpcij`). Outro ficheiro SQL: `npm run db:apply-sql -- caminho/para/ficheiro.sql`.

### Opção B — Supabase CLI

1. Instalar a CLI: <https://supabase.com/docs/guides/cli>
2. Na raiz do repositório:

```bash
supabase login
supabase link --project-ref pcudkhfnujqbsvtlpcij
supabase db push
```

### Opção C — SQL Editor

Copiar o SQL de `supabase/migrations/` para **SQL Editor** no dashboard Supabase e executar.

## Variáveis na Vercel

Ver comentários em `.env.example` (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY`).
