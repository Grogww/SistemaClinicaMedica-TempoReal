let pacientes = [];  
let areas = [];     

// ─── WebSocket ─────────────────────────────────────────────────────────────────
// usa protocolo ws - na mesma porta que http

const wsUrl = `ws://${window.location.host}`;
let ws;

function conectarWS() {
  ws = new WebSocket(wsUrl);
  atualizarIndicadorWS("conectando");

  ws.onopen = () => {
    atualizarIndicadorWS("conectado");
    console.log("[WS] Conectado ao servidor.");
  };

  // Toda vez que o servidor faz broadcast, onmessage é disparado aqui
  ws.onmessage = (evento) => {
    const dados = JSON.parse(evento.data);
    console.log("[WS] Mensagem recebida:", dados);
    tratarMensagemWS(dados);
  };

  ws.onclose = () => {
    atualizarIndicadorWS("desconectado");
    console.log("[WS] Desconectado. Tentando reconectar em 3s...");
    // Reconexão automática: se cair, tenta de novo após 3 segundos
    setTimeout(conectarWS, 3000);
  };

  ws.onerror = (err) => {
    console.error("[WS] Erro:", err);
  };
}

// Interpreta cada tipo de evento que o servidor pode enviar
function tratarMensagemWS(dados) {
  switch (dados.tipo) {
    case "CONEXAO_OK":
      // So confirmação
      break;

    case "PACIENTE_CADASTRADO":
      pacientes.push(dados.paciente);
      renderizarTabela();
      break;

    case "STATUS_ATUALIZADO":
      pacientes = pacientes.map((p) =>
        p.id === dados.paciente.id ? dados.paciente : p
      );
      renderizarTabela();
      break;

    case "PACIENTE_REMOVIDO":
      pacientes = pacientes.filter((p) => p.id !== dados.id);
      renderizarTabela();
      break;

    default:
      console.warn("[WS] Tipo de mensagem desconhecido:", dados.tipo);
  }
}

// ─── Chamadas à API HTTP ────────────────────────────────────────────────────────

// Carrega a lista inicial de pacientes e as áreas disponíveis
async function carregarDados() {
  try {
    const resp = await fetch("/api/pacientes");
    const json = await resp.json();
    pacientes = json.pacientes;
    areas = json.areas;

    preencherSelectAreas(areas);
    renderizarTabela();
  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}

// Envia o formulário de cadastro para a API
async function cadastrarPaciente() {
  const nome = document.getElementById("nome").value.trim();
  const idade = document.getElementById("idade").value.trim();
  const area = document.getElementById("area").value;

  if (!nome || !idade || !area) {
    mostrarMensagem("Preencha todos os campos.", "erro");
    return;
  }

  const btn = document.getElementById("btn-cadastrar");
  btn.disabled = true;

  try {
    const resp = await fetch("/api/pacientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, idade, area }),
    });

    const json = await resp.json();

    if (json.sucesso) {
      mostrarMensagem(`✅ ${json.paciente.nome} adicionado à fila!`, "sucesso");
      // Limpa o formulário após cadastro bem-sucedido
      document.getElementById("nome").value = "";
      document.getElementById("idade").value = "";
      document.getElementById("area").value = "";
      // Nota: o WebSocket já vai atualizar a tabela via broadcast — não precisamos chamar nada aqui
    } else {
      mostrarMensagem(json.mensagem || "Erro ao cadastrar.", "erro");
    }
  } catch (err) {
    mostrarMensagem("Erro de conexão com o servidor.", "erro");
  } finally {
    btn.disabled = false;
  }
}

