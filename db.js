require('dotenv').config({ path: './config.env' });
const { Pool } = require('pg');

console.log('🔍 Verificando variáveis de ambiente...');
console.log('DATABASE_URL existe:', !!process.env.DATABASE_URL);
console.log('JWT_SECRET existe:', !!process.env.JWT_SECRET);

// Configuração otimizada para Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  },
  // Configurações para estabilidade
  max: 1, // Limite baixo para plano free
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // 15 segundos
  // Configurações específicas para Supabase
  application_name: 'future-law-planner-backend'
});

// Testar conexão ao inicializar
pool.on('connect', (client) => {
  console.log('✅ Conexão com Supabase estabelecida');
});

pool.on('error', (err, client) => {
  console.error('❌ Erro na conexão com Supabase:', err);
});

// Teste de conexão inicial
const testConnection = async () => {
  try {
    console.log('🔄 Testando conexão com Supabase...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Teste de conexão Supabase OK! Data/hora:', result.rows[0].now);
  } catch (err) {
    console.error('❌ Erro no teste de conexão Supabase:', err.message);
  }
};

testConnection();

module.exports = pool;