const chatAPI = require('./chat-api');
const fetch = require('node-fetch');

class GPTResponseProcessor {
  constructor() {
    this.updatePatterns = {
      updateReport: /\[UPDATE_REPORT:(true|false)\]/i,
      newContent: /\[NEW_CONTENT:(.*?)\]/s,
      endUpdate: /\[END_UPDATE\]/i
    };
  }

  // Processar resposta do GPT e detectar códigos de atualização
  processResponse(gptResponse, threadId, etapa) {
    const result = {
      userMessage: gptResponse,
      shouldUpdateReport: false,
      newReportContent: null,
      processed: false
    };
    try {
      const hasUpdateCode = this.updatePatterns.updateReport.test(gptResponse);
      const hasNewContent = this.updatePatterns.newContent.test(gptResponse);
      const hasEndCode = this.updatePatterns.endUpdate.test(gptResponse);
      if (hasUpdateCode && hasNewContent && hasEndCode) {
        const updateMatch = gptResponse.match(this.updatePatterns.updateReport);
        const contentMatch = gptResponse.match(this.updatePatterns.newContent);
        if (updateMatch && contentMatch) {
          const shouldUpdate = updateMatch[1].toLowerCase() === 'true';
          const newContent = contentMatch[1].trim();
          if (shouldUpdate && newContent) {
            result.shouldUpdateReport = true;
            result.newReportContent = newContent;
            result.processed = true;
          }
        }
      }
      result.userMessage = this.cleanUserMessage(gptResponse);
      return result;
    } catch (error) {
      return result;
    }
  }

  // Limpar mensagem removendo códigos de atualização
  cleanUserMessage(message) {
    return message
      .replace(this.updatePatterns.updateReport, '')
      .replace(this.updatePatterns.newContent, '')
      .replace(this.updatePatterns.endUpdate, '')
      .trim();
  }

  // Atualizar relatório no banco de dados
  async updateReport(threadId, etapa, newContent) {
    try {
      const existingReport = await chatAPI.getRelatorio(threadId, etapa);
      if (existingReport) {
        const response = await fetch(`${chatAPI.supabaseUrl}/rest/v1/chat_relatorios?id=eq.${existingReport.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${chatAPI.supabaseKey}`,
            'apikey': chatAPI.supabaseKey
          },
          body: JSON.stringify({
            conteudo: newContent,
            atualizado_em: new Date().toISOString()
          })
        });
        if (!response.ok) {
          throw new Error(`Erro ao atualizar relatório: ${response.status}`);
        }
        return true;
      } else {
        await chatAPI.saveRelatorio(threadId, etapa, `Relatório ${etapa}`, newContent);
        return true;
      }
    } catch (error) {
      throw error;
    }
  }

  // Processar resposta completa (GPT + atualização de relatório)
  async processCompleteResponse(gptResponse, threadId, etapa) {
    const processed = this.processResponse(gptResponse, threadId, etapa);
    if (processed.shouldUpdateReport && processed.newReportContent) {
      try {
        await this.updateReport(threadId, etapa, processed.newReportContent);
      } catch (error) {
        // Continua mesmo se falhar
      }
    }
    return processed.userMessage;
  }
}

module.exports = new GPTResponseProcessor(); 