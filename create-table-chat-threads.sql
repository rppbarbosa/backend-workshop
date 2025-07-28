-- Tabela para armazenar threads de chat
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    etapa VARCHAR(50) NOT NULL, -- 'missao', 'swot', 'okr', etc.
    thread_id VARCHAR(255) NOT NULL,
    titulo VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ativo', -- 'ativo', 'finalizado', 'arquivado'
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chat_threads_pkey PRIMARY KEY (id),
    CONSTRAINT chat_threads_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT chat_threads_thread_id_unique UNIQUE (thread_id)
);

-- Tabela para armazenar mensagens do chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL, -- OpenAI thread ID (string)
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB, -- Para armazenar dados adicionais como insights, recomendações, etc.
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
    CONSTRAINT chat_messages_thread_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(thread_id) ON DELETE CASCADE
);

-- Tabela para armazenar relatórios gerados
CREATE TABLE IF NOT EXISTS public.chat_relatorios (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) NOT NULL, -- OpenAI thread ID (string)
    tipo_relatorio VARCHAR(50) NOT NULL, -- 'mvv', 'swot', 'okr', etc.
    titulo VARCHAR(255),
    conteudo TEXT NOT NULL,
    insights JSONB, -- Para armazenar insights estruturados
    recomendacoes JSONB, -- Para armazenar recomendações
    status VARCHAR(50) DEFAULT 'gerado', -- 'gerado', 'em_revisao', 'finalizado'
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT chat_relatorios_pkey PRIMARY KEY (id),
    CONSTRAINT chat_relatorios_thread_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(thread_id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_chat_threads_usuario ON public.chat_threads(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_etapa ON public.chat_threads(etapa);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON public.chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_relatorios_thread ON public.chat_relatorios(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_relatorios_tipo ON public.chat_relatorios(tipo_relatorio);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_threads_updated_at BEFORE UPDATE ON public.chat_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_relatorios_updated_at BEFORE UPDATE ON public.chat_relatorios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 