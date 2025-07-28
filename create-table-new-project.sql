-- Criar tabela usuarios no novo projeto Supabase
-- Execute este SQL no SQL Editor do Supabase

-- Criar tabela usuarios (sem campo senha)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  oab TEXT NOT NULL,
  uf_oab TEXT NOT NULL,
  CONSTRAINT usuarios_oab_uf_unique UNIQUE (oab, uf_oab)
) TABLESPACE pg_default;

-- Inserir usuário de teste
INSERT INTO public.usuarios (nome_completo, email, oab, uf_oab)
VALUES ('Usuário Teste', 'teste@email.com', '123123', 'PR')
ON CONFLICT (oab, uf_oab) DO NOTHING;

-- Verificar se a tabela foi criada
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar dados
SELECT id, nome_completo, email, oab, uf_oab, criado_em 
FROM public.usuarios 
ORDER BY criado_em DESC; 