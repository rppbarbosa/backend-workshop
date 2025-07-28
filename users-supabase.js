const bcrypt = require('bcryptjs');
const supabaseAPI = require('./supabase-api');

// Buscar usuário por OAB e UF
const findUserByOabUf = async (oab, uf_oab) => {
  try {
    return await supabaseAPI.findUserByOabUf(oab, uf_oab);
  } catch (err) {
    console.error('Erro ao buscar usuário por OAB+UF:', err);
    throw err;
  }
};

// Buscar usuário por email
const findUserByEmail = async (email) => {
  try {
    return await supabaseAPI.findUserByEmail(email);
  } catch (err) {
    console.error('Erro ao buscar usuário por email:', err);
    throw err;
  }
};

// Autenticar usuário por email e senha
const authenticateUserByEmail = async (email, senha) => {
  try {
    console.log('Autenticando usuário por email:', email);
    
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('Usuário não encontrado');
      return null;
    }
    
    // Verificar se o usuário tem senha cadastrada
    if (!user.senha_hash) {
      console.log('Usuário não tem senha cadastrada');
      return null;
    }
    
    // Verificar senha
    const isPasswordValid = await bcrypt.compare(senha, user.senha_hash);
    if (!isPasswordValid) {
      console.log('Senha incorreta');
      return null;
    }
    
    console.log('Autenticação bem-sucedida para:', user.nome_completo);
    return user;
    
  } catch (err) {
    console.error('Erro ao autenticar usuário:', err);
    throw err;
  }
};

// Criar novo usuário
const createUser = async (userData) => {
  try {
    console.log('Criando usuário no Supabase:', userData.nome_completo);
    
    // Verificar se já existe usuário com mesmo OAB+UF
    const existingUser = await findUserByOabUf(userData.oab, userData.uf_oab);
    if (existingUser) {
      throw new Error(`Usuário com OAB ${userData.oab}${userData.uf_oab} já existe.`);
    }
    
    // Verificar se já existe usuário com mesmo email
    const existingEmail = await findUserByEmail(userData.email);
    if (existingEmail) {
      throw new Error(`Email ${userData.email} já está cadastrado.`);
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(userData.senha, 10);
    
    // Criar usuário via API REST
    const userDataWithHash = {
      ...userData,
      senha_hash: hashedPassword
    };
    
    return await supabaseAPI.createUser(userDataWithHash);
    
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    throw err;
  }
};

// Listar todos os usuários
const getAllUsers = async () => {
  try {
    return await supabaseAPI.getAllUsers();
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    throw err;
  }
};

// Atualizar usuário
const updateUser = async (userId, updateData) => {
  try {
    return await supabaseAPI.updateUser(userId, updateData);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    throw err;
  }
};

// Deletar usuário
const deleteUser = async (userId) => {
  try {
    return await supabaseAPI.deleteUser(userId);
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    throw err;
  }
};

// Buscar usuário por ID
const findUserById = async (userId) => {
  try {
    return await supabaseAPI.findUserById(userId);
  } catch (err) {
    console.error('Erro ao buscar usuário por ID:', err);
    throw err;
  }
};

module.exports = {
  findUserByOabUf,
  findUserByEmail,
  authenticateUserByEmail,
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
  findUserById
}; 