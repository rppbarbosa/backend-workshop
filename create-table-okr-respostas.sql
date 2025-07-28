-- Tabela para salvar as respostas da etapa Objetivos SMART e OKR
-- Estrutura com colunas específicas para cada pergunta

CREATE TABLE IF NOT EXISTS public.okr_respostas (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    
    -- OBJETIVO ESPECÍFICO (3 perguntas)
    main_objective TEXT,
    area_activity TEXT,
    importance_reason TEXT,
    
    -- OBJETIVO MENSUURÁVEL (1 pergunta)
    progress_indicators TEXT,
    
    -- OBJETIVO ATINGÍVEL (2 perguntas)
    current_resources TEXT,
    missing_resources TEXT,
    
    -- OBJETIVO RELEVANTE (1 pergunta)
    life_alignment TEXT,
    
    -- OBJETIVO TEMPORAL (1 pergunta)
    timeline TEXT,
    
    -- CONVERSÃO EM OKR (2 perguntas)
    okr_objective TEXT,
    key_results TEXT,
    
    -- Metadados
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT okr_respostas_pkey PRIMARY KEY (id),
    CONSTRAINT okr_respostas_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT okr_respostas_usuario_unique UNIQUE (usuario_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_okr_respostas_usuario_id ON public.okr_respostas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_okr_respostas_criado_em ON public.okr_respostas(criado_em);

-- Trigger para atualizar o campo atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_okr_respostas_atualizado_em
    BEFORE UPDATE ON public.okr_respostas
    FOR EACH ROW
    EXECUTE FUNCTION update_atualizado_em();

-- Comentários para documentação
COMMENT ON TABLE public.okr_respostas IS 'Tabela para armazenar as respostas da etapa Objetivos SMART e OKR';
COMMENT ON COLUMN public.okr_respostas.usuario_id IS 'ID do usuário que respondeu';
COMMENT ON COLUMN public.okr_respostas.main_objective IS 'Resposta: Qual é o principal objetivo que você deseja alcançar na sua carreira neste momento?';
COMMENT ON COLUMN public.okr_respostas.area_activity IS 'Resposta: Em que área ou atividade você deseja alcançar esse objetivo?';
COMMENT ON COLUMN public.okr_respostas.importance_reason IS 'Resposta: Por que esse objetivo é importante para você agora?';
COMMENT ON COLUMN public.okr_respostas.progress_indicators IS 'Resposta: Como você vai saber que está progredindo? Quais números, resultados ou sinais visíveis mostram que você está no caminho?';
COMMENT ON COLUMN public.okr_respostas.current_resources IS 'Resposta: O que você já tem hoje que pode te ajudar a alcançar essa meta?';
COMMENT ON COLUMN public.okr_respostas.missing_resources IS 'Resposta: E o que ainda falta para alcançar esse objetivo?';
COMMENT ON COLUMN public.okr_respostas.life_alignment IS 'Resposta: Esse objetivo está alinhado com o que você realmente quer para sua vida? Ele combina com seus valores e propósito?';
COMMENT ON COLUMN public.okr_respostas.timeline IS 'Resposta: Em quanto tempo você deseja alcançar essa meta? Podemos dividir por marcos: 1 mês, 3 meses, 6 meses...';
COMMENT ON COLUMN public.okr_respostas.okr_objective IS 'Resposta: Com base no que conversamos, me diga de forma clara e inspiradora: Qual é o seu objetivo principal?';
COMMENT ON COLUMN public.okr_respostas.key_results IS 'Resposta: Pense em 2 a 3 resultados mensuráveis que mostram que você está no caminho certo. O que precisa acontecer?'; 