// Importa os módulos
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

// Cria a aplicação Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Essenciais
app.use(cors());
app.use(express.json());

// Conexão com o Banco de Dados SQLite
const DB_FILE = "database.db";
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error("!!! ERRO conectar DB:", err.message);
    process.exit(1);
  } else {
    console.log(`--- Conectado DB '${DB_FILE}' ---`);
    criarTabelas();
  }
});

// Função para Criar Tabelas
function criarTabelas() {
  /* ... (código existente, com setor e beneficiamento em historico_retrabalho) ... */ console.log(
    "Verificando/Criando tabelas..."
  );
  const cTP = ` CREATE TABLE IF NOT EXISTS produtos ( op TEXT PRIMARY KEY,codEntrada TEXT UNIQUE NOT NULL,codSaida TEXT, descricao TEXT NOT NULL,cliente TEXT,beneficiamento TEXT,setor TEXT, pesoUnitario TEXT,unidade TEXT,valorUnitario REAL NOT NULL ); `;
  const cTH = ` CREATE TABLE IF NOT EXISTS historico_retrabalho ( id INTEGER PRIMARY KEY AUTOINCREMENT,timestamp TEXT NOT NULL, numOP TEXT NOT NULL,codEntrada TEXT NOT NULL,descricao TEXT, setor TEXT,beneficiamento TEXT,quantidade INTEGER NOT NULL, custo REAL,FOREIGN KEY (numOP) REFERENCES produtos (op) ); `;
  db.serialize(() => {
    db.run(cTP, (e) => {
      if (e) console.error("Erro Tabela Produtos:", e.message);
      else console.log("Tabela 'produtos' OK.");
    });
    db.run(cTH, (e) => {
      if (e) console.error("Erro Tabela Histórico:", e.message);
      else {
        console.log(
          "Tabela 'historico_retrabalho' OK."
        ); /* inserirDadosIniciaisProdutosSeVazio(); */
      }
    });
  });
}
// Função para inserir dados iniciais
function inserirDadosIniciaisProdutosSeVazio() {
  /* ... (código existente) ... */
}

// --- Rotas da API (Endpoints) ---
app.get("/", (req, res) => {
  res.status(200).send("<h1>Servidor Funcionando!</h1>");
});

// Rota: Buscar produto pela OP
app.get("/api/produtos/op/:op", (req, res) => {
  const nOP = req.params.op;
  console.log(`[API] GET /op/${nOP}`);
  if (!nOP) return res.status(400).json({ message: "OP obrigatória." });
  const opP = String(nOP).trim();
  const sql = `SELECT * FROM produtos WHERE op = ?`;
  console.log(`[API] SQL: ${sql} ['${opP}']`);
  db.get(sql, [opP], (e, r) => {
    if (e) {
      console.error("[API] Erro DB op:", e.message);
      return res.status(500).json({ message: "Erro busca produto." });
    }
    if (r) {
      console.log("[API] Prod encontrado:", r);
      res.status(200).json(r);
    } else {
      console.log("[API] Prod 404:", opP);
      res.status(404).json({ message: `OP '${opP}' não encontrada.` });
    }
  });
});

// Rota: Registrar retrabalho
app.post("/api/retrabalhos", (req, res) => {
  console.log("---");
  console.log("[API] POST /retrabalhos");
  console.log("[API] Body:", req.body);
  const {
    timestamp,
    numOP,
    codEntrada,
    descricao,
    setor,
    beneficiamento,
    quantidade,
    custo,
  } = req.body;
  console.log("[API] Extraído:", {
    timestamp,
    numOP,
    codEntrada,
    quantidade,
    custo,
    setor,
    beneficiamento,
  });
  if (
    !timestamp ||
    !numOP ||
    !codEntrada ||
    quantidade === undefined ||
    custo === undefined ||
    custo === null
  ) {
    console.warn("[API] FALHA VAL 1");
    return res.status(400).json({ message: "Dados incompletos." });
  }
  const qN = Number(quantidade);
  const cN = Number(custo);
  console.log("[API] Numéricos:", { qN, cN });
  if (isNaN(qN) || qN <= 0 || isNaN(cN) || cN < 0) {
    console.warn(`[API] FALHA VAL 2: Qtd(${qN})/Custo(${cN})`);
    return res.status(400).json({ message: "Qtd/Custo inválido." });
  }
  console.log("[API] INSERT...");
  const sql = `INSERT INTO historico_retrabalho (timestamp,numOP,codEntrada,descricao,setor,beneficiamento,quantidade,custo) VALUES (?,?,?,?,?,?,?,?)`;
  const params = [
    timestamp,
    numOP,
    codEntrada,
    descricao || null,
    setor || null,
    beneficiamento || null,
    qN,
    cN,
  ];
  db.run(sql, params, function (e) {
    if (e) {
      console.error(`[API] ERRO SQLITE INSERT: ${e.code}-${e.message}`);
      console.error("SQL:", sql);
      console.error("PARAMS:", params);
      if (e.message.includes("FOREIGN KEY"))
        return res.status(400).json({ message: `OP '${numOP}' não existe.` });
      return res.status(500).json({ message: "Erro interno registro." });
    }
    console.log(`[API] Registro inserido ID: ${this.lastID}`);
    const reg = {
      id: this.lastID,
      timestamp,
      numOP,
      codEntrada,
      descricao,
      setor,
      beneficiamento,
      quantidade: qN,
      custo: cN,
    };
    res.status(201).json(reg);
  });
});

