-- Tabela para salvar as respostas da Análise SWOT
-- Estrutura com colunas específicas para cada pergunta

CREATE TABLE IF NOT EXISTS public.swot_respostas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    
    -- FORÇAS (Strengths) - 7 perguntas
    habilidades_talentos TEXT,
    destaque_profissional TEXT,
    recursos_pessoais TEXT,
    parcerias_conexoes TEXT,
    elogios_reconhecimento TEXT,
    vantagens_beneficios TEXT,
    feedbacks_positivos TEXT,
    
    -- FRAQUEZAS (Weaknesses) - 7 perguntas
    areas_melhoria TEXT,
    limitacoes_pessoais TEXT,
    lacunas_conhecimento TEXT,
    habitos_prejudiciais TEXT,
    feedbacks_negativos TEXT,
    recursos_faltantes TEXT,
    pontos_fracos TEXT,
    
    -- OPORTUNIDADES (Opportunities) - 7 perguntas
    tendencias_mercado TEXT,
    areas_crescimento TEXT,
    parcerias_potenciais TEXT,
    tecnologias_emergentes TEXT,
    mudancas_setor TEXT,
    nichos_mercado TEXT,
    recursos_disponiveis TEXT,
    
    -- AMEAÇAS (Threats) - 7 perguntas
    obstaculos_externos TEXT,
    mudancas_prejudiciais TEXT,
    concorrentes_ameacas TEXT,
    riscos_economicos TEXT,
    mudancas_regulatorias TEXT,
    ameacas_tecnologicas TEXT,
    fatores_sociais TEXT,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT swot_respostas_pkey PRIMARY KEY (id),
    CONSTRAINT swot_respostas_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT swot_respostas_usuario_unique UNIQUE (usuario_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_swot_respostas_usuario_id ON public.swot_respostas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_swot_respostas_criado_em ON public.swot_respostas(criado_em);

-- Trigger para atualizar o campo atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_swot_respostas_atualizado_em
    BEFORE UPDATE ON public.swot_respostas
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em();

-- Comentários para documentação
COMMENT ON TABLE public.swot_respostas IS 'Tabela para armazenar as respostas da etapa Análise SWOT';
COMMENT ON COLUMN public.swot_respostas.usuario_id IS 'ID do usuário que respondeu';

-- Comentários para FORÇAS
COMMENT ON COLUMN public.swot_respostas.habilidades_talentos IS 'Resposta: Quais são suas maiores habilidades e talentos que você considera essenciais para seu sucesso?';
COMMENT ON COLUMN public.swot_respostas.destaque_profissional IS 'Resposta: Em que você se destaca na sua rotina profissional ou pessoal?';
COMMENT ON COLUMN public.swot_respostas.recursos_pessoais IS 'Resposta: Quais recursos pessoais (conhecimentos, redes, experiências) você tem à disposição?';
COMMENT ON COLUMN public.swot_respostas.parcerias_conexoes IS 'Resposta: Quais parcerias ou conexões fortalecem sua trajetória profissional?';
COMMENT ON COLUMN public.swot_respostas.elogios_reconhecimento IS 'Resposta: Do que as pessoas mais elogiam ou reconhecem em você?';
COMMENT ON COLUMN public.swot_respostas.vantagens_beneficios IS 'Resposta: Quais vantagens ou benefícios você percebe que tem na sua atuação?';
COMMENT ON COLUMN public.swot_respostas.feedbacks_positivos IS 'Resposta: Que feedbacks positivos você costuma receber de colegas, clientes ou parceiros?';

-- Comentários para FRAQUEZAS
COMMENT ON COLUMN public.swot_respostas.areas_melhoria IS 'Resposta: Quais áreas você identifica que precisam de melhoria ou desenvolvimento?';
COMMENT ON COLUMN public.swot_respostas.limitacoes_pessoais IS 'Resposta: Que limitações pessoais ou profissionais você reconhece em si mesmo?';
COMMENT ON COLUMN public.swot_respostas.lacunas_conhecimento IS 'Resposta: Que lacunas de conhecimento ou habilidades você identifica?';
COMMENT ON COLUMN public.swot_respostas.habitos_prejudiciais IS 'Resposta: Quais hábitos ou comportamentos você considera prejudiciais ao seu desenvolvimento?';
COMMENT ON COLUMN public.swot_respostas.feedbacks_negativos IS 'Resposta: Que feedbacks negativos ou construtivos você já recebeu?';
COMMENT ON COLUMN public.swot_respostas.recursos_faltantes IS 'Resposta: Que recursos ou ferramentas você sente que estão faltando?';
COMMENT ON COLUMN public.swot_respostas.pontos_fracos IS 'Resposta: Quais são seus pontos fracos que podem impactar negativamente sua carreira?';

-- Comentários para OPORTUNIDADES
COMMENT ON COLUMN public.swot_respostas.tendencias_mercado IS 'Resposta: Que tendências do mercado você identifica que podem beneficiar sua carreira?';
COMMENT ON COLUMN public.swot_respostas.areas_crescimento IS 'Resposta: Quais áreas de crescimento ou expansão você vê no seu setor?';
COMMENT ON COLUMN public.swot_respostas.parcerias_potenciais IS 'Resposta: Que parcerias ou colaborações você considera promissoras?';
COMMENT ON COLUMN public.swot_respostas.tecnologias_emergentes IS 'Resposta: Que tecnologias emergentes podem criar oportunidades para você?';
COMMENT ON COLUMN public.swot_respostas.mudancas_setor IS 'Resposta: Que mudanças no seu setor podem abrir novas possibilidades?';
COMMENT ON COLUMN public.swot_respostas.nichos_mercado IS 'Resposta: Que nichos de mercado você identifica que podem ser explorados?';
COMMENT ON COLUMN public.swot_respostas.recursos_disponiveis IS 'Resposta: Que recursos ou oportunidades estão disponíveis que você ainda não aproveitou?';

-- Comentários para AMEAÇAS
COMMENT ON COLUMN public.swot_respostas.obstaculos_externos IS 'Resposta: Quais obstáculos externos podem dificultar a realização dos seus objetivos?';
COMMENT ON COLUMN public.swot_respostas.mudancas_prejudiciais IS 'Resposta: Existem mudanças no seu setor ou mercado que podem ser prejudiciais para você?';
COMMENT ON COLUMN public.swot_respostas.concorrentes_ameacas IS 'Resposta: Que concorrentes, situações econômicas ou sociais você considera uma ameaça ao seu sucesso?';
COMMENT ON COLUMN public.swot_respostas.riscos_economicos IS 'Resposta: Que riscos econômicos podem impactar negativamente sua carreira?';
COMMENT ON COLUMN public.swot_respostas.mudancas_regulatorias IS 'Resposta: Que mudanças regulatórias podem afetar seu trabalho?';
COMMENT ON COLUMN public.swot_respostas.ameacas_tecnologicas IS 'Resposta: Que ameaças tecnológicas podem impactar sua área de atuação?';
COMMENT ON COLUMN public.swot_respostas.fatores_sociais IS 'Resposta: Que fatores sociais ou políticos podem representar ameaças?'; 