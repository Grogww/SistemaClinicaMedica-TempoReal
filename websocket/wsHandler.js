// classe de gerencia do websocket
// gerencia e manipula logs e conexões do ws, desacopla do server.js

const WebSocket = require("ws");

// Conjunto de clientes, Set para facilitar remoção
const clientes = new Set();

// Count para conexões - manter registro em logs e outros
let totalConexoes = 0;

// Configuração com servidor para acoplar o http com ws no mesmo servidor
//podem se comunicar na mesma porta (default 3000)
function inicializar(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    totalConexoes++;
    const idConexao = totalConexoes;
    const ip = req.socket.remoteAddress;

    clientes.add(ws);
    console.log(`[WS] ✅ Cliente #${idConexao} conectado | IP: ${ip} | Total: ${clientes.size}`);

    // QUando um cliente conecta envia mensagem de boas vindas
    // Permite o client reagir a esse evento ou avisar sobre a conexão estabalecida
    enviarParaUm(ws, { tipo: "CONEXAO_OK", mensagem: "Conectado ao servidor da clínica.", timestamp: new Date().toISOString() });

    // Alerta de Disconnect do cliente (fecha aba, navegador)
    ws.on("close", () => {
      clientes.delete(ws);
      console.log(`[WS] Cliente #${idConexao} desconectado | Restantes: ${clientes.size}`);
    });

    // Se houver erro na conexão remove o cliente e faz log do problema
    ws.on("error", (err) => {
      console.error(`[WS] Erro no cliente #${idConexao}:`, err.message);
      clientes.delete(ws);
    });

    // Funcionalidade do cliente reagir a mensagem - NÃO IMPLEMENTADO
    ws.on("message", (mensagem) => {
      console.log(`[WS] Mensagem do cliente #${idConexao}:`, mensagem.toString());
    });
  });

  console.log("[WS] Servidor WebSocket inicializado e aguardando conexões.");
  return wss;
}

// Envia mensagem para 1 clientes especifico (usado no CONEXAO_OK)
function enviarParaUm(ws, dados) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(dados));
  }
}

// Essa função é responsável por se comunicar com TODOS os clientes ws conectados no server
// Dessa forma cada controller possui uma referencia, não precisando importar o ws diretamente para fazer a comunicação
function broadcast(dados) {
  const payload = JSON.stringify(dados);
  let enviados = 0;

  clientes.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      enviados++;
    }
  });

  console.log(`[WS] Broadcast "${dados.tipo}" -> ${enviados} cliente(s)`);
}

// retorna quantos clientes estao conectados
function totalClientesConectados() {
  return clientes.size;
}

module.exports = { inicializar, broadcast, totalClientesConectados };
