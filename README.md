# Relatório Técnico — Sistema de Controle de Atendimento Clínico

**Disciplina:** Redes de Computadores / Programação Web  
**Tema escolhido:** Controle de atendimento médico (Clínica)  
**Estratégia de comunicação:** WebSocket  
**Tecnologias:** Node.js, Express, ws, HTML/CSS/JS  

---

## 1. Introdução

Este documento descreve o desenvolvimento de um sistema web de controle de atendimento para uma clínica médica, com foco em comunicação em tempo real entre múltiplos usuários simultâneos. O sistema permite que a recepção cadastre pacientes em uma fila de espera e que os médicos acompanhem e atualizem o status dos atendimentos, com o quadro se atualizando automaticamente para todos os usuários conectados sem necessidade de recarregar a página.

O problema central que motivou a escolha da estratégia de comunicação é o seguinte: em um ambiente clínico real, a recepção e os consultórios precisam enxergar o mesmo estado da fila ao mesmo tempo. Qualquer atraso ou inconsistência nessa sincronização pode causar conflitos, como dois médicos chamando o mesmo paciente ou a recepção desconhecer que um atendimento foi encerrado. Esse cenário exige uma solução de atualização instantânea e bidirecional, que é exatamente o que o WebSocket oferece.

---

## 2. Estratégia Escolhida: WebSocket

A estratégia adotada foi **WebSocket**, implementada com a biblioteca `ws` no backend Node.js. O protocolo WebSocket estabelece um canal de comunicação **full-duplex e persistente** entre o servidor e cada cliente. Diferentemente do HTTP tradicional, onde o cliente sempre inicia a conversa e o servidor só responde, no WebSocket a conexão é mantida aberta após o handshake inicial, e tanto o servidor quanto o cliente podem enviar mensagens a qualquer momento, de forma independente.

Na prática, o fluxo funciona da seguinte maneira: quando qualquer evento relevante ocorre no sistema — um paciente sendo cadastrado, ou tendo seu status alterado — o servidor envia imediatamente uma mensagem para **todos os clientes conectados** ao mesmo tempo, por meio de um mecanismo chamado *broadcast*. Cada browser recebe essa mensagem via `ws.onmessage` e atualiza sua interface localmente, sem precisar fazer nenhuma requisição adicional ao servidor.

---

## 3. Comparativo entre as Três Estratégias

Para justificar adequadamente a escolha do WebSocket, é necessário entender como as três abordagens se diferenciam em conceito e comportamento.

**HTTP Polling** é a abordagem mais simples: o cliente usa `setInterval()` para enviar uma requisição ao servidor a cada N segundos, perguntando se há novidades. O servidor responde imediatamente com o estado atual, independente de haver ou não mudanças. A desvantagem é que a maior parte das requisições é desperdiçada — se o intervalo for de 5 segundos e uma atualização ocorrer 1 segundo após a última requisição, ela só será vista 4 segundos depois. Além disso, o tráfego de rede é constante mesmo quando não há nada novo acontecendo, o que é ineficiente.

**Long Polling** resolve parcialmente esse problema: o cliente faz uma requisição e o servidor a mantém aberta (sem responder) até que haja uma atualização disponível. Quando algo muda, o servidor responde, o cliente processa a resposta e imediatamente abre uma nova requisição para aguardar a próxima mudança. Isso elimina o problema de requisições desnecessárias e aproxima o comportamento do tempo real, mas ainda é uma simulação — cada "atualização" exige uma nova conexão HTTP, o que gera overhead de cabeçalhos e latência de reconexão.

**WebSocket** elimina esse overhead completamente. O handshake ocorre uma única vez, e a partir daí a conexão permanece aberta com custo praticamente zero de manutenção. As atualizações chegam ao cliente em milissegundos a partir do momento em que ocorrem no servidor, sem nenhuma requisição intermediária. A tabela abaixo resume as diferenças:

| Característica | HTTP Polling | Long Polling | WebSocket |
|---|---|---|---|
| Protocolo | HTTP | HTTP | WS (baseado em TCP) |
| Conexão | Nova a cada intervalo | Nova a cada resposta | Persistente |
| Iniciativa do servidor | ❌ Não | ❌ Não | ✅ Sim |
| Latência de atualização | Alta (depende do intervalo) | Média | Muito baixa |
| Tráfego de overhead | Alto | Médio | Baixo |
| Complexidade de implementação | Baixa | Média | Média-alta |
| Escalabilidade com muitos usuários | Baixa | Média | Alta |

---

## 4. Por que o WebSocket é Adequado a Este Sistema

O sistema de controle de atendimento clínico apresenta três características que tornam o WebSocket especialmente adequado.

