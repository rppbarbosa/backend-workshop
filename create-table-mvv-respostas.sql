-- Tabela para salvar as respostas da Missão, Visão e Valores
-- Estrutura com colunas específicas para cada pergunta

CREATE TABLE IF NOT EXISTS public.mvv_respostas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    
    -- MISSÃO (3 perguntas)
    atividades_motivadoras TEXT,
    beneficiarios TEXT,
    satisfacao_profissional TEXT,
    
    -- VISÃO (3 perguntas)
    carreira_5_anos TEXT,
    reconhecimento_profissional TEXT,
    impacto_legado TEXT,
    
    -- VALORES (3 perguntas)
    atitudes_admiraveis TEXT,
    comportamentos_inaceitaveis TEXT,
    valores_decisoes TEXT,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT mvv_respostas_pkey PRIMARY KEY (id),
    CONSTRAINT mvv_respostas_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT mvv_respostas_usuario_unique UNIQUE (usuario_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_mvv_respostas_usuario_id ON public.mvv_respostas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mvv_respostas_criado_em ON public.mvv_respostas(criado_em);

-- Trigger para atualizar o campo atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mvv_respostas_atualizado_em
    BEFORE UPDATE ON public.mvv_respostas
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em();

-- Comentários para documentação
COMMENT ON TABLE public.mvv_respostas IS 'Tabela para armazenar as respostas da etapa Missão, Visão e Valores';
COMMENT ON COLUMN public.mvv_respostas.usuario_id IS 'ID do usuário que respondeu';
COMMENT ON COLUMN public.mvv_respostas.atividades_motivadoras IS 'Resposta: Quais atividades profissionais você realiza que fazem você se sentir útil, feliz e motivado?';
COMMENT ON COLUMN public.mvv_respostas.beneficiarios IS 'Resposta: Quem são as pessoas diretamente beneficiadas pelo seu trabalho e como você as ajuda?';
COMMENT ON COLUMN public.mvv_respostas.satisfacao_profissional IS 'Resposta: De tudo o que você já fez profissionalmente, o que mais trouxe satisfação pessoal para você e por quê?';
COMMENT ON COLUMN public.mvv_respostas.carreira_5_anos IS 'Resposta: Como você imagina sua carreira daqui a 5 anos? Quais conquistas quer alcançar até lá?';
COMMENT ON COLUMN public.mvv_respostas.reconhecimento_profissional IS 'Resposta: Qual reconhecimento profissional você deseja ter obtido nesse período?';
COMMENT ON COLUMN public.mvv_respostas.impacto_legado IS 'Resposta: Que impacto positivo ou legado você quer deixar para a sua comunidade profissional?';
COMMENT ON COLUMN public.mvv_respostas.atitudes_admiraveis IS 'Resposta: Quais atitudes ou comportamentos você admira profundamente nas outras pessoas?';
COMMENT ON COLUMN public.mvv_respostas.comportamentos_inaceitaveis IS 'Resposta: Quais comportamentos são inaceitáveis para você, profissional ou pessoalmente?';
COMMENT ON COLUMN public.mvv_respostas.valores_decisoes IS 'Resposta: Nas decisões mais difíceis da sua vida, que valores sempre guiaram suas escolhas?'; 