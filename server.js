// Start do server com WebSocket e HTTP

const http = require("http");
const express = require("express");
const path = require("path");

const pacienteRoutes = require("./routes/pacienteRoutes");
const PacienteController = require("./controllers/PacienteController");
const wsHandler = require("./websocket/wsHandler");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ───────────────────────────────────────────────────────────────

// Interpretar body derequests
app.use(express.json());
// Prove os arquivos estaticos de public para uso do front-end (versão MVP)
app.use(express.static(path.join(__dirname, "public")));

// ─── Rotas HTTP ────────────────────────────────────────────────────────────────

app.use("/api/pacientes", pacienteRoutes);

// Verificar status do server
app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    clientesWS: wsHandler.totalClientesConectados(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Servidor HTTP + WebSocket ─────────────────────────────────────────────────

//servir o server como http e websocket - inicializar o http e enviar para o wsHandler
const server = http.createServer(app);
wsHandler.inicializar(server);

//Injeta o broadcast para comunicação
PacienteController.setBroadcast(wsHandler.broadcast);

// ─── Start ─────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`\n Clínica WebSocket rodando!`);
  console.log(`   Acesse: http://localhost:${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api/pacientes`);
  console.log(`   Status: http://localhost:${PORT}/api/status\n`);
});
