const fs = require('fs').promises;
const path = require('path');

// Arquivo para armazenar usuários (temporário, substitui o banco)
const USERS_FILE = path.join(__dirname, 'users.json');

// Inicializar arquivo de usuários se não existir
const initializeUsersFile = async () => {
  try {
    await fs.access(USERS_FILE);
  } catch {
    // Arquivo não existe, criar com array vazio
    await fs.writeFile(USERS_FILE, JSON.stringify([], null, 2));
  }
};

// Carregar usuários do arquivo
const loadUsers = async () => {
  await initializeUsersFile();
  const data = await fs.readFile(USERS_FILE, 'utf8');
  return JSON.parse(data);
};

// Salvar usuários no arquivo
const saveUsers = async (users) => {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
};

// Buscar usuário por OAB e UF
const findUserByOabUf = async (oab, uf_oab) => {
  const users = await loadUsers();
  return users.find(user => user.oab === oab && user.uf_oab === uf_oab);
};

// Buscar usuário por email
const findUserByEmail = async (email) => {
  const users = await loadUsers();
  return users.find(user => user.email === email);
};

// Criar novo usuário
const createUser = async (userData) => {
  const users = await loadUsers();
  
  // Verificar se já existe usuário com mesmo OAB+UF ou email
  const existingOabUf = users.find(user => 
    user.oab === userData.oab && user.uf_oab === userData.uf_oab
  );
  
  const existingEmail = users.find(user => 
    user.email === userData.email
  );
  
  if (existingOabUf) {
    throw new Error('Usuário com este OAB+UF já existe.');
  }
  
  if (existingEmail) {
    throw new Error('Email já cadastrado.');
  }
  
  // Gerar ID único
  const newUser = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    criado_em: new Date().toISOString(),
    ...userData
  };
  
  users.push(newUser);
  await saveUsers(users);
  
  return newUser;
};

// Listar todos os usuários (para debug)
const getAllUsers = async () => {
  return await loadUsers();
};

module.exports = {
  findUserByOabUf,
  findUserByEmail,
  createUser,
  getAllUsers
}; 