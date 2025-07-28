require('dotenv').config({ path: './config.env' });
const fetch = require('node-fetch');
const OpenAI = require('openai');

class ChatAPI {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiClient = new OpenAI({ apiKey: this.openaiApiKey });
    
    // Verificar se as variáveis de ambiente estão configuradas
    if (!this.supabaseUrl || !this.supabaseKey) {
      console.error('❌ Variáveis de ambiente do Supabase não configuradas');
      console.error('SUPABASE_URL:', this.supabaseUrl ? '✅ Configurado' : '❌ Não configurado');
      console.error('SUPABASE_SERVICE_ROLE_KEY:', this.supabaseKey ? '✅ Configurado' : '❌ Não configurado');
    } else {
      console.log('✅ Configuração do Supabase carregada');
      console.log('🔑 Usando SERVICE_ROLE_KEY para bypassar RLS');
    }
  }

  // Criar uma nova thread de chat
  async createChatThread(usuarioId, etapa, titulo = null) {
    const threadId = `thread_${etapa}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
        etapa: etapa,
        thread_id: threadId,
        titulo: titulo || `Thread ${etapa} - ${new Date().toLocaleDateString('pt-BR')}`,
        status: 'ativo'
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao criar thread: ${response.status}`);
    }

    const data = await response.json();
    console.log('Thread criada:', data);
    return data;
  }

  // Buscar thread por ID
  async getChatThread(threadId) {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_threads?thread_id=eq.${threadId}`, {
      headers: {
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar thread: ${response.status}`);
    }

    const data = await response.json();
    return data[0] || null;
  }

  // Buscar threads de um usuário
  async getUserThreads(usuarioId, etapa = null) {
    let url = `${this.supabaseUrl}/rest/v1/chat_threads?usuario_id=eq.${usuarioId}&order=criado_em.desc`;
    if (etapa) {
      url = `${this.supabaseUrl}/rest/v1/chat_threads?usuario_id=eq.${usuarioId}&etapa=eq.${etapa}&order=criado_em.desc`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar threads: ${response.status}`);
    }

    return await response.json();
  }

  // Salvar mensagem no chat
  async saveChatMessage(threadId, role, content, metadata = null) {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      },
      body: JSON.stringify({
        thread_id: threadId, // Usar o ID da thread OpenAI (string)
        role: role,
        content: content,
        metadata: metadata
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao salvar mensagem:', response.status, errorText);
      throw new Error(`Erro ao salvar mensagem: ${response.status} - ${errorText}`);
    }

    // Supabase pode retornar resposta vazia para POST bem-sucedido
    let data;
    try {
      data = await response.json();
    } catch (error) {
      // Se não conseguir fazer parse do JSON (resposta vazia), retornar sucesso
      if (response.status === 201) {
        console.log('Mensagem salva com sucesso (resposta vazia)');
        return { success: true, message: 'Mensagem salva com sucesso' };
      }
      throw new Error(`Erro ao processar resposta: ${error.message}`);
    }

    console.log('Mensagem salva:', data);
    return data;
  }

  // Buscar mensagens de uma thread
  async getChatMessages(threadId) {
    const url = `${this.supabaseUrl}/rest/v1/chat_messages?thread_id=eq.${threadId}&order=criado_em.asc`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao buscar mensagens:', response.status, errorText);
      throw new Error(`Erro ao buscar mensagens: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  }

  // Salvar relatório gerado
  async saveRelatorio(threadId, tipoRelatorio, titulo, conteudo, insights = null, recomendacoes = null) {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_relatorios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      },
      body: JSON.stringify({
        thread_id: threadId, // Usar o ID da thread OpenAI (string)
        tipo_relatorio: tipoRelatorio,
        titulo: titulo,
        conteudo: conteudo,
        insights: insights,
        recomendacoes: recomendacoes,
        status: 'gerado'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao salvar relatório:', response.status, errorText);
      throw new Error(`Erro ao salvar relatório: ${response.status} - ${errorText}`);
    }

    // Supabase pode retornar resposta vazia para POST bem-sucedido
    let data;
    try {
      data = await response.json();
    } catch (error) {
      // Se não conseguir fazer parse do JSON (resposta vazia), retornar sucesso
      if (response.status === 201) {
        console.log('Relatório salvo com sucesso (resposta vazia)');
        return { success: true, message: 'Relatório salvo com sucesso' };
      }
      throw new Error(`Erro ao processar resposta: ${error.message}`);
    }

    console.log('Relatório salvo:', data);
    return data;
  }

  // Buscar relatório de uma thread
  async getRelatorio(threadId, tipoRelatorio = null) {
    console.log(`🔍 getRelatorio chamado com threadId: ${threadId}, tipoRelatorio: ${tipoRelatorio}`);
    
    let url = `${this.supabaseUrl}/rest/v1/chat_relatorios?thread_id=eq.${threadId}&order=criado_em.desc`;
    if (tipoRelatorio) {
      url = `${this.supabaseUrl}/rest/v1/chat_relatorios?thread_id=eq.${threadId}&tipo_relatorio=eq.${tipoRelatorio}&order=criado_em.desc`;
    }
    
    console.log('🌐 URL da consulta:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      }
    });

    console.log('📡 Resposta do Supabase (getRelatorio):', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao buscar relatório:', response.status, errorText);
      throw new Error(`Erro ao buscar relatório: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📋 Dados retornados do Supabase:', data);
    const result = data[0] || null;
    console.log('📄 Relatório encontrado:', result);
    return result;
  }

  // Atualizar relatório (conteúdo e status) - VERSÃO SIMPLIFICADA E ROBUSTA
  async atualizarRelatorio(threadId, tipoRelatorio, novoConteudo = null, novoStatus = null) {
    console.log(`🔍 atualizarRelatorio chamado com threadId: ${threadId}, tipoRelatorio: ${tipoRelatorio}`);
    console.log(`📝 Novo conteúdo: ${novoConteudo ? 'Sim (' + novoConteudo.length + ' chars)' : 'Não'}, Novo status: ${novoStatus || 'Não especificado'}`);
    
    try {
      console.log('🔍 Buscando relatório existente...');
      const existingReport = await this.getRelatorio(threadId, tipoRelatorio);
      console.log('📋 Relatório existente encontrado:', existingReport);
      
      if (existingReport) {
        console.log(`📝 Atualizando relatório ID: ${existingReport.id}`);
        
        // PRIMEIRO: Fazer um teste simples para verificar se conseguimos atualizar
        console.log('🧪 Fazendo teste de atualização simples...');
        const testResult = await this.testUpdateRelatorio(threadId, tipoRelatorio);
        if (!testResult) {
          console.error('❌ TESTE FALHOU: Não conseguimos fazer uma atualização simples');
          throw new Error('Falha no teste de atualização - verificar permissões do Supabase');
        }
        console.log('✅ TESTE PASSOU: Podemos fazer atualizações');
        
        // Preparar dados para atualização
        const updateData = {
          atualizado_em: new Date().toISOString()
        };
        
        if (novoConteudo !== null) {
          updateData.conteudo = novoConteudo;
        }
        
        if (novoStatus !== null) {
          updateData.status = novoStatus;
        }
        
        console.log('📤 Dados para atualização:', updateData);
        console.log('🌐 URL da requisição:', `${this.supabaseUrl}/rest/v1/chat_relatorios?id=eq.${existingReport.id}`);
        
        // ABORDAGEM SIMPLIFICADA: PATCH direto
        const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_relatorios?id=eq.${existingReport.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.supabaseKey}`,
            'apikey': this.supabaseKey
          },
          body: JSON.stringify(updateData)
        });
        
        console.log('📡 Resposta do Supabase:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erro na resposta do Supabase:', errorText);
          throw new Error(`Erro ao atualizar relatório: ${response.status} - ${errorText}`);
        }
        
        // Verificar se a atualização realmente aconteceu
        console.log('🔍 Verificando se a atualização foi persistida...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Aguardar meio segundo
        
        const updatedReport = await this.getRelatorio(threadId, tipoRelatorio);
        console.log('📋 Relatório após atualização:', updatedReport);
        
        // Verificar se os campos foram atualizados
        let updateConfirmed = true;
        let errorMessages = [];
        
        if (novoStatus !== null && updatedReport.status !== novoStatus) {
          const errorMsg = `Status não foi atualizado. Esperado: ${novoStatus}, Atual: ${updatedReport.status}`;
          console.error(`❌ ${errorMsg}`);
          errorMessages.push(errorMsg);
          updateConfirmed = false;
        }
        
        if (novoConteudo !== null && updatedReport.conteudo !== novoConteudo) {
          const errorMsg = 'Conteúdo não foi atualizado';
          console.error(`❌ ${errorMsg}`);
          errorMessages.push(errorMsg);
          updateConfirmed = false;
        }
        
        if (updateConfirmed) {
          console.log('✅ Confirmação: relatório foi atualizado no banco de dados');
          console.log(`📊 Status atual: ${updatedReport.status}`);
          console.log(`📄 Tamanho do conteúdo: ${updatedReport.conteudo ? updatedReport.conteudo.length : 0} caracteres`);
          return { success: true, message: 'Relatório atualizado com sucesso', data: updatedReport };
        } else {
          const errorMsg = 'Falha na persistência: ' + errorMessages.join(', ');
          console.error(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }
      } else {
        console.log('⚠️ Nenhum relatório encontrado para atualizar');
        throw new Error('Relatório não encontrado para atualizar');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar relatório:', error);
      throw error;
    }
  }

  // Atualizar status do relatório para finalizado (método legado)
  async finalizarRelatorio(threadId, tipoRelatorio) {
    console.log(`🔍 finalizarRelatorio chamado com threadId: ${threadId}, tipoRelatorio: ${tipoRelatorio}`);
    return await this.atualizarRelatorio(threadId, tipoRelatorio, null, 'finalizado');
  }

  // Atualizar status de uma thread
  async updateThreadStatus(threadId, status) {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_threads?thread_id=eq.${threadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      },
      body: JSON.stringify({
        status: status
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao atualizar status da thread: ${response.status}`);
    }

    const data = await response.json();
    console.log('Status da thread atualizado:', data);
    return data;
  }

  // Deletar thread e todas as mensagens relacionadas
  async deleteThread(threadId) {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_threads?thread_id=eq.${threadId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao deletar thread: ${response.status}`);
    }

    console.log('Thread deletada com sucesso');
    return true;
  }

  // Criar uma nova thread na OpenAI e salvar no banco
  async createOpenAIThread(usuarioId, etapa, titulo = null) {
    // 1. Criar thread na OpenAI
    const thread = await this.openaiClient.beta.threads.create();
    const openaiThreadId = thread.id;

    // 2. Salvar thread no banco
    const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseKey}`,
        'apikey': this.supabaseKey
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
        etapa: etapa,
        thread_id: openaiThreadId,
        titulo: titulo || `Thread ${etapa} - ${new Date().toLocaleDateString('pt-BR')}`,
        status: 'ativo'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao criar thread: ${response.status}`);
    }

    // Supabase pode retornar resposta vazia para POST bem-sucedido
    let data;
    try {
      data = await response.json();
    } catch (error) {
      // Se não conseguir fazer parse do JSON (resposta vazia), buscar a thread criada
      if (response.status === 201) {
        console.log('Thread criada com sucesso, buscando dados...');
        return await this.getChatThread(openaiThreadId);
      }
      throw new Error(`Erro ao processar resposta: ${error.message}`);
    }

    return data[0] || data;
  }

  // Adicionar mensagem do usuário na thread OpenAI e salvar no banco
  async addMessageToThread(threadId, role, content, metadata = null) {
    // 1. Adicionar mensagem na OpenAI
    await this.openaiClient.beta.threads.messages.create(threadId, { role, content });
    // 2. Salvar mensagem no banco
    return await this.saveChatMessage(threadId, role, content, metadata);
  }

  // Buscar mensagens da thread OpenAI (opcional, para sincronização)
  async getOpenAIMessages(threadId) {
    const response = await this.openaiClient.beta.threads.messages.list(threadId);
    return response.data;
  }

  // Função de teste para verificar se conseguimos fazer uma atualização simples
  async testUpdateRelatorio(threadId, tipoRelatorio) {
    console.log('🧪 TESTE: Verificando se conseguimos fazer uma atualização simples');
    try {
      const existingReport = await this.getRelatorio(threadId, tipoRelatorio);
      if (!existingReport) {
        console.log('❌ TESTE FALHOU: Nenhum relatório encontrado para testar');
        return false;
      }

      console.log(`🧪 TESTE: Tentando atualizar relatório ID: ${existingReport.id}`);
      
      // Teste simples: apenas atualizar o timestamp
      const testUpdateData = {
        atualizado_em: new Date().toISOString()
      };

      const response = await fetch(`${this.supabaseUrl}/rest/v1/chat_relatorios?id=eq.${existingReport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseKey}`,
          'apikey': this.supabaseKey
        },
        body: JSON.stringify(testUpdateData)
      });

      console.log(`🧪 TESTE: Resposta do Supabase: ${response.status} ${response.statusText}`);

      if (response.ok) {
        console.log('✅ TESTE PASSOU: Atualização simples funcionou');
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ TESTE FALHOU: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      console.error('❌ TESTE FALHOU com exceção:', error);
      return false;
    }
  }
}

module.exports = new ChatAPI(); 