// Rota: Obter histórico (com filtro)
app.get("/api/retrabalhos", (req, res) => {
  const { dataInicio, dataFim } = req.query;
  console.log(
    `[API] GET /retrabalhos. Filtros: De=${dataInicio}, Até=${dataFim}`
  );
  let sql = `SELECT * FROM historico_retrabalho`;
  const params = [];
  if (dataInicio && dataFim) {
    sql += ` WHERE timestamp >= ? AND timestamp <= ?`;
    params.push(dataInicio + "T00:00:00");
    params.push(dataFim + "T23:59:59");
  } else if (dataInicio) {
    sql += ` WHERE timestamp >= ?`;
    params.push(dataInicio + "T00:00:00");
  } else if (dataFim) {
    sql += ` WHERE timestamp <= ?`;
    params.push(dataFim + "T23:59:59");
  }
  sql += ` ORDER BY timestamp DESC`;
  console.log(`[API] SQL Hist: ${sql}`, params);
  db.all(sql, params, (e, rows) => {
    if (e) {
      console.error("[API] Erro SQL hist:", e.message);
      return res.status(500).json({ message: "Erro busca histórico." });
    }
    console.log(`[API] Hist encontrado: ${rows.length}.`);
    res.status(200).json(rows);
  });
});

// Rota: Excluir registro
app.delete("/api/retrabalhos/:id", (req, res) => {
  const id = req.params.id;
  console.log(`[API] DELETE /retrabalhos/${id}`);
  const idN = parseInt(id, 10);
  if (isNaN(idN) || idN <= 0) {
    console.warn("[API] 400 ID inválido.");
    return res.status(400).json({ message: "ID inválido." });
  }
  const sql = `DELETE FROM historico_retrabalho WHERE id = ?`;
  db.run(sql, [idN], function (e) {
    if (e) {
      console.error("[API] Erro DELETE:", e.message);
      return res.status(500).json({ message: "Erro ao excluir." });
    }
    if (this.changes > 0) {
      console.log(`[API] Registro ID ${idN} excluído.`);
      res.status(200).json({ message: "Registro excluído." });
    } else {
      console.log(`[API] DELETE 404 ID ${idN}.`);
      res.status(404).json({ message: `Registro ID ${idN} não encontrado.` });
    }
  });
});

