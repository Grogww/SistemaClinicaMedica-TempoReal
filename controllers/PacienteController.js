const PacienteModel = require("../models/PacienteModel");

// O broadcastFn é injetado pelo server.js quando as rotas são registradas.
// Isso mantém o Controller desacoplado do WebSocket.
let broadcastFn = () => {};

function setBroadcast(fn) {
  broadcastFn = fn;
}

// Retorna lista de pacientes + areas existentes + status possiveis
function listar(req, res) {
  try {
    const pacientes = PacienteModel.listarPacientes();
    res.json({
      sucesso: true,
      pacientes,
      areas: PacienteModel.AREAS,
      status: PacienteModel.STATUS,
    });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: "Erro ao listar pacientes." });
  }
}

// Cadastra cliente e envia para clientes via broadcast
function cadastrar(req, res) {
  const { nome, idade, area } = req.body;

  // Validações básicas
  if (!nome || !idade || !area) {
    return res.status(400).json({ sucesso: false, mensagem: "Campos nome, idade e area são obrigatórios." });
  }
  if (Number(idade) < 0 || Number(idade) > 150) {
    return res.status(400).json({ sucesso: false, mensagem: "Idade inválida." });
  }
  if (!PacienteModel.AREAS.includes(area)) {
    return res.status(400).json({ sucesso: false, mensagem: "Área médica inválida." });
  }

  try {
    const paciente = PacienteModel.cadastrarPaciente({ nome, idade, area });

    // Notifica em tempo real via ws/broadcast
    broadcastFn({ tipo: "PACIENTE_CADASTRADO", paciente });

    res.status(201).json({ sucesso: true, paciente });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: "Erro ao cadastrar paciente." });
  }
}

// Atualiza apenas o status de paciente
function atualizarStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  // Verifica se o status enviado é um dos valores permitidos
  const statusValidos = Object.values(PacienteModel.STATUS);
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ sucesso: false, mensagem: "Status inválido." });
  }

  try {
    const paciente = PacienteModel.atualizarStatus(id, status);

    if (!paciente) {
      return res.status(404).json({ sucesso: false, mensagem: "Paciente não encontrado." });
    }

    // Notifica em tempo real: o status de um paciente mudou
    broadcastFn({ tipo: "STATUS_ATUALIZADO", paciente });

    res.json({ sucesso: true, paciente });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: "Erro ao atualizar status." });
  }
}

// Deleta um paciente completamente do sistema
function remover(req, res) {
  const { id } = req.params;

  try {
    const removido = PacienteModel.removerPaciente(id);

    if (!removido) {
      return res.status(404).json({ sucesso: false, mensagem: "Paciente não encontrado." });
    }

    // Notifica em tempo real: um paciente foi removido
    broadcastFn({ tipo: "PACIENTE_REMOVIDO", id });

    res.json({ sucesso: true, mensagem: "Paciente removido com sucesso." });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: "Erro ao remover paciente." });
  }
}

module.exports = { listar, cadastrar, atualizarStatus, remover, setBroadcast };
