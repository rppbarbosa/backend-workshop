require('dotenv').config({ path: './config.env' });
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Chave secreta para assinar os tokens (em produção, use uma chave mais segura)
const JWT_SECRET = process.env.JWT_SECRET || 'future-law-planner-secret-key-2024-new-project';

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  });
};

// Gerar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      nome_completo: user.nome_completo, 
      email: user.email,
      oab: user.oab,
      uf_oab: user.uf_oab
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' } // Token expira em 7 dias
  );
};

// Hash de senha
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Verificar senha
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  authenticateToken,
  generateToken,
  hashPassword,
  verifyPassword,
  JWT_SECRET
}; 