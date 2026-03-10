# 🏥 Clínica — Sistema de Controle de Atendimento (WebSocket)

Sistema de fila de espera e controle de atendimento médico em tempo real, utilizando WebSocket.

## Requisitos

- Node.js v18 ou superior

## Instalação

```bash
# 1. Entre na pasta do projeto
cd clinic-ws

# 2. Instale as dependências
npm install

# 3. Inicie o servidor
npm start

# Para desenvolvimento com reload automático:
npm run dev
```

Acesse: **http://localhost:3000**

## Estrutura do Projeto

```
clinic-ws/
├── server.js                    ← Entry point (Express + WebSocket)
├── data/
│   └── controleAtendimento.json ← Persistência local (JSON)
├── models/
│   └── PacienteModel.js         ← Leitura e escrita de dados
├── controllers/
│   └── PacienteController.js   ← Lógica de negócio + validação
├── routes/
│   └── pacienteRoutes.js       ← Definição dos endpoints HTTP
├── websocket/
│   └── wsHandler.js            ← Gerenciamento de conexões WS
└── public/                     ← Frontend (servido pelo Express)
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/pacientes | Lista todos os pacientes |
| POST | /api/pacientes | Cadastra novo paciente |
| PATCH | /api/pacientes/:id/status | Atualiza status |
| DELETE | /api/pacientes/:id | Remove paciente |
| GET | /api/status | Status do servidor |

## Status dos Pacientes

`Em Espera` → `Em Atendimento` → `Atendido`  
`Em Espera` → `Cancelado`  
`Em Atendimento` → `Cancelado`

## Eventos WebSocket

| Tipo | Quando ocorre |
|------|--------------|
| CONEXAO_OK | Ao conectar |
| PACIENTE_CADASTRADO | Novo paciente na fila |
| STATUS_ATUALIZADO | Status alterado |
| PACIENTE_REMOVIDO | Paciente removido |
