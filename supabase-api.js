require('dotenv').config({ path: './config.env' });
const fetch = require('node-fetch');

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Headers padrão para requisições
const getHeaders = (useServiceRole = false) => ({
  'Content-Type': 'application/json',
  'apikey': useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY}`
});

// Classe para gerenciar operações com usuários
class SupabaseAPI {
  constructor() {
    this.baseURL = `${SUPABASE_URL}/rest/v1`;
  }

  // Buscar usuário por OAB e UF
  async findUserByOabUf(oab, uf_oab) {
    try {
      console.log('Buscando usuário por OAB+UF via Supabase API:', { oab, uf_oab });
      
      const response = await fetch(
        `${this.baseURL}/usuarios?oab=eq.${oab}&uf_oab=eq.${uf_oab.toUpperCase()}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const users = await response.json();
      
      if (users.length === 0) {
        console.log('Usuário não encontrado');
        return null;
      }

      console.log('Usuário encontrado:', users[0].nome_completo);
      return users[0];
      
    } catch (err) {
      console.error('Erro ao buscar usuário por OAB+UF:', err);
      throw err;
    }
  }

  // Buscar usuário por email
  async findUserByEmail(email) {
    try {
      console.log('Buscando usuário por email via Supabase API:', email);
      
      const response = await fetch(
        `${this.baseURL}/usuarios?email=eq.${encodeURIComponent(email)}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const users = await response.json();
      
      if (users.length === 0) {
        console.log('Usuário não encontrado');
        return null;
      }

      console.log('Usuário encontrado:', users[0].nome_completo);
      return users[0];
      
    } catch (err) {
      console.error('Erro ao buscar usuário por email:', err);
      throw err;
    }
  }

  // Criar novo usuário
  async createUser(userData) {
    try {
      console.log('Criando usuário via Supabase API:', userData.nome_completo);
      console.log('URL da API:', `${this.baseURL}/usuarios`);
      console.log('Headers:', getHeaders(true));
      
      const requestBody = {
        nome_completo: userData.nome_completo,
        email: userData.email,
        oab: userData.oab,
        uf_oab: userData.uf_oab.toUpperCase(),
        senha_hash: userData.senha_hash
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(
        `${this.baseURL}/usuarios`,
        {
          method: 'POST',
          headers: getHeaders(true), // Usar service role para inserção
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Erro na criação:', errorData);
          
          // Tratar erros específicos do Supabase
          if (errorData.code === '23505') {
            if (errorData.message.includes('usuarios_email_key')) {
              throw new Error(`Email ${userData.email} já está cadastrado.`);
            } else if (errorData.message.includes('usuarios_oab_uf_unique')) {
              throw new Error(`Usuário com OAB ${userData.oab}${userData.uf_oab} já existe.`);
            }
          }
        } catch (jsonError) {
          console.error('Erro ao parsear resposta JSON:', jsonError);
          console.error('Status da resposta:', response.status);
          console.error('Headers da resposta:', response.headers.raw());
        }
        
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      // Para POST bem-sucedido, a resposta pode estar vazia
      if (response.status === 201) {
        console.log('Usuário criado com sucesso! Status 201');
        
        // Buscar o usuário recém-criado para retornar os dados
        try {
          const createdUser = await this.findUserByEmail(userData.email);
          if (createdUser) {
            console.log('Usuário encontrado após criação:', createdUser.nome_completo);
            return createdUser;
          } else {
            console.log('Usuário criado mas não encontrado na busca');
            return {
              nome_completo: userData.nome_completo,
              email: userData.email,
              oab: userData.oab,
              uf_oab: userData.uf_oab.toUpperCase(),
              message: 'Usuário criado com sucesso'
            };
          }
        } catch (searchError) {
          console.log('Erro ao buscar usuário após criação:', searchError);
          return {
            nome_completo: userData.nome_completo,
            email: userData.email,
            oab: userData.oab,
            uf_oab: userData.uf_oab.toUpperCase(),
            message: 'Usuário criado com sucesso'
          };
        }
      }
      
      // Para outros status, tentar parsear JSON
      let newUser;
      try {
        newUser = await response.json();
        console.log('Resposta da API:', newUser);
        
        if (Array.isArray(newUser) && newUser.length > 0) {
          console.log('Usuário criado com sucesso:', newUser[0].nome_completo);
          return newUser[0];
        } else if (newUser && newUser.id) {
          console.log('Usuário criado com sucesso:', newUser.nome_completo);
          return newUser;
        } else {
          console.log('Resposta inesperada da API:', newUser);
          return newUser;
        }
      } catch (jsonError) {
        console.error('Erro ao parsear resposta JSON:', jsonError);
        throw new Error('Erro ao processar resposta da API');
      }
      
    } catch (err) {
      console.error('Erro ao criar usuário:', err);
      throw err;
    }
  }

  // Listar todos os usuários (para debug)
  async getAllUsers() {
    try {
      console.log('Buscando todos os usuários via Supabase API...');
      console.log('URL da API:', `${this.baseURL}/usuarios?select=*&order=criado_em.desc`);
      
      const response = await fetch(
        `${this.baseURL}/usuarios?select=*&order=criado_em.desc`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', response.headers.raw());

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
          console.error('Resposta de erro:', errorText);
        } catch (e) {
          console.error('Não foi possível ler resposta de erro');
        }
        throw new Error(`Erro na API: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const users = await response.json();
      console.log(`Encontrados ${users.length} usuários`);
      return users;
      
    } catch (err) {
      console.error('Erro ao listar usuários:', err);
      throw err;
    }
  }

  // Atualizar usuário
  async updateUser(userId, updateData) {
    try {
      console.log('Atualizando usuário via Supabase API:', userId);
      
      const response = await fetch(
        `${this.baseURL}/usuarios?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: getHeaders(true), // Usar service role para atualização
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const updatedUser = await response.json();
      console.log('Usuário atualizado com sucesso');
      return updatedUser[0];
      
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      throw err;
    }
  }

  // Deletar usuário
  async deleteUser(userId) {
    try {
      console.log('Deletando usuário via Supabase API:', userId);
      
      const response = await fetch(
        `${this.baseURL}/usuarios?id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: getHeaders(true) // Usar service role para deleção
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log('Usuário deletado com sucesso');
      return true;
      
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
      throw err;
    }
  }

  // Buscar usuário por ID
  async findUserById(userId) {
    try {
      console.log('Buscando usuário por ID via Supabase API:', userId);
      
      const response = await fetch(
        `${this.baseURL}/usuarios?id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const users = await response.json();
      
      if (users.length === 0) {
        console.log('Usuário não encontrado');
        return null;
      }

      console.log('Usuário encontrado:', users[0].nome_completo);
      return users[0];
      
    } catch (err) {
      console.error('Erro ao buscar usuário por ID:', err);
      throw err;
    }
  }

  // ===== FUNÇÕES PARA MVV RESPOSTAS =====

  // Salvar ou atualizar respostas da MVV
  async saveMvvRespostas(userId, respostas) {
    try {
      console.log('Salvando respostas MVV:', { userId, respostas });
      
      // Verificar se já existe registro para o usuário
      const existingRecord = await this.getMvvRespostas(userId);
      
      let response;
      if (existingRecord) {
        // Atualizar registro existente
        console.log('Atualizando registro existente');
        response = await fetch(
          `${this.baseURL}/mvv_respostas?usuario_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: getHeaders(true), // Usar service role para atualização
            body: JSON.stringify(respostas)
          }
        );
      } else {
        // Criar novo registro
        console.log('Criando novo registro');
        const requestBody = {
          usuario_id: userId,
          ...respostas
        };
        
        response = await fetch(
          `${this.baseURL}/mvv_respostas`,
          {
            method: 'POST',
            headers: getHeaders(true), // Usar service role para inserção
            body: JSON.stringify(requestBody)
          }
        );
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Erro ao salvar respostas:', errorData);
        } catch (jsonError) {
          console.error('Erro ao parsear resposta JSON:', jsonError);
        }
        
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      console.log('Respostas MVV salvas com sucesso!');
      return true;
      
    } catch (err) {
      console.error('Erro ao salvar respostas MVV:', err);
      throw err;
    }
  }

  // Buscar respostas da MVV por usuário
  async getMvvRespostas(userId) {
    try {
      console.log('Buscando respostas MVV do usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/mvv_respostas?usuario_id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      
      if (respostas.length === 0) {
        console.log('Nenhuma resposta encontrada para o usuário');
        return null;
      }

      console.log('Respostas MVV encontradas:', respostas[0]);
      return respostas[0];
      
    } catch (err) {
      console.error('Erro ao buscar respostas MVV:', err);
      throw err;
    }
  }

  // Buscar todas as respostas da MVV (para admin)
  async getAllMvvRespostas() {
    try {
      console.log('Buscando todas as respostas MVV...');
      
      const response = await fetch(
        `${this.baseURL}/mvv_respostas?select=*&order=criado_em.desc`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      console.log(`Encontradas ${respostas.length} respostas totais`);
      return respostas;
      
    } catch (err) {
      console.error('Erro ao buscar todas as respostas MVV:', err);
      throw err;
    }
  }

  // Atualizar resposta específica da MVV
  async updateMvvResposta(userId, campo, novaResposta) {
    try {
      console.log('Atualizando resposta MVV específica:', { userId, campo, novaResposta });
      
      const updateData = { [campo]: novaResposta };
      
      const response = await fetch(
        `${this.baseURL}/mvv_respostas?usuario_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: getHeaders(true), // Usar service role para atualização
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log('Resposta MVV atualizada com sucesso');
      return true;
      
    } catch (err) {
      console.error('Erro ao atualizar resposta MVV:', err);
      throw err;
    }
  }

  // Deletar respostas da MVV
  async deleteMvvRespostas(userId) {
    try {
      console.log('Deletando respostas MVV do usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/mvv_respostas?usuario_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: getHeaders(true) // Usar service role para deleção
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log('Respostas MVV deletadas com sucesso');
      return true;
      
    } catch (err) {
      console.error('Erro ao deletar respostas MVV:', err);
      throw err;
    }
  }

  // ===== FUNÇÕES PARA SWOT RESPOSTAS =====

  // Salvar ou atualizar respostas da SWOT
  async saveSwotRespostas(userId, respostas) {
    try {
      console.log('Salvando respostas SWOT:', { userId, respostas });
      
      // Verificar se já existe registro para o usuário
      const existingRecord = await this.getSwotRespostas(userId);
      
      let response;
      if (existingRecord) {
        // Atualizar registro existente
        console.log('Atualizando registro existente');
        response = await fetch(
          `${this.baseURL}/swot_respostas?usuario_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: getHeaders(true), // Usar service role para atualização
            body: JSON.stringify(respostas)
          }
        );
      } else {
        // Criar novo registro
        console.log('Criando novo registro');
        const requestBody = {
          usuario_id: userId,
          ...respostas
        };
        
        response = await fetch(
          `${this.baseURL}/swot_respostas`,
          {
            method: 'POST',
            headers: getHeaders(true), // Usar service role para inserção
            body: JSON.stringify(requestBody)
          }
        );
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Erro ao salvar respostas:', errorData);
        } catch (jsonError) {
          console.error('Erro ao parsear resposta JSON:', jsonError);
        }
        
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      console.log('Respostas SWOT salvas com sucesso!');
      return true;
      
    } catch (err) {
      console.error('Erro ao salvar respostas SWOT:', err);
      throw err;
    }
  }

  // Buscar respostas da SWOT por usuário
  async getSwotRespostas(userId) {
    try {
      console.log('Buscando respostas SWOT do usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/swot_respostas?usuario_id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      
      if (respostas.length === 0) {
        console.log('Nenhuma resposta encontrada para o usuário');
        return null;
      }

      console.log('Respostas SWOT encontradas:', respostas[0]);
      return respostas[0];
      
    } catch (err) {
      console.error('Erro ao buscar respostas SWOT:', err);
      throw err;
    }
  }

  // Buscar todas as respostas da SWOT (para admin)
  async getAllSwotRespostas() {
    try {
      console.log('Buscando todas as respostas SWOT...');
      
      const response = await fetch(
        `${this.baseURL}/swot_respostas?select=*&order=criado_em.desc`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      console.log(`Encontradas ${respostas.length} respostas totais`);
      return respostas;
      
    } catch (err) {
      console.error('Erro ao buscar todas as respostas SWOT:', err);
      throw err;
    }
  }

  // Atualizar resposta específica da SWOT
  async updateSwotResposta(userId, campo, resposta) {
    try {
      console.log('Atualizando resposta SWOT:', { userId, campo, resposta });
      
      const response = await fetch(
        `${this.baseURL}/swot_respostas?usuario_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: getHeaders(true), // Usar service role para atualização
          body: JSON.stringify({ [campo]: resposta })
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      console.log('Resposta SWOT atualizada com sucesso!');
      return true;
      
    } catch (err) {
      console.error('Erro ao atualizar resposta SWOT:', err);
      throw err;
    }
  }

  // Deletar respostas da SWOT
  async deleteSwotRespostas(userId) {
    try {
      console.log('Deletando respostas SWOT do usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/swot_respostas?usuario_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: getHeaders(true) // Usar service role para deleção
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      console.log('Respostas SWOT deletadas com sucesso!');
      return true;
      
    } catch (err) {
      console.error('Erro ao deletar respostas SWOT:', err);
      throw err;
    }
  }

  // ===== FUNÇÕES PARA OKR RESPOSTAS =====

  // Salvar ou atualizar respostas da OKR
  async saveOkrRespostas(userId, respostas) {
    try {
      console.log('Salvando respostas OKR para usuário:', userId);
      console.log('Respostas:', respostas);
      
      // Verificar se já existe uma resposta para este usuário
      const existingResponse = await fetch(
        `${this.baseURL}/okr_respostas?usuario_id=eq.${userId}`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!existingResponse.ok) {
        throw new Error(`Erro na API: ${existingResponse.status} ${existingResponse.statusText}`);
      }

      const existing = await existingResponse.json();
      
      if (existing && existing.length > 0) {
        // Atualizar resposta existente
        console.log('Atualizando resposta OKR existente...');
        
        const updateResponse = await fetch(
          `${this.baseURL}/okr_respostas?usuario_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: getHeaders(true), // Usar service role para atualização
            body: JSON.stringify({
              ...respostas,
              atualizado_em: new Date().toISOString()
            })
          }
        );

        if (!updateResponse.ok) {
          throw new Error(`Erro na API: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        console.log('Respostas OKR atualizadas com sucesso!');
        return true;
      } else {
        // Criar nova resposta
        console.log('Criando nova resposta OKR...');
        
        const createResponse = await fetch(
          `${this.baseURL}/okr_respostas`,
          {
            method: 'POST',
            headers: getHeaders(true), // Usar service role para criação
            body: JSON.stringify({
              usuario_id: userId,
              ...respostas
            })
          }
        );

        if (!createResponse.ok) {
          throw new Error(`Erro na API: ${createResponse.status} ${createResponse.statusText}`);
        }

        console.log('Respostas OKR criadas com sucesso!');
        return true;
      }
      
    } catch (err) {
      console.error('Erro ao salvar respostas OKR:', err);
      throw err;
    }
  }

  // Buscar respostas da OKR por usuário
  async getOkrRespostas(userId) {
    try {
      console.log('Buscando respostas OKR para usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/okr_respostas?usuario_id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      
      if (respostas.length === 0) {
        console.log('Nenhuma resposta encontrada para o usuário');
        return null;
      }

      console.log('Respostas OKR encontradas:', respostas[0]);
      return respostas[0];
      
    } catch (err) {
      console.error('Erro ao buscar respostas OKR:', err);
      throw err;
    }
  }

  // Buscar todas as respostas da OKR (para admin)
  async getAllOkrRespostas() {
    try {
      console.log('Buscando todas as respostas OKR...');
      
      const response = await fetch(
        `${this.baseURL}/okr_respostas?select=*&order=criado_em.desc`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      console.log(`Encontradas ${respostas.length} respostas totais`);
      return respostas;
      
    } catch (err) {
      console.error('Erro ao buscar todas as respostas OKR:', err);
      throw err;
    }
  }

  // Atualizar resposta específica da OKR
  async updateOkrResposta(userId, campo, resposta) {
    try {
      console.log('Atualizando resposta OKR:', { userId, campo, resposta });
      
      const response = await fetch(
        `${this.baseURL}/okr_respostas?usuario_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: getHeaders(true), // Usar service role para atualização
          body: JSON.stringify({ [campo]: resposta })
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      console.log('Resposta OKR atualizada com sucesso!');
      return true;
      
    } catch (err) {
      console.error('Erro ao atualizar resposta OKR:', err);
      throw err;
    }
  }

  // Deletar respostas da OKR
  async deleteOkrRespostas(userId) {
    try {
      console.log('Deletando respostas OKR do usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/okr_respostas?usuario_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: getHeaders(true) // Usar service role para deleção
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      console.log('Respostas OKR deletadas com sucesso!');
      return true;
      
    } catch (err) {
      console.error('Erro ao deletar respostas OKR:', err);
      throw err;
    }
  }

  // ===== FUNÇÕES PARA RODA DA VIDA RESPOSTAS =====

  // Salvar ou atualizar respostas da Roda da Vida
  async saveRodaVidaRespostas(userId, respostas) {
    try {
      console.log('Salvando respostas Roda da Vida para usuário:', userId);
      console.log('Respostas:', respostas);
      
      // Verificar se já existe uma resposta para este usuário
      const existingResponse = await fetch(
        `${this.baseURL}/roda_vida_respostas?usuario_id=eq.${userId}`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!existingResponse.ok) {
        throw new Error(`Erro na API: ${existingResponse.status} ${existingResponse.statusText}`);
      }

      const existing = await existingResponse.json();
      
      if (existing && existing.length > 0) {
        // Atualizar resposta existente
        console.log('Atualizando resposta Roda da Vida existente...');
        
        const updateResponse = await fetch(
          `${this.baseURL}/roda_vida_respostas?usuario_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: getHeaders(true), // Usar service role para atualização
            body: JSON.stringify({
              ...respostas,
              atualizado_em: new Date().toISOString()
            })
          }
        );

        if (!updateResponse.ok) {
          throw new Error(`Erro na API: ${updateResponse.status} ${updateResponse.statusText}`);
        }

        console.log('Respostas Roda da Vida atualizadas com sucesso!');
        return true;
      } else {
        // Criar nova resposta
        console.log('Criando nova resposta Roda da Vida...');
        
        const createResponse = await fetch(
          `${this.baseURL}/roda_vida_respostas`,
          {
            method: 'POST',
            headers: getHeaders(true), // Usar service role para criação
            body: JSON.stringify({
              usuario_id: userId,
              ...respostas
            })
          }
        );

        if (!createResponse.ok) {
          throw new Error(`Erro na API: ${createResponse.status} ${createResponse.statusText}`);
        }

        console.log('Respostas Roda da Vida criadas com sucesso!');
        return true;
      }
      
    } catch (err) {
      console.error('Erro ao salvar respostas Roda da Vida:', err);
      throw err;
    }
  }

  // Buscar respostas da Roda da Vida por usuário
  async getRodaVidaRespostas(userId) {
    try {
      console.log('Buscando respostas Roda da Vida para usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/roda_vida_respostas?usuario_id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      
      if (respostas.length === 0) {
        console.log('Nenhuma resposta encontrada para o usuário');
        return null;
      }

      console.log('Respostas Roda da Vida encontradas:', respostas[0]);
      return respostas[0];
      
    } catch (err) {
      console.error('Erro ao buscar respostas Roda da Vida:', err);
      throw err;
    }
  }

  // Buscar todas as respostas da Roda da Vida (para admin)
  async getAllRodaVidaRespostas() {
    try {
      console.log('Buscando todas as respostas Roda da Vida...');
      
      const response = await fetch(
        `${this.baseURL}/roda_vida_respostas?select=*&order=criado_em.desc`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      console.log(`Encontradas ${respostas.length} respostas totais`);
      return respostas;
      
    } catch (err) {
      console.error('Erro ao buscar todas as respostas Roda da Vida:', err);
      throw err;
    }
  }

  // Atualizar resposta específica da Roda da Vida
  async updateRodaVidaResposta(userId, campo, resposta) {
    try {
      console.log('Atualizando resposta Roda da Vida:', { userId, campo, resposta });
      
      const response = await fetch(
        `${this.baseURL}/roda_vida_respostas?usuario_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: getHeaders(true), // Usar service role para atualização
          body: JSON.stringify({ [campo]: resposta })
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      console.log('Resposta Roda da Vida atualizada com sucesso!');
      return true;
      
    } catch (err) {
      console.error('Erro ao atualizar resposta Roda da Vida:', err);
      throw err;
    }
  }

  // Deletar respostas da Roda da Vida
  async deleteRodaVidaRespostas(userId) {
    try {
      console.log('Deletando respostas Roda da Vida do usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/roda_vida_respostas?usuario_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: getHeaders(true) // Usar service role para deleção
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }
      
      console.log('Respostas Roda da Vida deletadas com sucesso!');
      return true;
      
    } catch (err) {
      console.error('Erro ao deletar respostas Roda da Vida:', err);
      throw err;
    }
  }

  // ===== FUNÇÕES PARA DISC =====
  
  // Salvar respostas DISC
  async saveDiscRespostas(userId, respostas) {
    try {
      console.log('Salvando respostas DISC para usuário:', userId);
      console.log('Respostas:', respostas);
      
      const dataToSave = {
        usuario_id: userId,
        disc_1: respostas.disc_1 || null,
        disc_2: respostas.disc_2 || null,
        disc_3: respostas.disc_3 || null,
        disc_4: respostas.disc_4 || null,
        disc_5: respostas.disc_5 || null,
        disc_6: respostas.disc_6 || null,
        disc_7: respostas.disc_7 || null,
        disc_8: respostas.disc_8 || null,
        disc_9: respostas.disc_9 || null,
        disc_10: respostas.disc_10 || null
      };

      // Verificar se já existe registro para este usuário
      const existingResponse = await fetch(
        `${this.baseURL}/disc_respostas?usuario_id=eq.${userId}`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (existingResponse.ok) {
        const existing = await existingResponse.json();
        
        if (existing.length > 0) {
          // Atualizar registro existente
          const updateResponse = await fetch(
            `${this.baseURL}/disc_respostas?usuario_id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: getHeaders(true),
              body: JSON.stringify(dataToSave)
            }
          );

          if (!updateResponse.ok) {
            throw new Error(`Erro na API: ${updateResponse.status} ${updateResponse.statusText}`);
          }

          console.log('Respostas DISC atualizadas com sucesso');
          return { success: true, updated: true };
        }
      }

      // Criar novo registro
      const response = await fetch(
        `${this.baseURL}/disc_respostas`,
        {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify(dataToSave)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log('Respostas DISC salvas com sucesso');
      return { success: true, created: true };
      
    } catch (err) {
      console.error('Erro ao salvar respostas DISC:', err);
      throw err;
    }
  }

  // Buscar respostas DISC
  async getDiscRespostas(userId) {
    try {
      console.log('Buscando respostas DISC para usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/disc_respostas?usuario_id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      
      if (respostas.length === 0) {
        console.log('Nenhuma resposta DISC encontrada');
        return null;
      }

      console.log('Respostas DISC encontradas:', respostas[0]);
      return respostas[0];
      
    } catch (err) {
      console.error('Erro ao buscar respostas DISC:', err);
      throw err;
    }
  }

  // Buscar todas as respostas DISC
  async getAllDiscRespostas() {
    try {
      console.log('Buscando todas as respostas DISC');
      
      const response = await fetch(
        `${this.baseURL}/disc_respostas?select=*&order=criado_em.desc`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      console.log(`Encontradas ${respostas.length} respostas DISC`);
      return respostas;
      
    } catch (err) {
      console.error('Erro ao buscar todas as respostas DISC:', err);
      throw err;
    }
  }

  // Atualizar resposta DISC específica
  async updateDiscResposta(userId, campo, resposta) {
    try {
      console.log(`Atualizando resposta DISC ${campo} para usuário:`, userId);
      
      const updateData = { [campo]: resposta };
      
      const response = await fetch(
        `${this.baseURL}/disc_respostas?usuario_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: getHeaders(true),
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log(`Resposta DISC ${campo} atualizada com sucesso`);
      return { success: true };
      
    } catch (err) {
      console.error('Erro ao atualizar resposta DISC:', err);
      throw err;
    }
  }

  // Deletar respostas DISC
  async deleteDiscRespostas(userId) {
    try {
      console.log('Deletando respostas DISC para usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/disc_respostas?usuario_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: getHeaders(true)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log('Respostas DISC deletadas com sucesso');
      return { success: true };
      
    } catch (err) {
      console.error('Erro ao deletar respostas DISC:', err);
      throw err;
    }
  }

  // ===== FUNÇÕES PARA TEMPERAMENTOS =====
  
  // Salvar respostas Temperamentos
  async saveTemperamentosRespostas(userId, respostas) {
    try {
      console.log('Salvando respostas Temperamentos para usuário:', userId);
      console.log('Respostas:', respostas);
      
      const dataToSave = {
        usuario_id: userId,
        temperamento_1: respostas.temperamento_1 || null,
        temperamento_2: respostas.temperamento_2 || null,
        temperamento_3: respostas.temperamento_3 || null,
        temperamento_4: respostas.temperamento_4 || null,
        temperamento_5: respostas.temperamento_5 || null,
        temperamento_6: respostas.temperamento_6 || null,
        temperamento_7: respostas.temperamento_7 || null,
        temperamento_8: respostas.temperamento_8 || null,
        temperamento_9: respostas.temperamento_9 || null,
        temperamento_10: respostas.temperamento_10 || null
      };

      // Verificar se já existe registro para este usuário
      const existingResponse = await fetch(
        `${this.baseURL}/temperamentos_respostas?usuario_id=eq.${userId}`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (existingResponse.ok) {
        const existing = await existingResponse.json();
        
        if (existing.length > 0) {
          // Atualizar registro existente
          const updateResponse = await fetch(
            `${this.baseURL}/temperamentos_respostas?usuario_id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: getHeaders(true),
              body: JSON.stringify(dataToSave)
            }
          );

          if (!updateResponse.ok) {
            throw new Error(`Erro na API: ${updateResponse.status} ${updateResponse.statusText}`);
          }

          console.log('Respostas Temperamentos atualizadas com sucesso');
          return { success: true, updated: true };
        }
      }

      // Criar novo registro
      const response = await fetch(
        `${this.baseURL}/temperamentos_respostas`,
        {
          method: 'POST',
          headers: getHeaders(true),
          body: JSON.stringify(dataToSave)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log('Respostas Temperamentos salvas com sucesso');
      return { success: true, created: true };
      
    } catch (err) {
      console.error('Erro ao salvar respostas Temperamentos:', err);
      throw err;
    }
  }

  // Buscar respostas Temperamentos
  async getTemperamentosRespostas(userId) {
    try {
      console.log('Buscando respostas Temperamentos para usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/temperamentos_respostas?usuario_id=eq.${userId}&select=*`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      
      if (respostas.length === 0) {
        console.log('Nenhuma resposta Temperamentos encontrada');
        return null;
      }

      console.log('Respostas Temperamentos encontradas:', respostas[0]);
      return respostas[0];
      
    } catch (err) {
      console.error('Erro ao buscar respostas Temperamentos:', err);
      throw err;
    }
  }

  // Buscar todas as respostas Temperamentos
  async getAllTemperamentosRespostas() {
    try {
      console.log('Buscando todas as respostas Temperamentos');
      
      const response = await fetch(
        `${this.baseURL}/temperamentos_respostas?select=*&order=criado_em.desc`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const respostas = await response.json();
      console.log(`Encontradas ${respostas.length} respostas Temperamentos`);
      return respostas;
      
    } catch (err) {
      console.error('Erro ao buscar todas as respostas Temperamentos:', err);
      throw err;
    }
  }

  // Atualizar resposta Temperamentos específica
  async updateTemperamentosResposta(userId, campo, resposta) {
    try {
      console.log(`Atualizando resposta Temperamentos ${campo} para usuário:`, userId);
      
      const updateData = { [campo]: resposta };
      
      const response = await fetch(
        `${this.baseURL}/temperamentos_respostas?usuario_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: getHeaders(true),
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log(`Resposta Temperamentos ${campo} atualizada com sucesso`);
      return { success: true };
      
    } catch (err) {
      console.error('Erro ao atualizar resposta Temperamentos:', err);
      throw err;
    }
  }

  // Deletar respostas Temperamentos
  async deleteTemperamentosRespostas(userId) {
    try {
      console.log('Deletando respostas Temperamentos para usuário:', userId);
      
      const response = await fetch(
        `${this.baseURL}/temperamentos_respostas?usuario_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: getHeaders(true)
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      console.log('Respostas Temperamentos deletadas com sucesso');
      return { success: true };
      
    } catch (err) {
      console.error('Erro ao deletar respostas Temperamentos:', err);
      throw err;
    }
  }
}

module.exports = new SupabaseAPI(); 