// Atualiza o status de um paciente via API
async function atualizarStatus(id, novoStatus) {
  try {
    const resp = await fetch(`/api/pacientes/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });

    const json = await resp.json();
    if (!json.sucesso) {
      alert("Erro: " + json.mensagem);
    }
    // O WebSocket vai atualizar a tabela para todos via broadcast
  } catch (err) {
    alert("Erro de conexão ao atualizar status.");
  }
}

// Remove um paciente permanentemente
async function removerPaciente(id, nome) {
  if (!confirm(`Remover "${nome}" permanentemente?`)) return;

  try {
    const resp = await fetch(`/api/pacientes/${id}`, { method: "DELETE" });
    const json = await resp.json();
    if (!json.sucesso) alert("Erro: " + json.mensagem);
  } catch (err) {
    alert("Erro de conexão ao remover.");
  }
}

// ─── Renderização da tabela ─────────────────────────────────────────────────────

function renderizarTabela() {
  const filtroArea = document.getElementById("filtro-area").value;
  const filtroStatus = document.getElementById("filtro-status").value;

  // Filtra a lista com base nos selects de filtro
  let lista = pacientes.filter((p) => {
    const passaArea = !filtroArea || p.area === filtroArea;
    const passaStatus = !filtroStatus || p.status === filtroStatus;
    return passaArea && passaStatus;
  });

  atualizarContadores();

  const corpo = document.getElementById("corpo-tabela");

  if (lista.length === 0) {
    corpo.innerHTML = `<tr><td colspan="6" class="vazio">Nenhum paciente encontrado.</td></tr>`;
    return;
  }

  corpo.innerHTML = lista.map((p) => `
    <tr>
      <td><strong>${escapeHtml(p.nome)}</strong></td>
      <td>${p.idade} anos</td>
      <td>${escapeHtml(p.area)}</td>
      <td>${formatarHorario(p.horarioCadastro)}</td>
      <td>${badgeStatus(p.status)}</td>
      <td><div class="acoes">${botoesAcao(p)}</div></td>
    </tr>
  `).join("");
}

// Gera os botões de ação conforme o status atual do paciente
// As transições seguem: Em Espera → Em Atendimento → Atendido/Cancelado
function botoesAcao(p) {
  const btns = [];

  if (p.status === "Em Espera") {
    btns.push(`<button class="btn-acao btn-chamar" onclick="atualizarStatus('${p.id}', 'Em Atendimento')">📞 Chamar</button>`);
    btns.push(`<button class="btn-acao btn-cancelar" onclick="atualizarStatus('${p.id}', 'Cancelado')">✖ Cancelar</button>`);
  }

  if (p.status === "Em Atendimento") {
    btns.push(`<button class="btn-acao btn-concluir" onclick="atualizarStatus('${p.id}', 'Atendido')">✔ Concluir</button>`);
    btns.push(`<button class="btn-acao btn-cancelar" onclick="atualizarStatus('${p.id}', 'Cancelado')">✖ Cancelar</button>`);
  }

  if (p.status === "Atendido" || p.status === "Cancelado") {
    btns.push(`<button class="btn-acao btn-remover" onclick="removerPaciente('${p.id}', '${escapeHtml(p.nome)}')">🗑 Remover</button>`);
  }

  return btns.join("");
}

function atualizarContadores() {
  const contagens = {
    "Em Espera": 0,
    "Em Atendimento": 0,
    "Atendido": 0,
    "Cancelado": 0,
  };
  pacientes.forEach((p) => { if (contagens[p.status] !== undefined) contagens[p.status]++; });

  document.getElementById("contadores").innerHTML = `
    <span class="contador-item contador-espera">⏳ Espera: ${contagens["Em Espera"]}</span>
    <span class="contador-item contador-atendimento">🩺 Atendendo: ${contagens["Em Atendimento"]}</span>
    <span class="contador-item contador-atendido">✅ Atendidos: ${contagens["Atendido"]}</span>
    <span class="contador-item contador-cancelado">✖ Cancelados: ${contagens["Cancelado"]}</span>
  `;
}

// ─── Utilitários ───────────────────────────────────────────────────────────────

function preencherSelectAreas(areas) {
  const selectArea = document.getElementById("area");
  const selectFiltro = document.getElementById("filtro-area");

  selectArea.innerHTML = `<option value="">Selecione a área...</option>` +
    areas.map((a) => `<option value="${a}">${a}</option>`).join("");

  selectFiltro.innerHTML = `<option value="">Todas as áreas</option>` +
    areas.map((a) => `<option value="${a}">${a}</option>`).join("");
}

function badgeStatus(status) {
  const classes = {
    "Em Espera": "badge-espera",
    "Em Atendimento": "badge-atendimento",
    "Atendido": "badge-atendido",
    "Cancelado": "badge-cancelado",
  };
  return `<span class="badge ${classes[status] || ""}">${status}</span>`;
}

function atualizarIndicadorWS(estado) {
  const el = document.getElementById("ws-status");
  const texto = document.getElementById("ws-texto");
  el.className = "ws-status " + estado;
  const labels = { conectando: "Conectando...", conectado: "Conectado", desconectado: "Desconectado" };
  texto.textContent = labels[estado] || estado;
}

// Mostra mensagem de feedback abaixo do formulário
function mostrarMensagem(texto, tipo) {
  const el = document.getElementById("mensagem-cadastro");
  el.textContent = texto;
  el.className = `mensagem ${tipo}`;
  setTimeout(() => { el.className = "mensagem oculto"; }, 4000);
}

function formatarHorario(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Previne XSS ao inserir texto do usuário diretamente no HTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── Inicialização ──────────────────────────────────────────────────────────────

carregarDados();   // Carrega dados iniciais via HTTP
conectarWS();      // Abre a conexão WebSocket para atualizações em tempo real

// Permite submeter o formulário com Enter
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.closest("#secao-cadastro")) cadastrarPaciente();
});
