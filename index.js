require('dotenv').config({ path: './config.env' });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const { createUser, findUserByOabUf, findUserByEmail, authenticateUserByEmail } = require('./users-supabase');
const supabaseAPI = require('./supabase-api');
const chatAPI = require('./chat-api');
const assistantManager = require('./assistant-manager');
const gptResponseProcessor = require('./gpt-response-processor');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'future-law-planner-secret-key-2024-new-project';

// Middleware
app.use(cors({
  origin: '*', // Permite todas as origens
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));
app.use(express.json());

// Configuração do Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Verificar configuração dos assistentes na inicialização
console.log('🚀 Iniciando servidor...');
assistantManager.checkConfiguration();

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: 'Future Law Planner API', 
    version: '1.0.0',
    status: 'online'
  });
});



// Rota de registro
app.post('/register', async (req, res) => {
  try {
    const { nome_completo, email, oab, uf_oab, senha } = req.body;

    // Validações básicas
    if (!nome_completo || !email || !oab || !uf_oab || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Criar usuário
    const newUser = await createUser({
      nome_completo,
      email,
      oab,
      uf_oab,
      senha
    });
    
    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email,
        nome_completo: newUser.nome_completo,
        oab: newUser.oab,
        uf_oab: newUser.uf_oab
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: {
        id: newUser.id,
        nome_completo: newUser.nome_completo,
        email: newUser.email,
        oab: newUser.oab,
        uf_oab: newUser.uf_oab
      }
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de login com email e senha
app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validações básicas
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Autenticar usuário
    const user = await authenticateUserByEmail(email, senha);

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        nome_completo: user.nome_completo,
        oab: user.oab,
        uf_oab: user.uf_oab
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );



    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        nome_completo: user.nome_completo,
        email: user.email,
        oab: user.oab,
        uf_oab: user.uf_oab
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de login com OAB e UF (compatibilidade)
app.post('/login-oab', async (req, res) => {
  try {
    const { oab, uf_oab, senha } = req.body;

    // Validações básicas
    if (!oab || !uf_oab || !senha) {
      return res.status(400).json({ error: 'OAB, UF e senha são obrigatórios' });
    }

    // Buscar usuário por OAB e UF
    const user = await findUserByOabUf(oab, uf_oab);
    
    if (!user) {
      return res.status(401).json({ error: 'OAB ou UF incorretos' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        nome_completo: user.nome_completo,
        oab: user.oab,
        uf_oab: user.uf_oab
      }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );



    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user.id,
        nome_completo: user.nome_completo,
        email: user.email,
        oab: user.oab,
        uf_oab: user.uf_oab
      }
    });

  } catch (error) {
    console.error('Erro no login OAB:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS PARA MVV RESPOSTAS =====

// Salvar respostas da MVV
app.post('/mvv/respostas', authenticateToken, async (req, res) => {
  try {
    const respostas = req.body;
    const userId = req.user.id;

    // Validações básicas
    if (!respostas || typeof respostas !== 'object') {
      return res.status(400).json({ error: 'Dados das respostas são obrigatórios' });
    }

    // Validar campos permitidos
    const camposPermitidos = [
      'atividades_motivadoras', 'beneficiarios', 'satisfacao_profissional',
      'carreira_5_anos', 'reconhecimento_profissional', 'impacto_legado',
      'atitudes_admiraveis', 'comportamentos_inaceitaveis', 'valores_decisoes'
    ];

    const respostasValidas = {};
    Object.keys(respostas).forEach(campo => {
      if (camposPermitidos.includes(campo) && respostas[campo]) {
        respostasValidas[campo] = respostas[campo];
      }
    });

    if (Object.keys(respostasValidas).length === 0) {
      return res.status(400).json({ error: 'Pelo menos uma resposta válida é obrigatória' });
    }

    // Salvar respostas
    await supabaseAPI.saveMvvRespostas(userId, respostasValidas);

    res.status(201).json({
      message: 'Respostas salvas com sucesso',
      data: respostasValidas
    });

  } catch (error) {
    console.error('Erro ao salvar respostas MVV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar respostas da MVV do usuário
app.get('/mvv/respostas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar respostas
    const respostas = await supabaseAPI.getMvvRespostas(userId);

    res.json({
      message: 'Respostas encontradas',
      data: respostas
    });

  } catch (error) {
    console.error('Erro ao buscar respostas MVV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar resposta específica da MVV
app.put('/mvv/respostas/:campo', authenticateToken, async (req, res) => {
  try {
    const { campo } = req.params;
    const { resposta } = req.body;
    const userId = req.user.id;

    // Validações básicas
    if (!resposta) {
      return res.status(400).json({ error: 'Resposta é obrigatória' });
    }

    // Validar campo
    const camposPermitidos = [
      'atividades_motivadoras', 'beneficiarios', 'satisfacao_profissional',
      'carreira_5_anos', 'reconhecimento_profissional', 'impacto_legado',
      'atitudes_admiraveis', 'comportamentos_inaceitaveis', 'valores_decisoes'
    ];

    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({ error: 'Campo inválido' });
    }

    // Atualizar resposta
    await supabaseAPI.updateMvvResposta(userId, campo, resposta);

  res.json({ 
      message: 'Resposta atualizada com sucesso',
      data: { campo, resposta }
    });

  } catch (error) {
    console.error('Erro ao atualizar resposta MVV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar respostas da MVV
app.delete('/mvv/respostas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Deletar respostas
    await supabaseAPI.deleteMvvRespostas(userId);

    res.json({
      message: 'Respostas deletadas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar respostas MVV:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS PARA SWOT RESPOSTAS =====

// Salvar respostas da SWOT
app.post('/swot/respostas', authenticateToken, async (req, res) => {
  try {
    const respostas = req.body;
    const userId = req.user.id;

    // Validações básicas
    if (!respostas || typeof respostas !== 'object') {
      return res.status(400).json({ error: 'Dados das respostas são obrigatórios' });
    }

    // Validar campos permitidos
    const camposPermitidos = [
      // FORÇAS
      'habilidades_talentos', 'destaque_profissional', 'recursos_pessoais',
      'parcerias_conexoes', 'elogios_reconhecimento', 'vantagens_beneficios', 'feedbacks_positivos',
      // FRAQUEZAS
      'areas_melhoria', 'limitacoes_pessoais', 'lacunas_conhecimento',
      'habitos_prejudiciais', 'feedbacks_negativos', 'recursos_faltantes', 'pontos_fracos',
      // OPORTUNIDADES
      'tendencias_mercado', 'areas_crescimento', 'parcerias_potenciais',
      'tecnologias_emergentes', 'mudancas_setor', 'nichos_mercado', 'recursos_disponiveis',
      // AMEAÇAS
      'obstaculos_externos', 'mudancas_prejudiciais', 'concorrentes_ameacas',
      'riscos_economicos', 'mudancas_regulatorias', 'ameacas_tecnologicas', 'fatores_sociais'
    ];

    const respostasValidas = {};
    Object.keys(respostas).forEach(campo => {
      if (camposPermitidos.includes(campo) && respostas[campo]) {
        respostasValidas[campo] = respostas[campo];
      }
    });

    if (Object.keys(respostasValidas).length === 0) {
      return res.status(400).json({ error: 'Pelo menos uma resposta válida é obrigatória' });
    }

    // Salvar respostas
    await supabaseAPI.saveSwotRespostas(userId, respostasValidas);

    res.status(201).json({
      message: 'Respostas salvas com sucesso',
      data: respostasValidas
    });

  } catch (error) {
    console.error('Erro ao salvar respostas SWOT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar respostas da SWOT do usuário
app.get('/swot/respostas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar respostas
    const respostas = await supabaseAPI.getSwotRespostas(userId);

    res.json({
      message: 'Respostas encontradas',
      data: respostas
    });

  } catch (error) {
    console.error('Erro ao buscar respostas SWOT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar resposta específica da SWOT
app.put('/swot/respostas/:campo', authenticateToken, async (req, res) => {
  try {
    const { campo } = req.params;
    const { resposta } = req.body;
    const userId = req.user.id;

    // Validações básicas
    if (!resposta) {
      return res.status(400).json({ error: 'Resposta é obrigatória' });
    }

    // Validar campo
    const camposPermitidos = [
      // FORÇAS
      'habilidades_talentos', 'destaque_profissional', 'recursos_pessoais',
      'parcerias_conexoes', 'elogios_reconhecimento', 'vantagens_beneficios', 'feedbacks_positivos',
      // FRAQUEZAS
      'areas_melhoria', 'limitacoes_pessoais', 'lacunas_conhecimento',
      'habitos_prejudiciais', 'feedbacks_negativos', 'recursos_faltantes', 'pontos_fracos',
      // OPORTUNIDADES
      'tendencias_mercado', 'areas_crescimento', 'parcerias_potenciais',
      'tecnologias_emergentes', 'mudancas_setor', 'nichos_mercado', 'recursos_disponiveis',
      // AMEAÇAS
      'obstaculos_externos', 'mudancas_prejudiciais', 'concorrentes_ameacas',
      'riscos_economicos', 'mudancas_regulatorias', 'ameacas_tecnologicas', 'fatores_sociais'
    ];

    if (!camposPermitidos.includes(campo)) {
      return res.status(400).json({ error: 'Campo inválido' });
    }

    // Atualizar resposta
    await supabaseAPI.updateSwotResposta(userId, campo, resposta);

    res.json({ 
      message: 'Resposta atualizada com sucesso',
      data: { campo, resposta }
    });

  } catch (error) {
    console.error('Erro ao atualizar resposta SWOT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar respostas da SWOT
app.delete('/swot/respostas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Deletar respostas
    await supabaseAPI.deleteSwotRespostas(userId);

    res.json({
      message: 'Respostas deletadas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar respostas SWOT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota para gerar relatório MVV (preparação para GPT)
app.get('/mvv/relatorio', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar respostas
    const respostas = await supabaseAPI.getMvvRespostas(userId);

    if (!respostas) {
      return res.status(404).json({ error: 'Nenhuma resposta encontrada para gerar relatório' });
    }

    // Organizar respostas por seção
    const relatorio = {
      missao: {
        atividades_motivadoras: respostas.atividades_motivadoras,
        beneficiarios: respostas.beneficiarios,
        satisfacao_profissional: respostas.satisfacao_profissional
      },
      visao: {
        carreira_5_anos: respostas.carreira_5_anos,
        reconhecimento_profissional: respostas.reconhecimento_profissional,
        impacto_legado: respostas.impacto_legado
      },
      valores: {
        atitudes_admiraveis: respostas.atitudes_admiraveis,
        comportamentos_inaceitaveis: respostas.comportamentos_inaceitaveis,
        valores_decisoes: respostas.valores_decisoes
      }
    };

    res.json({
      message: 'Relatório MVV gerado com sucesso',
      data: relatorio
    });

  } catch (error) {
    console.error('Erro ao gerar relatório MVV:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS DE CHAT E RELATÓRIO =====

// Criar uma nova thread de chat
app.post('/chat/thread', authenticateToken, async (req, res) => {
  try {
    const { etapa, titulo } = req.body;
    const usuarioId = req.user.id;
    const result = await chatAPI.createChatThread(usuarioId, etapa, titulo);
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao criar thread:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar threads do usuário
app.get('/chat/threads', authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { etapa } = req.query;
    const result = await chatAPI.getUserThreads(usuarioId, etapa);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar threads:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar uma thread específica
app.get('/chat/thread/:threadId', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const result = await chatAPI.getChatThread(threadId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar thread:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota removida - duplicada com a rota de chat contínuo abaixo

// Buscar mensagens de uma thread
app.get('/chat/messages/:threadId', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const result = await chatAPI.getChatMessages(threadId);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Salvar relatório gerado
app.post('/chat/relatorio', authenticateToken, async (req, res) => {
  try {
    const { threadId, tipoRelatorio, titulo, conteudo, insights, recomendacoes } = req.body;
    const result = await chatAPI.saveRelatorio(threadId, tipoRelatorio, titulo, conteudo, insights, recomendacoes);
    res.status(201).json(result);
  } catch (error) {
    console.error('Erro ao salvar relatório:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar relatório de uma thread
app.get('/chat/relatorio/:threadId', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { tipoRelatorio } = req.query;
    const result = await chatAPI.getRelatorio(threadId, tipoRelatorio);
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
    res.status(500).json({ error: error.message });
  }
});

// Finalizar relatório (quando aprovado pelo usuário)
app.patch('/chat/relatorio/:threadId/finalizar', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { tipoRelatorio } = req.body;
    
    if (!tipoRelatorio) {
      return res.status(400).json({ error: 'tipoRelatorio é obrigatório' });
    }
    
    const result = await chatAPI.finalizarRelatorio(threadId, tipoRelatorio);
    res.json(result);
  } catch (error) {
    console.error('Erro ao finalizar relatório:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar relatório (conteúdo e/ou status)
app.patch('/chat/relatorio/:threadId/atualizar', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { tipoRelatorio, conteudo, status } = req.body;
    
    if (!tipoRelatorio) {
      return res.status(400).json({ error: 'tipoRelatorio é obrigatório' });
    }
    
    if (conteudo === undefined && status === undefined) {
      return res.status(400).json({ error: 'Pelo menos um campo (conteudo ou status) deve ser fornecido' });
    }
    
    console.log(`🔄 Atualizando relatório: threadId=${threadId}, tipoRelatorio=${tipoRelatorio}`);
    console.log(`📝 Dados: conteudo=${conteudo ? 'fornecido' : 'não fornecido'}, status=${status || 'não fornecido'}`);
    
    const result = await chatAPI.atualizarRelatorio(threadId, tipoRelatorio, conteudo, status);
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar relatório:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de teste para verificar se conseguimos fazer atualizações
app.get('/chat/teste-atualizacao/:threadId/:tipoRelatorio', authenticateToken, async (req, res) => {
  try {
    const { threadId, tipoRelatorio } = req.params;
    
    console.log(`🧪 TESTE: Verificando atualização para threadId=${threadId}, tipoRelatorio=${tipoRelatorio}`);
    
    const testResult = await chatAPI.testUpdateRelatorio(threadId, tipoRelatorio);
    
    if (testResult) {
      res.json({ success: true, message: 'Teste de atualização passou' });
    } else {
      res.status(500).json({ success: false, message: 'Teste de atualização falhou' });
    }
  } catch (error) {
    console.error('Erro no teste de atualização:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de teste detalhada para debug do problema
app.get('/chat/debug-relatorio/:threadId/:tipoRelatorio', authenticateToken, async (req, res) => {
  try {
    const { threadId, tipoRelatorio } = req.params;
    
    console.log(`🔍 DEBUG: Analisando relatório threadId=${threadId}, tipoRelatorio=${tipoRelatorio}`);
    
    // 1. Verificar se o relatório existe
    const existingReport = await chatAPI.getRelatorio(threadId, tipoRelatorio);
    console.log('📋 Relatório encontrado:', existingReport);
    
    if (!existingReport) {
      return res.status(404).json({ 
        success: false, 
        message: 'Relatório não encontrado',
        debug: { threadId, tipoRelatorio }
      });
    }
    
    // 2. Tentar atualização simples
    const testResult = await chatAPI.testUpdateRelatorio(threadId, tipoRelatorio);
    console.log('🧪 Resultado do teste:', testResult);
    
    // 3. Tentar atualização completa
    let updateResult = null;
    try {
      updateResult = await chatAPI.atualizarRelatorio(
        threadId, 
        tipoRelatorio, 
        'Teste de conteúdo - ' + new Date().toISOString(), 
        'teste'
      );
      console.log('✅ Atualização completa funcionou:', updateResult);
    } catch (updateError) {
      console.error('❌ Atualização completa falhou:', updateError);
      updateResult = { error: updateError.message };
    }
    
    res.json({
      success: true,
      debug: {
        threadId,
        tipoRelatorio,
        existingReport: {
          id: existingReport.id,
          status: existingReport.status,
          conteudo_length: existingReport.conteudo ? existingReport.conteudo.length : 0,
          criado_em: existingReport.criado_em,
          atualizado_em: existingReport.atualizado_em
        },
        testResult,
        updateResult
      }
    });
    
  } catch (error) {
    console.error('Erro no debug:', error);
    res.status(500).json({ error: error.message });
  }
});

// Consolidar relatório via assistente
app.post('/chat/consolidar-relatorio', authenticateToken, async (req, res) => {
  try {
    const { threadId, prompt, etapa } = req.body;
    
    if (!threadId) {
      return res.status(400).json({ error: 'threadId é obrigatório' });
    }
    
    console.log(`🔄 Consolidando relatório para threadId: ${threadId}, etapa: ${etapa}`);
    
    // 1. Buscar todas as mensagens da thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });
    
    // 2. Buscar mensagens da thread
    const messages = await openaiClient.beta.threads.messages.list(threadId);
    console.log(`📋 Encontradas ${messages.data.length} mensagens na thread`);
    
    // 3. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa || 'disc');
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ 
        error: `Assistente não configurado para etapa '${etapa}'. Configure OPENAI_ASSISTANT_${etapa?.toUpperCase()} no .env` 
      });
    }
    
    // 4. Criar prompt de consolidação
    const consolidationPrompt = prompt || `
Consolide toda a conversa desta thread em um relatório final limpo e profissional.

Instruções:
- Leia toda a conversa entre usuário e assistente
- Identifique o relatório principal e todas as alterações solicitadas
- Integre todas as alterações de forma natural no relatório
- Remova repetições, introduções e conclusões desnecessárias
- Mantenha apenas o conteúdo essencial e profissional
- Se houver frases motivacionais solicitadas, organize-as em uma seção dedicada
- Retorne apenas o relatório consolidado final

Retorne o relatório consolidado sem introduções ou explicações adicionais.
`;
    
    // 5. Adicionar mensagem de consolidação na thread
    await openaiClient.beta.threads.messages.create(threadId, {
      role: 'user',
      content: consolidationPrompt
    });
    
    // 6. Criar run para processar a consolidação
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions + '\n\nConsolide o relatório conforme solicitado pelo usuário.'
    });
    
    // 7. Aguardar conclusão do run
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }
    
    if (runStatus === 'completed') {
      // 8. Buscar a resposta consolidada
      const updatedMessages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = updatedMessages.data.find(msg => msg.role === 'assistant' && msg.run_id === run.id);
      
      if (assistantMessage) {
        const consolidatedReport = assistantMessage.content[0].text.value;
        
        console.log('✅ Relatório consolidado com sucesso');
        
        res.json({
          success: true,
          relatorioConsolidado: consolidatedReport,
          message: 'Relatório consolidado com sucesso'
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
    
  } catch (error) {
    console.error('Erro ao consolidar relatório:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA DE ORQUESTRAÇÃO MVV + CHAT + GPT (COM THREADS OPENAI) =====
app.post('/mvv/assistente', authenticateToken, async (req, res) => {
  try {
    const respostas = req.body;
    const userId = req.user.id;
    const userName = req.user.nome_completo || 'Usuário';
    const etapa = 'missao'; // Esta rota é específica para MVV

    // 1. Salvar respostas MVV
    await supabaseAPI.saveMvvRespostas(userId, respostas);

    // 2. Criar thread OpenAI (ou buscar existente para etapa 'missao')
    let thread = null;
    const userThreads = await chatAPI.getUserThreads(userId, etapa);
    if (userThreads && userThreads.length > 0) {
      thread = userThreads[0];
    } else {
      thread = await chatAPI.createOpenAIThread(userId, etapa, 'Missão, Visão e Valores');
    }
    const threadId = thread.thread_id; // OpenAI thread ID

    // 3. Adicionar mensagem do usuário na thread OpenAI e salvar no banco
    const userMessageContent = `Respostas MVV do usuário ${userName}:\n${JSON.stringify(respostas, null, 2)}`;
    await chatAPI.addMessageToThread(threadId, 'user', userMessageContent, { 
      etapa: etapa, 
      tipo: 'mvv_respostas' 
    });

    // 4. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa);
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: `Assistente não configurado para etapa '${etapa}'. Configure OPENAI_ASSISTANT_MISSAO no .env` });
    }

    // 5. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    // Criar run para processar a thread
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });

    // Aguardar conclusão do run (polling simples)
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }

    if (runStatus === 'completed') {
      // 6. Buscar mensagens da thread OpenAI
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        
        // 7. Salvar resposta do assistente no banco
        await chatAPI.saveChatMessage(threadId, 'assistant', gptContent, { 
          etapa: etapa, 
          tipo: 'gpt_resposta' 
        });

        // 8. Salvar relatório
        await chatAPI.saveRelatorio(threadId, 'mvv', 'Relatório MVV', gptContent);

        // 9. Buscar histórico e relatório do banco
        const historico = await chatAPI.getChatMessages(threadId);
        const relatorio = await chatAPI.getRelatorio(threadId, 'mvv');

        // 10. Retornar tudo para o frontend
        res.status(201).json({
          message: 'Processamento completo com Thread OpenAI',
          thread_id: threadId,
          historico,
          relatorio,
          etapa: etapa,
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    console.error('Erro na orquestração MVV+GPT:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA DE ORQUESTRAÇÃO SWOT + CHAT + GPT (COM THREADS OPENAI) =====
app.post('/swot/assistente', authenticateToken, async (req, res) => {
  try {
    const respostas = req.body;
    const userId = req.user.id;
    const userName = req.user.nome_completo || 'Usuário';
    const etapa = 'swot'; // Esta rota é específica para SWOT

    // 1. Salvar respostas SWOT
    await supabaseAPI.saveSwotRespostas(userId, respostas);

    // 2. Criar thread OpenAI (ou buscar existente para etapa 'swot')
    let thread = null;
    const userThreads = await chatAPI.getUserThreads(userId, etapa);
    if (userThreads && userThreads.length > 0) {
      thread = userThreads[0];
    } else {
      thread = await chatAPI.createOpenAIThread(userId, etapa, 'Análise SWOT');
    }
    const threadId = thread.thread_id; // OpenAI thread ID

    // 3. Adicionar mensagem do usuário na thread OpenAI e salvar no banco
    const userMessageContent = `Respostas SWOT do usuário ${userName}:\n${JSON.stringify(respostas, null, 2)}`;
    await chatAPI.addMessageToThread(threadId, 'user', userMessageContent, { 
      etapa: etapa, 
      tipo: 'swot_respostas' 
    });

    // 4. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa);
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: `Assistente não configurado para etapa '${etapa}'. Configure OPENAI_ASSISTANT_SWOT no .env` });
    }

    // 5. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    // Criar run para processar a thread
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });

    // Aguardar conclusão do run (polling simples)
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }

    if (runStatus === 'completed') {
      // 6. Buscar mensagens da thread OpenAI
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        
        // 7. Salvar resposta do assistente no banco
        await chatAPI.saveChatMessage(threadId, 'assistant', gptContent, { 
          etapa: etapa, 
          tipo: 'gpt_resposta' 
        });

        // 8. Salvar relatório
        await chatAPI.saveRelatorio(threadId, 'swot', 'Relatório SWOT', gptContent);

        // 9. Buscar histórico e relatório do banco
        const historico = await chatAPI.getChatMessages(threadId);
        const relatorio = await chatAPI.getRelatorio(threadId, 'swot');

        // 10. Retornar tudo para o frontend
        res.status(201).json({
          message: 'Processamento completo com Thread OpenAI',
          thread_id: threadId,
          historico,
          relatorio,
          etapa: etapa,
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    console.error('Erro na orquestração SWOT+GPT:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA DE ORQUESTRAÇÃO OKR + CHAT + GPT (COM THREADS OPENAI) =====
app.post('/okr/assistente', authenticateToken, async (req, res) => {
  try {
    const respostas = req.body;
    const userId = req.user.id;
    const userName = req.user.nome_completo || 'Usuário';
    const etapa = 'okr'; // Esta rota é específica para OKR

    // 1. Salvar respostas OKR
    await supabaseAPI.saveOkrRespostas(userId, respostas);

    // 2. Criar thread OpenAI (ou buscar existente para etapa 'okr')
    let thread = null;
    const userThreads = await chatAPI.getUserThreads(userId, etapa);
    if (userThreads && userThreads.length > 0) {
      thread = userThreads[0];
    } else {
      thread = await chatAPI.createOpenAIThread(userId, etapa, 'Objetivos SMART e OKR');
    }
    const threadId = thread.thread_id; // OpenAI thread ID

    // 3. Adicionar mensagem do usuário na thread OpenAI e salvar no banco
    const userMessageContent = `Respostas OKR do usuário ${userName}:\n${JSON.stringify(respostas, null, 2)}`;
    await chatAPI.addMessageToThread(threadId, 'user', userMessageContent, { 
      etapa: etapa, 
      tipo: 'okr_respostas' 
    });

    // 4. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa);
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: `Assistente não configurado para etapa '${etapa}'. Configure OPENAI_ASSISTANT_OKR no .env` });
    }

    // 5. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    // Criar run para processar a thread
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });

    // Aguardar conclusão do run (polling simples)
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }

    if (runStatus === 'completed') {
      // 6. Buscar mensagens da thread OpenAI
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        
        // 7. Salvar resposta do assistente no banco
        await chatAPI.saveChatMessage(threadId, 'assistant', gptContent, { 
          etapa: etapa, 
          tipo: 'gpt_resposta' 
        });

        // 8. Salvar relatório
        await chatAPI.saveRelatorio(threadId, 'okr', 'Relatório OKR', gptContent);

        // 9. Buscar histórico e relatório do banco
        const historico = await chatAPI.getChatMessages(threadId);
        const relatorio = await chatAPI.getRelatorio(threadId, 'okr');

        // 10. Retornar tudo para o frontend
        res.status(201).json({
          message: 'Processamento completo com Thread OpenAI',
          thread_id: threadId,
          historico,
          relatorio,
          etapa: etapa,
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    console.error('Erro na orquestração OKR+GPT:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA DE ORQUESTRAÇÃO RODA DA VIDA + CHAT + GPT (COM THREADS OPENAI) =====
app.post('/roda-da-vida/assistente', authenticateToken, async (req, res) => {
  try {
    const respostas = req.body;
    const userId = req.user.id;
    const userName = req.user.nome_completo || 'Usuário';
    const etapa = 'roda-da-vida'; // Esta rota é específica para Roda da Vida

    // 1. Salvar respostas Roda da Vida
    await supabaseAPI.saveRodaVidaRespostas(userId, respostas);

    // 2. Criar thread OpenAI (ou buscar existente para etapa 'roda-da-vida')
    let thread = null;
    const userThreads = await chatAPI.getUserThreads(userId, etapa);
    if (userThreads && userThreads.length > 0) {
      thread = userThreads[0];
    } else {
      thread = await chatAPI.createOpenAIThread(userId, etapa, 'Roda da Vida');
    }
    const threadId = thread.thread_id; // OpenAI thread ID

    // 3. Adicionar mensagem do usuário na thread OpenAI e salvar no banco
    const userMessageContent = `Respostas Roda da Vida do usuário ${userName}:\n${JSON.stringify(respostas, null, 2)}`;
    await chatAPI.addMessageToThread(threadId, 'user', userMessageContent, { 
      etapa: etapa, 
      tipo: 'roda_vida_respostas' 
    });

    // 4. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa);
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: `Assistente não configurado para etapa '${etapa}'. Configure OPENAI_ASSISTANT_RODA_VIDA no .env` });
    }

    // 5. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    // Criar run para processar a thread
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });

    // Aguardar conclusão do run (polling simples)
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }

    if (runStatus === 'completed') {
      // 6. Buscar mensagens da thread OpenAI
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        
        // 7. Salvar resposta do assistente no banco
        await chatAPI.saveChatMessage(threadId, 'assistant', gptContent, { 
          etapa: etapa, 
          tipo: 'gpt_resposta' 
        });

        // 8. Salvar relatório
        await chatAPI.saveRelatorio(threadId, 'roda-da-vida', 'Relatório Roda da Vida', gptContent);

        // 9. Buscar histórico e relatório do banco
        const historico = await chatAPI.getChatMessages(threadId);
        const relatorio = await chatAPI.getRelatorio(threadId, 'roda-da-vida');

        // 10. Retornar tudo para o frontend
        res.status(201).json({
          message: 'Processamento completo com Thread OpenAI',
          thread_id: threadId,
          historico,
          relatorio,
          etapa: etapa,
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    console.error('Erro na orquestração Roda da Vida+GPT:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA DE ORQUESTRAÇÃO DISC + CHAT + GPT (COM THREADS OPENAI) =====
app.post('/disc/assistente', authenticateToken, async (req, res) => {
  try {
    const respostas = req.body;
    const userId = req.user.id;
    const userName = req.user.nome_completo || 'Usuário';
    const etapa = 'disc'; // Esta rota é específica para DISC

    // 1. Salvar respostas DISC
    await supabaseAPI.saveDiscRespostas(userId, respostas);

    // 2. Criar thread OpenAI (ou buscar existente para etapa 'disc')
    let thread = null;
    const userThreads = await chatAPI.getUserThreads(userId, etapa);
    if (userThreads && userThreads.length > 0) {
      thread = userThreads[0];
    } else {
      thread = await chatAPI.createOpenAIThread(userId, etapa, 'DISC');
    }
    const threadId = thread.thread_id; // OpenAI thread ID

    // 3. Adicionar mensagem do usuário na thread OpenAI e salvar no banco
    const userMessageContent = `Respostas DISC do usuário ${userName}:\n${JSON.stringify(respostas, null, 2)}`;
    await chatAPI.addMessageToThread(threadId, 'user', userMessageContent, { 
      etapa: etapa, 
      tipo: 'disc_respostas' 
    });

    // 4. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa);
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: `Assistente não configurado para etapa '${etapa}'. Configure OPENAI_ASSISTANT_DISC no .env` });
    }

    // 5. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    // Criar run para processar a thread
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });

    // Aguardar conclusão do run (polling simples)
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }

    if (runStatus === 'completed') {
      // 6. Buscar mensagens da thread OpenAI
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        
        // 7. Salvar resposta do assistente no banco
        await chatAPI.saveChatMessage(threadId, 'assistant', gptContent, { 
          etapa: etapa, 
          tipo: 'gpt_resposta' 
        });

        // 8. Salvar relatório
        await chatAPI.saveRelatorio(threadId, 'disc', 'Relatório DISC', gptContent);

        // 9. Buscar histórico e relatório do banco
        const historico = await chatAPI.getChatMessages(threadId);
        const relatorio = await chatAPI.getRelatorio(threadId, 'disc');

        // 10. Retornar tudo para o frontend
        res.status(201).json({
          message: 'Processamento completo com Thread OpenAI',
          thread_id: threadId,
          historico,
          relatorio,
          etapa: etapa,
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    console.error('Erro na orquestração DISC+GPT:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA DE ORQUESTRAÇÃO TEMPERAMENTOS + CHAT + GPT (COM THREADS OPENAI) =====
app.post('/temperamentos/assistente', authenticateToken, async (req, res) => {
  try {
    const respostas = req.body;
    const userId = req.user.id;
    const userName = req.user.nome_completo || 'Usuário';
    const etapa = 'temperamentos'; // Esta rota é específica para Temperamentos

    // 1. Salvar respostas Temperamentos
    await supabaseAPI.saveTemperamentosRespostas(userId, respostas);

    // 2. Criar thread OpenAI (ou buscar existente para etapa 'temperamentos')
    let thread = null;
    const userThreads = await chatAPI.getUserThreads(userId, etapa);
    if (userThreads && userThreads.length > 0) {
      thread = userThreads[0];
    } else {
      thread = await chatAPI.createOpenAIThread(userId, etapa, 'Temperamentos');
    }
    const threadId = thread.thread_id; // OpenAI thread ID

    // 3. Adicionar mensagem do usuário na thread OpenAI e salvar no banco
    const userMessageContent = `Respostas Temperamentos do usuário ${userName}:\n${JSON.stringify(respostas, null, 2)}`;
    await chatAPI.addMessageToThread(threadId, 'user', userMessageContent, { 
      etapa: etapa, 
      tipo: 'temperamentos_respostas' 
    });

    // 4. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa);
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: `Assistente não configurado para etapa '${etapa}'. Configure OPENAI_ASSISTANT_TEMPERAMENTOS no .env` });
    }

    // 5. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    // Criar run para processar a thread
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });

    // Aguardar conclusão do run (polling simples)
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar 1 segundo
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }

    if (runStatus === 'completed') {
      // 6. Buscar mensagens da thread OpenAI
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        
        // 7. Salvar resposta do assistente no banco
        await chatAPI.saveChatMessage(threadId, 'assistant', gptContent, { 
          etapa: etapa, 
          tipo: 'gpt_resposta' 
        });

        // 8. Salvar relatório
        await chatAPI.saveRelatorio(threadId, 'temperamentos', 'Relatório Temperamentos', gptContent);

        // 9. Buscar histórico e relatório do banco
        const historico = await chatAPI.getChatMessages(threadId);
        const relatorio = await chatAPI.getRelatorio(threadId, 'temperamentos');

        // 10. Retornar tudo para o frontend
        res.status(201).json({
          message: 'Processamento completo com Thread OpenAI',
          thread_id: threadId,
          historico,
          relatorio,
          etapa: etapa,
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    console.error('Erro na orquestração Temperamentos+GPT:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA PARA CHAT CONTÍNUO (USANDO THREADS OPENAI) =====
app.post('/chat/message', authenticateToken, async (req, res) => {
  try {
    const { thread_id, message, etapa = 'missao' } = req.body;
    const userId = req.user.id;

    if (!thread_id || !message) {
      return res.status(400).json({ error: 'thread_id e message são obrigatórios' });
    }

    // 1. Adicionar mensagem do usuário na thread OpenAI e salvar no banco
    await chatAPI.addMessageToThread(thread_id, 'user', message, { etapa, tipo: 'chat_message' });

    // 2. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa);
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: `Assistente não configurado para etapa '${etapa}'.` });
    }

    // 3. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });
    const run = await openaiClient.beta.threads.runs.create(thread_id, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const runCheck = await openaiClient.beta.threads.runs.retrieve(thread_id, run.id);
      runStatus = runCheck.status;
    }
    if (runStatus === 'completed') {
      const messages = await openaiClient.beta.threads.messages.list(thread_id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        // 5. Processar resposta do GPT para detectar códigos de atualização
        const processedResponse = await gptResponseProcessor.processCompleteResponse(
          gptContent, 
          thread_id, 
          etapa
        );
        // 6. Salvar resposta processada do assistente no banco
        await chatAPI.saveChatMessage(thread_id, 'assistant', processedResponse, { etapa, tipo: 'chat_response' });
        // 7. Buscar histórico atualizado do banco
        const historico = await chatAPI.getChatMessages(thread_id);
        // 8. Retornar resposta processada e histórico
        res.status(201).json({
          message: 'Mensagem processada com sucesso',
          response: processedResponse,
          historico,
          etapa,
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA GENÉRICA PARA PROCESSAR DADOS DE QUALQUER ETAPA =====
app.post('/workshop/process', authenticateToken, async (req, res) => {
  try {
    const { etapa, dados, titulo } = req.body;
    const userId = req.user.id;
    const userName = req.user.nome_completo || 'Usuário';

    if (!etapa || !dados) {
      return res.status(400).json({ error: 'etapa e dados são obrigatórios' });
    }

    // 1. Salvar dados da etapa (se necessário)
    // Aqui você pode implementar lógica específica para cada etapa
    console.log(`💾 Salvando dados da etapa: ${etapa}`);

    // 2. Criar thread OpenAI (ou buscar existente para a etapa)
    let thread = null;
    const userThreads = await chatAPI.getUserThreads(userId, etapa);
    if (userThreads && userThreads.length > 0) {
      thread = userThreads[0];
    } else {
      thread = await chatAPI.createOpenAIThread(userId, etapa, titulo || `Etapa ${etapa}`);
    }
    const threadId = thread.thread_id;

    // 3. Adicionar mensagem do usuário na thread OpenAI e salvar no banco
    const userMessageContent = `Dados da etapa ${etapa} do usuário ${userName}:\n${JSON.stringify(dados, null, 2)}`;
    await chatAPI.addMessageToThread(threadId, 'user', userMessageContent, { 
      etapa: etapa, 
      tipo: 'etapa_dados' 
    });

    // 4. Obter configuração do assistente para a etapa
    const assistantConfig = assistantManager.getAssistantConfig(etapa);
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: `Assistente não configurado para etapa '${etapa}'. Configure o assistente correspondente no .env` });
    }

    // 5. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    // Criar run para processar a thread
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });

    // Aguardar conclusão do run
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }

    if (runStatus === 'completed') {
      // 6. Buscar mensagens da thread OpenAI
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        
        // 7. Salvar resposta do assistente no banco
        await chatAPI.saveChatMessage(threadId, 'assistant', gptContent, { 
          etapa: etapa, 
          tipo: 'gpt_resposta' 
        });

        // 8. Salvar relatório
        await chatAPI.saveRelatorio(threadId, etapa, `Relatório ${etapa}`, gptContent);

        // 9. Buscar histórico e relatório do banco
        const historico = await chatAPI.getChatMessages(threadId);
        const relatorio = await chatAPI.getRelatorio(threadId, etapa);

        // 10. Retornar tudo para o frontend
        res.status(201).json({
          message: 'Processamento completo com Thread OpenAI',
          thread_id: threadId,
          historico,
          relatorio,
          etapa: etapa,
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    console.error('Erro no processamento da etapa:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA PARA GERAR RELATÓRIO CONSOLIDADO =====
app.post('/relatorio/consolidado', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userName = req.user.nome_completo || 'Usuário';

    console.log('Gerando relatório consolidado para usuário:', userId);

    // 1. Buscar dados de todas as etapas
    const discData = await supabaseAPI.getDiscRespostas(userId);
    const temperamentosData = await supabaseAPI.getTemperamentosRespostas(userId);
    const mvvData = await supabaseAPI.getMvvRespostas(userId);
    const swotData = await supabaseAPI.getSwotRespostas(userId);
    const okrData = await supabaseAPI.getOkrRespostas(userId);
    const rodaVidaData = await supabaseAPI.getRodaVidaRespostas(userId);

    // 2. Verificar se todas as etapas foram completadas
    if (!discData || !temperamentosData || !mvvData || !swotData || !okrData || !rodaVidaData) {
      return res.status(400).json({ 
        error: 'Todas as etapas devem ser completadas antes de gerar o relatório consolidado' 
      });
    }

    // 3. Criar thread OpenAI para o relatório consolidado
    let thread = null;
    const userThreads = await chatAPI.getUserThreads(userId, 'relatorio-consolidado');
    if (userThreads && userThreads.length > 0) {
      thread = userThreads[0];
    } else {
      thread = await chatAPI.createOpenAIThread(userId, 'relatorio-consolidado', 'Relatório Consolidado');
    }
    const threadId = thread.thread_id;

    // 4. Preparar dados consolidados
    const dadosConsolidados = {
      usuario: userName,
      disc: discData,
      temperamentos: temperamentosData,
      mvv: mvvData,
      swot: swotData,
      okr: okrData,
      rodaVida: rodaVidaData
    };

    // 5. Adicionar mensagem do usuário na thread OpenAI
    const userMessageContent = `Dados consolidados do workshop para ${userName}:\n${JSON.stringify(dadosConsolidados, null, 2)}`;
    await chatAPI.addMessageToThread(threadId, 'user', userMessageContent, { 
      etapa: 'relatorio-consolidado', 
      tipo: 'dados_consolidados' 
    });

    // 6. Obter configuração do assistente para relatório consolidado
    const assistantConfig = assistantManager.getAssistantConfig('relatorio-consolidado');
    
    if (!assistantConfig.assistantId) {
      return res.status(500).json({ error: 'Assistente não configurado para relatório consolidado' });
    }

    // 7. Chamar GPT usando a thread OpenAI
    const OpenAI = require('openai');
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
    }
    const openaiClient = new OpenAI({ apiKey: openaiApiKey });

    // Criar run para processar a thread
    const run = await openaiClient.beta.threads.runs.create(threadId, {
      assistant_id: assistantConfig.assistantId,
      instructions: assistantConfig.instructions
    });

    // Aguardar conclusão do run
    let runStatus = run.status;
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const runCheck = await openaiClient.beta.threads.runs.retrieve(threadId, run.id);
      runStatus = runCheck.status;
    }

    if (runStatus === 'completed') {
      // 8. Buscar mensagens da thread OpenAI
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        const gptContent = assistantMessage.content[0].text.value;
        
        // 9. Salvar resposta do assistente no banco
        await chatAPI.saveChatMessage(threadId, 'assistant', gptContent, { 
          etapa: 'relatorio-consolidado', 
          tipo: 'relatorio_consolidado' 
        });

        // 10. Salvar relatório consolidado
        await chatAPI.saveRelatorio(threadId, 'relatorio-consolidado', 'Relatório Consolidado', gptContent);

        // 11. Buscar histórico e relatório do banco
        const historico = await chatAPI.getChatMessages(threadId);
        const relatorio = await chatAPI.getRelatorio(threadId, 'relatorio-consolidado');

        // 12. Retornar tudo para o frontend
        res.status(201).json({
          message: 'Relatório consolidado gerado com sucesso',
          thread_id: threadId,
          historico,
          relatorio,
          etapa: 'relatorio-consolidado',
          assistant_id: assistantConfig.assistantId
        });
      } else {
        throw new Error('Nenhuma resposta do assistente encontrada');
      }
    } else {
      throw new Error(`Run falhou com status: ${runStatus}`);
    }
  } catch (error) {
    console.error('Erro ao gerar relatório consolidado:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTA PARA LISTAR ASSISTENTES CONFIGURADOS =====
app.get('/workshop/assistants', authenticateToken, (req, res) => {
  try {
    const assistants = assistantManager.assistants;
    const instructions = assistantManager.instructions;
    
    const assistantList = Object.keys(assistants).map(etapa => ({
      etapa,
      assistant_id: assistants[etapa] || null,
      configured: !!assistants[etapa],
      instructions: instructions[etapa] || null
    }));
    
    res.json({
      assistants: assistantList,
      total: assistantList.length,
      configured: assistantList.filter(a => a.configured).length
    });
  } catch (error) {
    console.error('Erro ao listar assistentes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rota de teste da API
app.get('/test', (req, res) => {
  res.json({ 
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Rota de fallback
app.use('/*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Swagger UI disponível em: http://localhost:${PORT}/api-docs`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
}); 