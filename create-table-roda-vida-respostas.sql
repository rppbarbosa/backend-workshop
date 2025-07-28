-- Tabela para salvar as respostas da etapa Roda da Vida
-- Estrutura com colunas específicas para cada âmbito da vida (12 âmbitos x 3 perguntas = 36 campos)

CREATE TABLE IF NOT EXISTS public.roda_vida_respostas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    
    -- 🔶 ÁREA PESSOAL - ÂMBITO 1: Saúde e Disposição
    saude_disposicao_atual TEXT,
    saude_disposicao_meta TEXT,
    saude_disposicao_acao TEXT,
    
    -- 🔶 ÁREA PESSOAL - ÂMBITO 2: Desenvolvimento Intelectual
    desenvolvimento_intelectual_atual TEXT,
    desenvolvimento_intelectual_meta TEXT,
    desenvolvimento_intelectual_acao TEXT,
    
    -- 🔶 ÁREA PESSOAL - ÂMBITO 3: Equilíbrio Emocional
    equilibrio_emocional_atual TEXT,
    equilibrio_emocional_meta TEXT,
    equilibrio_emocional_acao TEXT,
    
    -- 🔷 ÁREA PROFISSIONAL - ÂMBITO 4: Realização e Propósito
    realizacao_proposito_atual TEXT,
    realizacao_proposito_meta TEXT,
    realizacao_proposito_acao TEXT,
    
    -- 🔷 ÁREA PROFISSIONAL - ÂMBITO 5: Recursos Financeiros
    recursos_financeiros_atual TEXT,
    recursos_financeiros_meta TEXT,
    recursos_financeiros_acao TEXT,
    
    -- 🔷 ÁREA PROFISSIONAL - ÂMBITO 6: Contribuição Social
    contribuicao_social_atual TEXT,
    contribuicao_social_meta TEXT,
    contribuicao_social_acao TEXT,
    
    -- 🟣 ÁREA RELACIONAMENTOS - ÂMBITO 7: Família
    familia_atual TEXT,
    familia_meta TEXT,
    familia_acao TEXT,
    
    -- 🟣 ÁREA RELACIONAMENTOS - ÂMBITO 8: Desenvolvimento Amoroso
    desenvolvimento_amoroso_atual TEXT,
    desenvolvimento_amoroso_meta TEXT,
    desenvolvimento_amoroso_acao TEXT,
    
    -- 🟣 ÁREA RELACIONAMENTOS - ÂMBITO 9: Vida Social
    vida_social_atual TEXT,
    vida_social_meta TEXT,
    vida_social_acao TEXT,
    
    -- 🟢 ÁREA QUALIDADE DE VIDA - ÂMBITO 10: Diversão
    diversao_atual TEXT,
    diversao_meta TEXT,
    diversao_acao TEXT,
    
    -- 🟢 ÁREA QUALIDADE DE VIDA - ÂMBITO 11: Felicidade
    felicidade_atual TEXT,
    felicidade_meta TEXT,
    felicidade_acao TEXT,
    
    -- 🟢 ÁREA QUALIDADE DE VIDA - ÂMBITO 12: Espiritualidade
    espiritualidade_atual TEXT,
    espiritualidade_meta TEXT,
    espiritualidade_acao TEXT,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT roda_vida_respostas_pkey PRIMARY KEY (id),
    CONSTRAINT roda_vida_respostas_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT roda_vida_respostas_usuario_unique UNIQUE (usuario_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_roda_vida_respostas_usuario_id ON public.roda_vida_respostas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_roda_vida_respostas_criado_em ON public.roda_vida_respostas(criado_em);

-- Trigger para atualizar o campo atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_roda_vida_respostas_atualizado_em
    BEFORE UPDATE ON public.roda_vida_respostas
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em();

-- Comentários para documentação
COMMENT ON TABLE public.roda_vida_respostas IS 'Tabela para armazenar as respostas da etapa Roda da Vida - 12 âmbitos com 3 perguntas cada';

-- Comentários para Área Pessoal
COMMENT ON COLUMN public.roda_vida_respostas.saude_disposicao_atual IS 'Nota atual (0-10): Qual sua nota atual para sua saúde e disposição física e mental?';
COMMENT ON COLUMN public.roda_vida_respostas.saude_disposicao_meta IS 'Meta desejada (0-10): Qual seria sua nota ideal para saúde e disposição?';
COMMENT ON COLUMN public.roda_vida_respostas.saude_disposicao_acao IS 'Ação prática: O que você pretende fazer para atingir essa meta?';

COMMENT ON COLUMN public.roda_vida_respostas.desenvolvimento_intelectual_atual IS 'Nota atual (0-10): Qual sua nota atual para aprendizado e desenvolvimento de habilidades?';
COMMENT ON COLUMN public.roda_vida_respostas.desenvolvimento_intelectual_meta IS 'Meta desejada (0-10): Qual nota ideal para desenvolvimento intelectual?';
COMMENT ON COLUMN public.roda_vida_respostas.desenvolvimento_intelectual_acao IS 'Ação prática: O que você pretende fazer para evoluir nisso?';

COMMENT ON COLUMN public.roda_vida_respostas.equilibrio_emocional_atual IS 'Nota atual (0-10): Qual sua nota atual para estabilidade emocional e bem-estar?';
COMMENT ON COLUMN public.roda_vida_respostas.equilibrio_emocional_meta IS 'Meta desejada (0-10): Qual nota ideal para equilíbrio emocional?';
COMMENT ON COLUMN public.roda_vida_respostas.equilibrio_emocional_acao IS 'Ação prática: O que você pode fazer para se sentir mais equilibrado?';

-- Comentários para Área Profissional
COMMENT ON COLUMN public.roda_vida_respostas.realizacao_proposito_atual IS 'Nota atual (0-10): Qual sua satisfação com seu propósito profissional?';
COMMENT ON COLUMN public.roda_vida_respostas.realizacao_proposito_meta IS 'Meta desejada (0-10): Qual seria sua meta para realização profissional?';
COMMENT ON COLUMN public.roda_vida_respostas.realizacao_proposito_acao IS 'Ação prática: O que você pode fazer para se sentir mais realizado?';

COMMENT ON COLUMN public.roda_vida_respostas.recursos_financeiros_atual IS 'Nota atual (0-10): Qual nota você dá para sua organização financeira?';
COMMENT ON COLUMN public.roda_vida_respostas.recursos_financeiros_meta IS 'Meta desejada (0-10): Qual é a nota ideal para recursos financeiros?';
COMMENT ON COLUMN public.roda_vida_respostas.recursos_financeiros_acao IS 'Ação prática: O que você pode fazer para melhorar sua relação com o dinheiro?';

COMMENT ON COLUMN public.roda_vida_respostas.contribuicao_social_atual IS 'Nota atual (0-10): Quanto você sente que contribui para a sociedade?';
COMMENT ON COLUMN public.roda_vida_respostas.contribuicao_social_meta IS 'Meta desejada (0-10): Qual meta para contribuição social?';
COMMENT ON COLUMN public.roda_vida_respostas.contribuicao_social_acao IS 'Ação prática: Que ações você pretende adotar para contribuir mais?';

-- Comentários para Área Relacionamentos
COMMENT ON COLUMN public.roda_vida_respostas.familia_atual IS 'Nota atual (0-10): Como você avalia a qualidade do seu relacionamento familiar?';
COMMENT ON COLUMN public.roda_vida_respostas.familia_meta IS 'Meta desejada (0-10): Qual seria a nota desejada para família?';
COMMENT ON COLUMN public.roda_vida_respostas.familia_acao IS 'Ação prática: O que você pode fazer para melhorar o relacionamento familiar?';

COMMENT ON COLUMN public.roda_vida_respostas.desenvolvimento_amoroso_atual IS 'Nota atual (0-10): Qual nota você dá para sua vida afetiva e amorosa?';
COMMENT ON COLUMN public.roda_vida_respostas.desenvolvimento_amoroso_meta IS 'Meta desejada (0-10): Qual é a nota ideal para vida amorosa?';
COMMENT ON COLUMN public.roda_vida_respostas.desenvolvimento_amoroso_acao IS 'Ação prática: Que atitudes você pode tomar para melhorar isso?';

COMMENT ON COLUMN public.roda_vida_respostas.vida_social_atual IS 'Nota atual (0-10): Qual sua satisfação com seu círculo de amizades?';
COMMENT ON COLUMN public.roda_vida_respostas.vida_social_meta IS 'Meta desejada (0-10): Qual seria a meta desejada para vida social?';
COMMENT ON COLUMN public.roda_vida_respostas.vida_social_acao IS 'Ação prática: O que você pode fazer para fortalecer sua vida social?';

-- Comentários para Área Qualidade de Vida
COMMENT ON COLUMN public.roda_vida_respostas.diversao_atual IS 'Nota atual (0-10): Quanto tempo e qualidade você dedica ao lazer?';
COMMENT ON COLUMN public.roda_vida_respostas.diversao_meta IS 'Meta desejada (0-10): Qual seria a nota ideal para diversão?';
COMMENT ON COLUMN public.roda_vida_respostas.diversao_acao IS 'Ação prática: O que você pode fazer para se divertir mais?';

COMMENT ON COLUMN public.roda_vida_respostas.felicidade_atual IS 'Nota atual (0-10): Qual nota você dá para sua sensação de felicidade?';
COMMENT ON COLUMN public.roda_vida_respostas.felicidade_meta IS 'Meta desejada (0-10): Qual meta para felicidade?';
COMMENT ON COLUMN public.roda_vida_respostas.felicidade_acao IS 'Ação prática: O que pode fazer para sentir mais felicidade?';

COMMENT ON COLUMN public.roda_vida_respostas.espiritualidade_atual IS 'Nota atual (0-10): Como está sua conexão com espiritualidade?';
COMMENT ON COLUMN public.roda_vida_respostas.espiritualidade_meta IS 'Meta desejada (0-10): Qual seria a nota ideal para espiritualidade?';
COMMENT ON COLUMN public.roda_vida_respostas.espiritualidade_acao IS 'Ação prática: O que você pode fazer para fortalecer essa conexão?'; 