A primeira é a **necessidade de atualização instantânea**. Em um ambiente de saúde, atrasos de segundos na atualização do status de um paciente são inaceitáveis. Se um médico chama um paciente que já foi atendido por outro, ou a recepção não vê em tempo real que uma consulta terminou, isso gera retrabalho e prejuízo ao paciente. O WebSocket entrega as atualizações em tempo real genuíno, não simulado.

A segunda é a **natureza colaborativa em múltiplos pontos**. Diferentemente de um sistema onde apenas um usuário consulta dados, aqui temos pelo menos dois perfis simultâneos — recepção e médicos — que precisam enxergar o mesmo estado ao mesmo tempo. O mecanismo de *broadcast* do WebSocket é ideal para isso: quando qualquer mudança ocorre, todos os clientes conectados são notificados de uma só vez.

A terceira é a **frequência de eventos**. Em uma clínica com fluxo razoável de pacientes, o status da fila muda constantemente ao longo do dia. Usar HTTP Polling com intervalo de 5 segundos geraria centenas de requisições desnecessárias por hora; o WebSocket só trafega dados quando há algo novo.

---

## 5. Vantagens e Desvantagens do WebSocket

**Vantagens:**

A principal vantagem é a **latência mínima**, pois o servidor notifica os clientes assim que o evento ocorre, sem espera. Combinado com isso, o **tráfego é eficiente**: após o handshake inicial, as mensagens WebSocket têm um overhead muito menor do que requisições HTTP completas (sem cabeçalhos repetidos). A arquitetura também **escala bem com múltiplos usuários**: adicionar mais clientes não aumenta o número de requisições ao servidor, apenas o número de conexões abertas. Por fim, o WebSocket é **bidirecional por natureza** — o servidor pode enviar dados sem ser solicitado, o que abre possibilidade para funcionalidades futuras como notificações e alertas proativos.

**Desvantagens:**

O WebSocket exige que o servidor mantenha **conexões abertas com todos os clientes**, o que consome memória proporcional ao número de usuários simultâneos. Em servidores com recursos limitados ou com dezenas de milhares de conexões, isso pode se tornar um gargalo. Outro ponto é que o protocolo WebSocket **não é nativamente suportado por proxies e firewalls mais antigos**, o que pode causar problemas em certos ambientes corporativos ou hospitalares com infraestrutura legada. A **reconexão automática** precisa ser implementada pelo desenvolvedor (como foi feito no `app.js`), pois o protocolo não a garante por padrão. Por fim, depurar comunicação WebSocket é ligeiramente mais complexo do que depurar chamadas HTTP, que são nativas no painel de rede dos navegadores.

---

## 6. Quando NÃO Usar WebSocket

O WebSocket não é a solução ideal em todos os cenários. Ele seria inadequado nas seguintes situações:

Em sistemas onde as atualizações são **raras ou previsíveis**, como um relatório gerado uma vez ao dia ou um placar de campeonato que muda algumas vezes por partida, a complexidade adicional do WebSocket não se justifica — HTTP Polling com um intervalo adequado seria mais simples e igualmente eficaz.

Para **operações pontuais e sem necessidade de sincronização entre usuários**, como um formulário de cadastro, uma consulta de CEP ou uma busca, o modelo requisição-resposta do HTTP é mais apropriado e mais simples de rastrear, autenticar e cachear.

Em ambientes com **infraestrutura restritiva** — como hospitais com firewalls corporativos rígidos ou proxies que interrompem conexões longas — o WebSocket pode ser bloqueado ou instável. Nesses cenários, Long Polling seria uma alternativa mais resiliente.

Por fim, se o sistema precisar de **autenticação stateless por requisição** (como JWT validado a cada chamada) ou integração com sistemas que só suportam HTTP (como webhooks ou algumas APIs externas), o modelo WebSocket exigiria adaptações arquiteturais que nem sempre valem o esforço.

---

## 7. Arquitetura da Solução

O sistema foi desenvolvido seguindo o padrão **MVC (Model-View-Controller)**, com frontend e backend colocalizados na mesma aplicação Node.js. A separação de responsabilidades foi implementada da seguinte forma:

O arquivo `server.js` funciona como ponto de entrada e tem uma única responsabilidade: instanciar os serviços e conectar as camadas. É aqui que ocorre uma decisão arquitetural importante: em vez de usar `app.listen()` diretamente, o servidor HTTP é criado manualmente com `http.createServer(app)`. Isso é necessário porque o servidor WebSocket precisa se acoplar ao mesmo objeto de servidor HTTP para funcionar na mesma porta, o que não seria possível com `app.listen()`.

A camada **Model** (`PacienteModel.js`) é responsável exclusivamente por ler e escrever no arquivo `controleAtendimento.json`. Ela define as estruturas de dados, os status possíveis e as áreas médicas, e não possui nenhum conhecimento de HTTP ou WebSocket.

