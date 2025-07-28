-- Atualizar tabela usuarios para sistema sem senha
-- Remover coluna senha_hash se existir
ALTER TABLE public.usuarios DROP COLUMN IF EXISTS senha_hash;

-- Verificar estrutura atual da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Inserir usuário de teste (se não existir)
INSERT INTO public.usuarios (nome_completo, email, oab, uf_oab)
VALUES ('Usuário Teste', 'teste@email.com', '123123', 'PR')
ON CONFLICT (oab, uf_oab) DO NOTHING;

-- Verificar dados
SELECT id, nome_completo, email, oab, uf_oab, criado_em 
FROM public.usuarios 
ORDER BY criado_em DESC; 