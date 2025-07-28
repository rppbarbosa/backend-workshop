-- Tabela para armazenar as respostas do questionário dos 4 Temperamentos
CREATE TABLE public.temperamentos_respostas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL,
    
    -- Respostas das 10 perguntas dos Temperamentos
    temperamento_1 text NULL,
    temperamento_2 text NULL,
    temperamento_3 text NULL,
    temperamento_4 text NULL,
    temperamento_5 text NULL,
    temperamento_6 text NULL,
    temperamento_7 text NULL,
    temperamento_8 text NULL,
    temperamento_9 text NULL,
    temperamento_10 text NULL,
    
    -- Metadados
    criado_em timestamp with time zone NOT NULL DEFAULT now(),
    atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT temperamentos_respostas_pkey PRIMARY KEY (id),
    CONSTRAINT temperamentos_respostas_usuario_unique UNIQUE (usuario_id),
    CONSTRAINT temperamentos_respostas_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_temperamentos_respostas_usuario_id ON public.temperamentos_respostas USING btree (usuario_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_temperamentos_respostas_criado_em ON public.temperamentos_respostas USING btree (criado_em) TABLESPACE pg_default;

-- Trigger para atualizar o campo atualizado_em automaticamente
CREATE TRIGGER trigger_update_temperamentos_respostas_atualizado_em
    BEFORE UPDATE ON temperamentos_respostas
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em();

-- Comentários
COMMENT ON TABLE public.temperamentos_respostas IS 'Armazena as respostas do questionário dos 4 Temperamentos (Colérico, Sanguíneo, Melancólico, Fleumático)';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_1 IS 'Resposta da pergunta 1: Quando algo inesperado acontece e muda seus planos, você';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_2 IS 'Resposta da pergunta 2: Em dias normais, sua energia costuma ser';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_3 IS 'Resposta da pergunta 3: Quando precisa falar sobre seus sentimentos';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_4 IS 'Resposta da pergunta 4: O que mais te irrita nas pessoas é';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_5 IS 'Resposta da pergunta 5: Em momentos de silêncio e solidão';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_6 IS 'Resposta da pergunta 6: Sua forma de lidar com dor emocional é';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_7 IS 'Resposta da pergunta 7: Em um conflito, sua reação automática seria';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_8 IS 'Resposta da pergunta 8: Quando pensa no futuro, você';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_9 IS 'Resposta da pergunta 9: Como você lida com rotina';
COMMENT ON COLUMN public.temperamentos_respostas.temperamento_10 IS 'Resposta da pergunta 10: No fundo, o que você mais busca na vida'; 