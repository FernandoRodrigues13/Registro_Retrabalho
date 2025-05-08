// importar_produtos.js (versão para CSV com cabeçalhos simplificados E delimitador ;)
const fs = require('fs');
const csv = require('csv-parser'); // Certifique-se de ter instalado: npm install csv-parser
const sqlite3 = require('sqlite3').verbose();

const DB_FILE = 'database.db';
const CSV_FILE_PATH = './meus_produtos.csv'; // <<< CONFIRME O NOME DO SEU ARQUIVO CSV CORRIGIDO

if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`!!! ERRO: Arquivo CSV não encontrado em: ${CSV_FILE_PATH}`);
    console.error("Por favor, verifique o caminho e o nome do arquivo.");
    process.exit(1);
}

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('!!! ERRO ao conectar ao DB para importação:', err.message);
    return;
  }
  console.log(`--- Conectado ao DB '${DB_FILE}' para importação ---`);
});

let produtosImportadosComSucesso = 0;
let produtosComErroFormatoOuDados = 0;
let produtosDuplicadosIgnorados = 0;

const createTableSql = `
  CREATE TABLE IF NOT EXISTS produtos (
    op TEXT PRIMARY KEY,
    codEntrada TEXT UNIQUE NOT NULL,
    codSaida TEXT,
    descricao TEXT NOT NULL,
    cliente TEXT,
    beneficiamento TEXT,
    setor TEXT,
    pesoUnitario TEXT,
    unidade TEXT,
    valorUnitario REAL NOT NULL
  );
`;

db.run(createTableSql, (err) => {
    if (err) {
        console.error("Erro ao verificar/criar tabela produtos:", err.message);
        db.close((closeErr) => {
            if (closeErr) console.error('Erro ao fechar DB após falha na criação da tabela:', closeErr.message);
        });
        return;
    }
    console.log("Tabela 'produtos' verificada/criada com sucesso.");
    iniciarImportacao();
});

