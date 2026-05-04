# Supabase (SweetGarden)

## Project ref

`pcudkhfnujqbsvtlpcij` (URL: `https://pcudkhfnujqbsvtlpcij.supabase.co`)

## Aplicar migrações ao projeto remoto

1. Instalar a CLI: <https://supabase.com/docs/guides/cli>
2. Na raiz do repositório:

```bash
supabase login
supabase link --project-ref pcudkhfnujqbsvtlpcij
supabase db push
```

Alternativa: copiar o SQL de `supabase/migrations/` para **SQL Editor** no dashboard Supabase e executar.

## Variáveis na Vercel

Ver comentários em `.env.example` (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY`).
