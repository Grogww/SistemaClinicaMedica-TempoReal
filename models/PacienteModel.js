const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); //lib para gerar um id unico

const DATA_PATH = path.join(__dirname, "../data/controleAtendimento.json");

// Áreas médicas disponíveis na clínica
const AREAS = ["Ortopedia", 
                "Pediatria", 
                "Cardiologia", 
                "Clínica Geral", 
                "Dermatologia", 
                "Neurologia"];

// Status possíveis para um paciente
const STATUS = {
  ESPERA: "Em Espera",
  ATENDIMENTO: "Em Atendimento",
  ATENDIDO: "Atendido",
  CANCELADO: "Cancelado",
};

// Lê o arquivo JSON e retorna o objeto
function lerDados() {
  try {
    const conteudo = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(conteudo);
  } catch (err) {
    // Se o arquivo não existir ou estiver corrompido, começa do zero
    return { pacientes: [], ultimaAtualizacao: null };
  }
}

// Sobrescreve o arquivo JSON com os dados atualizados
function salvarDados(dados) {
  dados.ultimaAtualizacao = new Date().toISOString();
  fs.writeFileSync(DATA_PATH, JSON.stringify(dados, null, 2), "utf-8");
}

// Retorna todos os pacientes ordenados por horário de cadastro
function listarPacientes() {
  const dados = lerDados();
  return dados.pacientes.sort((a, b) => new Date(a.horarioCadastro) - new Date(b.horarioCadastro));
}

// Cadastra um novo paciente na fila de espera
function cadastrarPaciente({ nome, idade, area }) {
  const dados = lerDados();

  const novoPaciente = {
    id: uuidv4(),           // ID único gerado automaticamente - funciona tipo um GUID
    nome,
    idade: Number(idade),
    area,
    status: STATUS.ESPERA,  // começa Em Espera
    horarioCadastro: new Date().toISOString(),
    horarioAtendimento: null, // Setado quando o médico chamar
    horarioFim: null,         // Setado quando concluir ou cancelar
  };

  dados.pacientes.push(novoPaciente);
  salvarDados(dados);
  return novoPaciente;
}

// Atualiza o status de um paciente existente pelo ID
function atualizarStatus(id, novoStatus) {
  const dados = lerDados();
  const index = dados.pacientes.findIndex((p) => p.id === id);

  if (index === -1) return null; // Paciente não encontrado

  const paciente = dados.pacientes[index];
  paciente.status = novoStatus;

  // Registra os horários automaticamente conforme a transição de status
  if (novoStatus === STATUS.ATENDIMENTO) {
    paciente.horarioAtendimento = new Date().toISOString();
  } else if (novoStatus === STATUS.ATENDIDO || novoStatus === STATUS.CANCELADO) {
    paciente.horarioFim = new Date().toISOString();
  }

  dados.pacientes[index] = paciente;
  salvarDados(dados);
  return paciente;
}

// Remove um paciente pelo ID 
function removerPaciente(id) {
  const dados = lerDados();
  const index = dados.pacientes.findIndex((p) => p.id === id);
  if (index === -1) return false;

  dados.pacientes.splice(index, 1);
  salvarDados(dados);
  return true;
}

module.exports = { listarPacientes, cadastrarPaciente, atualizarStatus, removerPaciente, AREAS, STATUS };