A camada **Controller** (`PacienteController.js`) contém a lógica de negócio: valida os dados recebidos, chama o Model e decide o que responder. Uma decisão de design relevante aqui é o uso de **injeção de dependência** para o broadcast: o Controller recebe a função `broadcast` do WebSocket como parâmetro, em vez de importar o módulo WebSocket diretamente. Isso mantém o Controller desacoplado da camada de comunicação em tempo real, facilitando testes e futuras trocas de estratégia.

A camada **Routes** (`pacienteRoutes.js`) apenas mapeia as URLs HTTP para os métodos do Controller. O verbo `PATCH` foi escolhido (em vez de `PUT`) para a atualização de status porque o `PATCH` semânticamente indica uma **atualização parcial** de um recurso, enquanto o `PUT` implica substituição completa. Como só o campo `status` é alterado, `PATCH` é mais correto semanticamente.

O módulo **WebSocket** (`wsHandler.js`) gerencia as conexões abertas usando um `Set` de clientes, o que facilita a adição e remoção eficiente sem necessidade de buscar índices. Ele implementa logs de conexão e desconexão (atendendo ao requisito bônus do enunciado) e expõe a função `broadcast` que serializa os dados em JSON e os envia para todos os clientes com conexão aberta.

O diagrama abaixo representa o fluxo de uma atualização de status:

```
[Médico no Browser]
      |
      | PATCH /api/pacientes/:id/status
      v
[pacienteRoutes.js] ──→ [PacienteController.js] ──→ [PacienteModel.js]
                                  |                        |
                                  |              Salva no JSON
                                  |
                                  | broadcast({ tipo: "STATUS_ATUALIZADO", paciente })
                                  v
                          [wsHandler.js]
                          /     |      \
                         /      |       \
              [Browser 1]  [Browser 2]  [Browser 3]
              (Recepção)   (Médico A)   (Médico B)
              Atualiza     Atualiza     Atualiza
              tabela       tabela       tabela
```

### Estrutura de Diretórios

```
clinic-ws/
├── server.js                      ← Entry point: Express + WebSocket na mesma porta
├── package.json
├── data/
│   └── controleAtendimento.json   ← Persistência local em JSON
├── models/
│   └── PacienteModel.js           ← Leitura, escrita e estrutura dos dados
├── controllers/
│   └── PacienteController.js      ← Lógica de negócio e validação
├── routes/
│   └── pacienteRoutes.js          ← Mapeamento de endpoints HTTP
├── websocket/
│   └── wsHandler.js               ← Gerenciamento de conexões e broadcast
└── public/                        ← Frontend servido estaticamente pelo Express
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

---

## 8. Referência da API REST

| Método | Rota | Descrição | Corpo da Requisição |
|--------|------|-----------|---------------------|
| `GET` | `/api/pacientes` | Lista todos os pacientes + áreas e status disponíveis | — |
| `POST` | `/api/pacientes` | Cadastra novo paciente na fila | `{ nome, idade, area }` |
| `PATCH` | `/api/pacientes/:id/status` | Atualiza o status de um paciente | `{ status }` |
| `DELETE` | `/api/pacientes/:id` | Remove um paciente permanentemente | — |
| `GET` | `/api/status` | Retorna status do servidor e número de clientes WS conectados | — |

### Eventos WebSocket (servidor → clientes)

| Tipo do Evento | Quando é disparado | Dados enviados |
|---|---|---|
| `CONEXAO_OK` | Imediatamente após o cliente conectar | `{ timestamp }` |
| `PACIENTE_CADASTRADO` | Após um POST bem-sucedido | `{ paciente }` |
| `STATUS_ATUALIZADO` | Após um PATCH bem-sucedido | `{ paciente }` (objeto completo atualizado) |
| `PACIENTE_REMOVIDO` | Após um DELETE bem-sucedido | `{ id }` |

### Ciclo de Status dos Pacientes

```
[Em Espera] ──→ [Em Atendimento] ──→ [Atendido]
     │                  │
     └──────────────────┴──→ [Cancelado]
```

---

## 9. Instruções de Execução

**Pré-requisito:** Node.js v18 ou superior instalado.

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar o servidor
npm start

# Modo desenvolvimento (reinicia automaticamente ao salvar arquivos)
npm run dev
```

O sistema estará disponível em `http://localhost:3000`. Para testar a sincronização em tempo real, abra duas abas do navegador simultaneamente e observe que qualquer alteração feita em uma aba é refletida instantaneamente na outra, sem recarregar a página.

---

## 10. Conclusão

O WebSocket se mostrou a estratégia mais adequada para este sistema por combinar atualização instantânea com eficiência de tráfego em um cenário de múltiplos usuários simultâneos com necessidade de estado compartilhado. A arquitetura MVC adotada garantiu separação clara de responsabilidades entre as camadas de dados, lógica de negócio e comunicação, tornando o código mais legível, testável e extensível para evoluções futuras — como a substituição do arquivo JSON por um banco de dados relacional ou a adição de autenticação por perfil de usuário.