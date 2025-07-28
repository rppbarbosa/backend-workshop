# Backend Workshop

Backend API para o workshop de desenvolvimento, construído com Node.js e Express.

## 🚀 Funcionalidades

- Autenticação de usuários
- Chat API com processamento de respostas GPT
- Integração com Supabase
- Múltiplas APIs para diferentes tipos de respostas (OKR, SWOT, MVV, etc.)
- Sistema de gerenciamento de assistentes

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn
- Conta no Supabase
- Chave da API OpenAI

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/backend-workshop.git
cd backend-workshop
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp env-template.txt .env
```

4. Edite o arquivo `.env` com suas credenciais:
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
OPENAI_API_KEY=sua_chave_da_api_openai
PORT=3000
```

## 🚀 Executando o projeto

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 📚 Documentação da API

A documentação Swagger está disponível em `/api-docs` quando o servidor estiver rodando.

### Endpoints principais:

- `POST /auth/login` - Autenticação de usuário
- `POST /chat` - Chat com processamento GPT
- `POST /okr-respostas` - Respostas OKR
- `POST /swot-respostas` - Respostas SWOT
- `POST /mvv-respostas` - Respostas MVV
- `POST /roda-vida-respostas` - Respostas Roda da Vida
- `POST /temperamentos-respostas` - Respostas de Temperamentos

## 🗄️ Estrutura do Banco de Dados

O projeto inclui scripts SQL para criar as tabelas necessárias:

- `create-table-chat-threads.sql` - Tabela de threads de chat
- `create-table-okr-respostas.sql` - Tabela de respostas OKR
- `create-table-swot-respostas.sql` - Tabela de respostas SWOT
- `create-table-mvv-respostas.sql` - Tabela de respostas MVV
- `create-table-roda-vida-respostas.sql` - Tabela de respostas Roda da Vida
- `create-table-temperamentos-respostas.sql` - Tabela de respostas de Temperamentos

## 🔧 Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Supabase** - Backend as a Service
- **OpenAI API** - Processamento de linguagem natural
- **Swagger** - Documentação da API

## 📝 Scripts Disponíveis

- `npm start` - Inicia o servidor
- `npm run dev` - Inicia o servidor em modo desenvolvimento
- `npm test` - Executa os testes

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

Seu Nome - [seu-email@exemplo.com]

## 🙏 Agradecimentos

- Supabase pela infraestrutura
- OpenAI pela API de processamento de linguagem
- Comunidade Node.js 