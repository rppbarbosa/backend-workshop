-- Tabela para armazenar as respostas do questionário DISC
CREATE TABLE public.disc_respostas (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL,
    
    -- Respostas das 10 perguntas do DISC
    disc_1 text NULL,
    disc_2 text NULL,
    disc_3 text NULL,
    disc_4 text NULL,
    disc_5 text NULL,
    disc_6 text NULL,
    disc_7 text NULL,
    disc_8 text NULL,
    disc_9 text NULL,
    disc_10 text NULL,
    
    -- Metadados
    criado_em timestamp with time zone NOT NULL DEFAULT now(),
    atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT disc_respostas_pkey PRIMARY KEY (id),
    CONSTRAINT disc_respostas_usuario_unique UNIQUE (usuario_id),
    CONSTRAINT disc_respostas_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_disc_respostas_usuario_id ON public.disc_respostas USING btree (usuario_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_disc_respostas_criado_em ON public.disc_respostas USING btree (criado_em) TABLESPACE pg_default;

-- Trigger para atualizar o campo atualizado_em automaticamente
CREATE TRIGGER trigger_update_disc_respostas_atualizado_em
    BEFORE UPDATE ON disc_respostas
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em();

-- Comentários
COMMENT ON TABLE public.disc_respostas IS 'Armazena as respostas do questionário DISC (Dominância, Influência, Estabilidade, Conformidade)';
COMMENT ON COLUMN public.disc_respostas.disc_1 IS 'Resposta da pergunta 1: Quando estou sob pressão, minha reação mais comum é';
COMMENT ON COLUMN public.disc_respostas.disc_2 IS 'Resposta da pergunta 2: Prefiro trabalhar em um ambiente onde';
COMMENT ON COLUMN public.disc_respostas.disc_3 IS 'Resposta da pergunta 3: Quando lidero um projeto, sou conhecido por';
COMMENT ON COLUMN public.disc_respostas.disc_4 IS 'Resposta da pergunta 4: Se algo dá errado, minha tendência é';
COMMENT ON COLUMN public.disc_respostas.disc_5 IS 'Resposta da pergunta 5: Em uma equipe, costumo ser a pessoa que';
COMMENT ON COLUMN public.disc_respostas.disc_6 IS 'Resposta da pergunta 6: Quando recebo uma crítica, geralmente';
COMMENT ON COLUMN public.disc_respostas.disc_7 IS 'Resposta da pergunta 7: O que mais me incomoda no trabalho é';
COMMENT ON COLUMN public.disc_respostas.disc_8 IS 'Resposta da pergunta 8: Em um projeto novo, minha primeira atitude é';
COMMENT ON COLUMN public.disc_respostas.disc_9 IS 'Resposta da pergunta 9: Em tomadas de decisão, costumo';
COMMENT ON COLUMN public.disc_respostas.disc_10 IS 'Resposta da pergunta 10: Quando participo de reuniões, eu'; 