// <<< NOVA ROTA: Cadastrar um novo produto >>>
// Método: POST
// Caminho: /api/produtos
app.post("/api/produtos", (req, res) => {
  console.log("-----------------------------------------");
  console.log("[API] Recebida requisição POST para /api/produtos");
  console.log("[API] Corpo da Requisição (req.body):", req.body);

  // 1. Extrair e validar os dados do corpo da requisição
  const {
    OP,
    codEntrada,
    codSaida,
    descricao,
    cliente,
    beneficiamento,
    setor,
    pesoUnitario,
    unidade,
    valorUnitario,
  } = req.body;

  // Validações essenciais
  if (
    !OP ||
    !codEntrada ||
    !descricao ||
    valorUnitario === undefined ||
    valorUnitario === null
  ) {
    console.warn("[API] Erro 400: Dados incompletos para cadastro de produto.");
    return res
      .status(400)
      .json({
        message:
          "Nº OP, Cód. Entrada, Descrição e Valor Unitário são obrigatórios.",
      });
  }

  const valUnitNum = Number(valorUnitario);
  if (isNaN(valUnitNum) || valUnitNum < 0) {
    console.warn("[API] Erro 400: Valor Unitário inválido.");
    return res.status(400).json({ message: "Valor Unitário inválido." });
  }

  // 2. Verificar se OP ou CodEntrada já existem (simulação da verificação UNIQUE do DB)
  //    Em um banco SQL real com constraints UNIQUE, o próprio DB daria erro.
  //    Aqui fazemos uma verificação antes para dar uma mensagem mais amigável.
  const sqlCheck = `SELECT op FROM produtos WHERE op = ? OR codEntrada = ?`;
  db.get(
    sqlCheck,
    [OP.trim(), codEntrada.trim().toUpperCase()],
    (errCheck, rowCheck) => {
      if (errCheck) {
        console.error(
          "[API] Erro DB (verificar duplicidade):",
          errCheck.message
        );
        return res
          .status(500)
          .json({ message: "Erro ao verificar duplicidade do produto." });
      }
      if (rowCheck) {
        let msgErro = "";
        if (rowCheck.op === OP.trim()) {
          msgErro = `A OP '${OP.trim()}' já está cadastrada.`;
        } else {
          msgErro = `O Código de Entrada '${codEntrada
            .trim()
            .toUpperCase()}' já está cadastrado para outra OP.`;
        }
        console.warn(`[API] Erro 409: ${msgErro}`);
        return res.status(409).json({ message: msgErro }); // 409 Conflict
      }

      // 3. Se não houver duplicidade, preparar e executar o INSERT
      const sqlInsert = `
            INSERT INTO produtos
            (op, codEntrada, codSaida, descricao, cliente, beneficiamento, setor, pesoUnitario, unidade, valorUnitario)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
      const paramsInsert = [
        OP.trim(),
        codEntrada.trim().toUpperCase(),
        codSaida || null,
        descricao.trim(),
        cliente || null,
        beneficiamento || null,
        setor || null,
        pesoUnitario || null,
        unidade || null,
        valUnitNum,
      ];

      console.log("[API] Executando INSERT produto:", paramsInsert);
      db.run(sqlInsert, paramsInsert, function (errInsert) {
        // Usar function() para this.lastID (embora OP seja PK aqui)
        if (errInsert) {
          console.error(
            "[API] Erro ao inserir produto no DB:",
            errInsert.message
          );
          return res
            .status(500)
            .json({
              message: "Erro interno do servidor ao cadastrar produto.",
            });
        }

        // 4. Sucesso! Retorna o produto cadastrado (ou apenas uma mensagem de sucesso)
        console.log(
          `[API] Produto com OP ${OP.trim()} cadastrado com sucesso.`
        );
        // Monta o objeto do produto como ele foi salvo (ou como está em req.body)
        const produtoCriado = {
          op: OP.trim(), // OP é a chave primária, não há this.lastID para ela
          codEntrada: codEntrada.trim().toUpperCase(),
          codSaida: codSaida || null,
          descricao: descricao.trim(),
          cliente: cliente || null,
          beneficiamento: beneficiamento || null,
          setor: setor || null,
          pesoUnitario: pesoUnitario || null,
          unidade: unidade || null,
          valorUnitario: valUnitNum,
        };
        res.status(201).json(produtoCriado); // 201 Created
      });
    }
  );
});

// (Outras rotas)

// --- Iniciando o Servidor ---
// ... (código existente) ...

// Rota: Calcular Relatórios <<< ROTA ADICIONADA >>>
app.get("/api/relatorios", (req, res) => {
  const { dataInicio, dataFim } = req.query;
  console.log(
    `[API] GET /relatorios. Filtros: De=${dataInicio}, Até=${dataFim}`
  );
  let sqlHistorico = `SELECT codEntrada, setor, quantidade, custo FROM historico_retrabalho`;
  const params = [];
  if (dataInicio && dataFim) {
    sqlHistorico += ` WHERE timestamp >= ? AND timestamp <= ?`;
    params.push(dataInicio + "T00:00:00");
    params.push(dataFim + "T23:59:59");
  } else if (dataInicio) {
    sqlHistorico += ` WHERE timestamp >= ?`;
    params.push(dataInicio + "T00:00:00");
  } else if (dataFim) {
    sqlHistorico += ` WHERE timestamp <= ?`;
    params.push(dataFim + "T23:59:59");
  }
  console.log(`[API] SQL Hist p/ Relat: ${sqlHistorico}`, params);

  db.all(sqlHistorico, params, (err, rows) => {
    if (err) {
      console.error("[API] Erro DB (hist p/ relat):", err.message);
      return res.status(500).json({ message: "Erro buscar dados relatórios." });
    }
    console.log(`[API] ${rows.length} regs p/ cálculo relat.`);

    const freq = {},
      quant = {},
      sectFreq = {},
      costSect = {};
    let totalCost = 0;
    rows.forEach((r) => {
      const pK = r.codEntrada || "N/A";
      const sK = r.setor || "N/A";
      const cV = r.custo || 0;
      const qt = r.quantidade || 0;
      freq[pK] = (freq[pK] || 0) + 1;
      quant[pK] = (quant[pK] || 0) + qt;
      totalCost += cV;
      sectFreq[sK] = (sectFreq[sK] || 0) + 1;
      costSect[sK] = (costSect[sK] || 0) + cV;
    });
    const sFreq = Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([c, n]) => ({ codEntrada: c, count: n }));
    const sQuant = Object.entries(quant)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([c, s]) => ({ codEntrada: c, sum: s }));
    const sSect = Object.entries(sectFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([s, n]) => ({ sector: s, count: n }));
    const sCS = Object.entries(costSect)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([s, c]) => ({ sector: s, cost: c }));

    // <<< OBJETO DE RESPOSTA CORRIGIDO >>>
    const reportData = {
      totalCost: totalCost,
      topFrequency: sFreq,
      topQuantity: sQuant,
      topSectors: sSect, // Frequencia por Setor
      topSectorCost: sCS, // Custo por Setor
    };

    console.log("[API] Relatórios calculados:", reportData);
    res.status(200).json(reportData);
  });
});

// --- Iniciando o Servidor ---
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
  console.log(`Acesse http://localhost:${PORT}`);
});
// Tratamento de Encerramento
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) console.error("Erro fechar DB:", err.message);
    console.log("DB Fechado.");
    process.exit(0);
  });
});
