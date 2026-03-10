const express = require("express");
const router = express.Router();
const PacienteController = require("../controllers/PacienteController");

// GET /api/pacientes → Lista todos os pacientes (recepção e médicos consultam isso)
router.get("/", PacienteController.listar);

// POST /api/pacientes → Cadastra um novo paciente na fila de espera (recepção)
router.post("/", PacienteController.cadastrar);

// PATCH /api/pacientes/:id/status → Atualiza só o status do paciente (médico chama/conclui)
// Usamos PATCH (e não PUT) porque estamos atualizando apenas UM campo, não o objeto inteiro
router.patch("/:id/status", PacienteController.atualizarStatus);

// DELETE /api/pacientes/:id → Remove um paciente (cancelamento definitivo)
router.delete("/:id", PacienteController.remover);

module.exports = router;