function iniciarImportacao() {
  const produtosParaInserir = [];
  let linhaAtual = 0; // Contador de linhas de dados (após o cabeçalho)

  console.log(`Iniciando leitura do arquivo CSV: ${CSV_FILE_PATH}`);

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv({
        separator: ';', // <<< GARANTINDO QUE O DELIMITADOR É PONTO E VÍRGULA
        mapHeaders: ({ header }) => header.trim().toLowerCase() // Normaliza cabeçalhos para minúsculas e sem espaços extras
    }))
    .on('data', (row) => {
      linhaAtual++;
      // 'row' agora terá chaves como 'op', 'codentrada', etc. (em minúsculas)

      // Debug: Logar a primeira linha de dados como o script a vê
      if (linhaAtual === 1) {
        console.log("Primeira linha de dados processada pelo script:", row);
      }

      const op = row.op;
      const codEntrada = row.codentrada;
      const descricao = row.descricao;
      const valorUnitarioStr = row.valorunitario;

      if (!op || !codEntrada || !descricao || valorUnitarioStr === undefined || valorUnitarioStr === null || String(valorUnitarioStr).trim() === '') {
        console.warn(`Linha de dados ${linhaAtual} | Registro ignorado (dados obrigatórios ausentes): OP=${op || 'N/A'}, CodEntrada=${codEntrada || 'N/A'}, Descricao=${descricao || 'N/A'}, ValorUnitario=${valorUnitarioStr === undefined || valorUnitarioStr === null ? 'N/A' : String(valorUnitarioStr).trim()}`);
        produtosComErroFormatoOuDados++;
        return;
      }

      const valorUnitarioNum = parseFloat(String(valorUnitarioStr).replace(',', '.'));
      if (isNaN(valorUnitarioNum) || valorUnitarioNum < 0) {
        console.warn(`Linha de dados ${linhaAtual} | Registro ignorado (valorUnitario inválido): OP=${op}, Valor Original=${valorUnitarioStr}, Valor Convertido=${valorUnitarioNum}`);
        produtosComErroFormatoOuDados++;
        return;
      }

      produtosParaInserir.push({
        op: String(op).trim(),
        codEntrada: String(codEntrada).trim().toUpperCase(),
        codSaida: row.codsaida ? String(row.codsaida).trim() : null,
        descricao: String(descricao).trim(),
        cliente: row.cliente ? String(row.cliente).trim() : null,
        beneficiamento: row.beneficiamento ? String(row.beneficiamento).trim() : null,
        setor: row.setor ? String(row.setor).trim() : null,
        pesoUnitario: row.pesounitario ? String(row.pesounitario).replace(',', '.').trim() : null,
        unidade: row.unidade ? String(row.unidade).trim() : null,
        valorUnitario: valorUnitarioNum
      });
    })
    .on('end', async () => {
      console.log(`Leitura do CSV concluída. ${produtosParaInserir.length} produtos válidos encontrados para tentativa de inserção (total de linhas de dados processadas: ${linhaAtual}).`);
      
      if (produtosParaInserir.length === 0) {
        if(produtosComErroFormatoOuDados > 0 || linhaAtual > 0) {
            console.log("Nenhum produto válido encontrado no CSV para importação após validações, ou todas as linhas continham erros.");
        } else {
            console.log("Arquivo CSV parece estar vazio ou não contém dados processáveis na primeira linha.");
        }
        db.close((closeErr) => {
            if (closeErr) console.error('Erro ao fechar DB (nenhum produto para importar):', closeErr.message);
            else console.log('Conexão com DB fechada.');
        });
        return;
      }

      console.log("Iniciando inserção no banco de dados...");
      db.serialize(async () => {
        try {
            await new Promise((resolve, reject) => {
                db.run("BEGIN TRANSACTION;", (err) => {
                    if (err) reject(err); else resolve();
                });
            });

            const sqlInsert = `
              INSERT INTO produtos
              (op, codEntrada, codSaida, descricao, cliente, beneficiamento, setor, pesoUnitario, unidade, valorUnitario)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const stmt = db.prepare(sqlInsert, (prepareErr) => {
                if(prepareErr){
                    console.error("Erro ao preparar statement SQL:", prepareErr.message);
                    db.run("ROLLBACK;", () => db.close());
                    return;
                }
            });

            for (const [index, produto] of produtosParaInserir.entries()) {
              try {
                await new Promise((resolve, reject) => {
                  stmt.run(
                    produto.op, produto.codEntrada, produto.codSaida, produto.descricao,
                    produto.cliente, produto.beneficiamento, produto.setor, produto.pesoUnitario,
                    produto.unidade, produto.valorUnitario,
                    function(err) {
                      if (err) {
                        if (err.message.toLowerCase().includes("unique constraint failed")) {
                          produtosDuplicadosIgnorados++;
                        } else {
                          console.error(`Erro ao inserir produto OP ${produto.op}, CodEntrada ${produto.codEntrada} (linha CSV aprox. ${index + 1}):`, err.message);
                          produtosComErroFormatoOuDados++;
                        }
                        resolve(); 
                      } else {
                        produtosImportadosComSucesso++;
                        resolve();
                      }
                    }
                  );
                });
                if ((index + 1) % 500 === 0) { // Log de progresso a cada 500 inserções
                    console.log(`Progresso: ${index + 1} de ${produtosParaInserir.length} produtos processados...`);
                }

              } catch (insertError) {
                console.error(`Erro inesperado no loop de inserção para OP ${produto.op}:`, insertError);
              }
            }
            
            await new Promise((resolve, reject) => {
                stmt.finalize((finalizeErr) => {
                    if (finalizeErr) {
                        console.error("Erro ao finalizar o statement:", finalizeErr.message);
                        reject(finalizeErr);
                    } else {
                        resolve();
                    }
                });
            });

            await new Promise((resolve, reject) => {
                db.run("COMMIT;", (commitErr) => {
                    if (commitErr) {
                        console.error("Erro ao commitar transação:", commitErr.message);
                        db.run("ROLLBACK;", () => reject(commitErr));
                    } else {
                        resolve();
                    }
                });
            });

            console.log('--- Importação Concluída ---');
            console.log(`Total de linhas de dados lidas do CSV: ${linhaAtual}`);
            console.log(`Produtos importados com sucesso: ${produtosImportadosComSucesso}`);
            console.log(`Produtos duplicados (OP/CodEntrada já existente, ignorados): ${produtosDuplicadosIgnorados}`);
            console.log(`Produtos com erro de formato/dados ou falha na inserção (não importados): ${produtosComErroFormatoOuDados}`);

        } catch (transactionError) {
            console.error("Erro durante a transação (BEGIN/COMMIT/ROLLBACK ou Preparo Statement):", transactionError.message);
            try {
                await new Promise(resolve => db.run("ROLLBACK;", () => resolve()));
            } catch (rollbackError) {
                console.error("Erro ao tentar rollback após falha na transação:", rollbackError.message);
            }
        } finally {
            db.close((closeErr) => {
              if (closeErr) console.error('Erro ao fechar DB após importação:', closeErr.message);
              else console.log('Conexão com DB fechada.');
            });
        }
      });
    })
    .on('error', (error) => {
        console.error("Erro crítico ao ler o arquivo CSV:", error);
        db.close((closeErr) => {
            if (closeErr) console.error('Erro ao fechar DB após erro de leitura do CSV:', closeErr.message);
        });
    });
}