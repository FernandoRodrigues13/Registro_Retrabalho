// Espera todo o conteúdo HTML ser carregado
document.addEventListener('DOMContentLoaded', () => {
    // Tenta registrar plugins Chart.js
    try { if (typeof ChartDataLabels !== 'undefined') { Chart.register(ChartDataLabels); console.log("Plugin Datalabels OK."); } else { console.error("Plugin Datalabels não carregado."); } } catch (e) { console.error("Erro registro Datalabels:", e); }
    console.log("--- Iniciando script.js ---");

    // --- 1. Seleção de Elementos ---
    console.log("Selecionando elementos...");
    const formProduto = document.getElementById('form-produto'); const btnPrincipalAcao = document.getElementById('btn-principal-acao'); const inputNumOP = document.getElementById('num-op'); const inputCodEntrada = document.getElementById('cod-entrada'); const inputCodSaida = document.getElementById('cod-saida'); const inputDescricao = document.getElementById('descricao'); const inputCliente = document.getElementById('cliente'); const inputBeneficiamento = document.getElementById('beneficiamento'); const inputSetor = document.getElementById('setor'); const inputPesoUnitario = document.getElementById('peso-unitario'); const inputUnidade = document.getElementById('unidade'); const inputValorUnitario = document.getElementById('valor-unitario'); const inputQuantidadeRetrabalho = document.getElementById('quantidade-retrabalho'); const tbodyHistorico = document.getElementById('tbody-historico'); const listaMaisFrequentes = document.getElementById('lista-mais-frequentes'); const listaSetoresFrequentes = document.getElementById('lista-setores-frequentes'); const listaMaiorQuantidade = document.getElementById('lista-maior-quantidade'); const paragrafoCustoTotal = document.getElementById('paragrafo-custo-total'); const canvasFrequencia = document.getElementById('grafico-frequencia-produto'); const canvasCustoSetor = document.getElementById('grafico-custo-setor'); const canvasQuantidade = document.getElementById('grafico-quantidade-produto'); const inputBuscaHistorico = document.getElementById('busca-historico'); const btnExportarCSV = document.getElementById('btn-exportar-csv'); const inputFiltroInicio = document.getElementById('filtro-data-inicio'); const inputFiltroFim = document.getElementById('filtro-data-fim'); const btnFiltrarData = document.getElementById('btn-filtrar-data'); const btnLimparFiltroData = document.getElementById('btn-limpar-filtro-data');
    const checkboxModoCadastro = document.getElementById('modo-cadastro-checkbox');
    const inputsReadonlyToggle = [ inputCodEntrada, inputCodSaida, inputDescricao, inputCliente, inputBeneficiamento, inputSetor, inputPesoUnitario, inputUnidade, inputValorUnitario ];
    if (!formProduto || !inputNumOP || !tbodyHistorico || !inputBuscaHistorico || !btnExportarCSV || !inputFiltroInicio || !inputFiltroFim || !btnFiltrarData || !btnLimparFiltroData || !checkboxModoCadastro) { console.error("ERRO: Elementos essenciais!"); alert("Erro crítico ao carregar a página!"); return; } console.log("Elementos selecionados.");

    // --- 2. Estado da Aplicação ---
    let isCadastroMode = false;
    let chartInstanceFrequencia = null; let chartInstanceCustoSetor = null; let chartInstanceQuantidade = null;
    const API_BASE_URL = 'http://localhost:3000/api';

    // --- 3. Funções de Comunicação com o Backend (API Real) ---
    console.log("Definindo funções de comunicação com API Real...");

    async function apiObterHistorico(dataInicio = null, dataFim = null) {
        console.log(`API_REAL: Obtendo hist (De:${dataInicio},Até:${dataFim})...`);
        let url = `${API_BASE_URL}/retrabalhos`;
        const params = new URLSearchParams();
        if (dataInicio) params.append('dataInicio', dataInicio);
        if (dataFim) params.append('dataFim', dataFim);
        if (params.toString()) url += `?${params.toString()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            console.log(`API_REAL: Hist obtido (${data.length}).`);
            return data;
        } catch (error) {
            console.error("Erro ao buscar histórico do servidor:", error);
            alert(`Falha ao carregar histórico do servidor: ${error.message}`);
            return [];
        }
    }

    async function apiExcluirRegistro(id) {
        console.log(`API_REAL: Excluindo ID ${id}...`);
        try {
            const response = await fetch(`${API_BASE_URL}/retrabalhos/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Erro HTTP ${response.status}: ${errorData.message}`);
            }
            console.log("API_REAL: Registro excluído.");
            return { success: true };
        } catch (error) {
            console.error("Erro ao excluir registro:", error);
            alert(`Falha ao excluir registro: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async function apiCadastrarProduto(novoProduto) {
        console.log("API_REAL: Cadastrando produto...", novoProduto);
        try {
            const response = await fetch(`${API_BASE_URL}/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoProduto),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Erro HTTP ${response.status}`);
            }
            console.log("API_REAL: Produto cadastrado.", data);
            return { success: true, data: data };
        } catch (error) {
            console.error("Erro ao cadastrar produto:", error);
            alert(`Falha ao cadastrar produto: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async function apiCalcularRelatorios(dataInicio = null, dataFim = null) {
        console.log(`API_REAL: Calculando relat (De:${dataInicio},Até:${dataFim})...`);
        let url = `${API_BASE_URL}/relatorios`;
        const params = new URLSearchParams();
        if (dataInicio) params.append('dataInicio', dataInicio);
        if (dataFim) params.append('dataFim', dataFim);
        if (params.toString()) url += `?${params.toString()}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
            }
            const reportData = await response.json();
            console.log("API_REAL: Relatórios calculados.", reportData);
            return reportData;
        } catch (error) {
            console.error("Erro ao calcular relatórios:", error);
            alert(`Falha ao carregar dados para relatórios do servidor: ${error.message}`);
            return { totalCost: 0, topFrequency: [], topQuantity: [], topSectors: [], topSectorCost: [] };
        }
    }

    async function apiBuscarProdutoPorOP(op) {
        console.log(`API_REAL: Buscando produto por OP: "${op}"...`);
        if (!op) {
            console.warn("API_REAL: OP vazia, não buscando.");
            return null;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/produtos/op/${encodeURIComponent(op)}`);
            console.log(`API_REAL: Resposta Fetch busca OP: ${response.status}`);
            if (response.ok) {
                const produtoData = await response.json();
                return produtoData;
            } else if (response.status === 404) {
                alert("Nº OP não encontrado no banco de dados!");
                return null;
            } else {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Erro HTTP ${response.status}: ${errorData.message}`);
            }
        } catch (error) {
            console.error("Erro de comunicação ao buscar OP:", error);
            alert(`Erro ao buscar OP: ${error.message}`);
            return null;
        }
    }


    // --- 4. Funções de Interface ---
    console.log("Definindo funções de interface...");
    function preencherFormulario(dadosItem) {
        if (isCadastroMode && dadosItem) return;
        console.log("Preenchendo/Limpando Form:", dadosItem);
        inputCodEntrada.value = dadosItem?.codEntrada || "";
        inputCodSaida.value = dadosItem?.codSaida || "";
        inputDescricao.value = dadosItem?.descricao || "";
        inputCliente.value = dadosItem?.cliente || "";
        inputBeneficiamento.value = dadosItem?.beneficiamento || "";
        inputSetor.value = dadosItem?.setor || "";
        inputPesoUnitario.value = dadosItem?.pesoUnitario || "";
        inputUnidade.value = dadosItem?.unidade || "";
        inputValorUnitario.value = parseFloat(dadosItem?.valorUnitario || 0).toFixed(2);
        inputQuantidadeRetrabalho.value = "";
        if (dadosItem && !isCadastroMode) {
            inputQuantidadeRetrabalho.focus();
        } else if (isCadastroMode) {
            inputDescricao.focus();
        }
    }

    function toggleCadastroMode(ativar) {
        isCadastroMode = ativar;
        console.log(`Modo Cadastro: ${isCadastroMode}`);
        const qC = inputQuantidadeRetrabalho.closest('.campo-form');
        if (isCadastroMode) {
            btnPrincipalAcao.textContent = 'Salvar Novo Produto';
            btnPrincipalAcao.classList.add('modo-cadastro');
            inputNumOP.readOnly = false;
            inputNumOP.placeholder = 'Digite a NOVA OP';
            inputQuantidadeRetrabalho.disabled = true;
            if (qC) qC.style.opacity = '0.5';
            inputsReadonlyToggle.forEach(i => { i.readOnly = false; i.style.backgroundColor = ''; i.style.cursor = ''; });
            formProduto.reset();
            preencherFormulario(null);
            inputNumOP.focus();
            console.log("Interface: MODO CADASTRO ATIVADO.");
        } else {
            btnPrincipalAcao.textContent = 'Registrar Retrabalho';
            btnPrincipalAcao.classList.remove('modo-cadastro');
            inputNumOP.readOnly = false;
            inputNumOP.placeholder = '';
            inputQuantidadeRetrabalho.disabled = false;
            if (qC) qC.style.opacity = '1';
            inputsReadonlyToggle.forEach(i => { i.readOnly = true; i.style.backgroundColor = ''; i.style.cursor = ''; });
            formProduto.reset();
            preencherFormulario(null);
            inputNumOP.focus();
            console.log("Interface: MODO RETRABALHO ATIVADO.");
        }
    }

    function filtrarTabelaHistorico() {
        const termoBusca = inputBuscaHistorico.value.toLowerCase().trim();
        const linhas = tbodyHistorico.querySelectorAll('tr');
        let linhasVisiveis = 0;
        console.log(`Filtrando histórico por "${termoBusca}"`);
        linhas.forEach(linha => {
            if (linha.querySelector('.historico-vazio')) {
                linha.style.display = '';
                return;
            }
            const textoLinha = linha.textContent.toLowerCase();
            const corresponde = textoLinha.includes(termoBusca);
            linha.style.display = corresponde ? '' : 'none';
            if (corresponde) linhasVisiveis++;
        });
        console.log(`${linhasVisiveis} linhas visíveis após filtro.`);
    }

    async function renderizarTabelaHistorico() {
        console.log("Render Tabela: Buscando dados do backend...");
        tbodyHistorico.innerHTML = `<tr><td colspan="8" class="historico-vazio">Carregando histórico do servidor...</td></tr>`;
        btnExportarCSV.disabled = true;
        try {
            const dataInicio = inputFiltroInicio.value || null;
            const dataFim = inputFiltroFim.value || null;
            const dadosHistorico = await apiObterHistorico(dataInicio, dataFim);
            console.log(`Render Tabela: ${dadosHistorico.length} itens recebidos.`);
            tbodyHistorico.innerHTML = '';
            const numColunas = 8;
            const historicoDisponivel = dadosHistorico.length > 0;

            if (!historicoDisponivel) {
                const temFiltro = dataInicio || dataFim;
                tbodyHistorico.innerHTML = `<tr><td colspan="${numColunas}" class="historico-vazio">${temFiltro ? 'Nenhum registro encontrado para o período selecionado.' : 'Nenhum registro de retrabalho encontrado.'}</td></tr>`;
            } else {
                dadosHistorico.forEach((reg) => {
                    const tr = document.createElement('tr');
                    tr.setAttribute('data-db-id', reg.id);
                    const dataFormatada = new Date(reg.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const custoFormatado = (reg.custo || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    tr.innerHTML = `
                        <td>${dataFormatada}</td>
                        <td>${reg.codEntrada || ''}</td>
                        <td>${reg.descricao || ''}</td>
                        <td>${reg.setor || ''}</td>
                        <td>${reg.beneficiamento || ''}</td>
                        <td>${reg.quantidade}</td>
                        <td>${custoFormatado}</td>
                        <td><button class="btn-excluir-registro" data-id="${reg.id}" title="Excluir Registro">Excluir</button></td>
                    `;
                    tbodyHistorico.appendChild(tr);
                });
            }
            btnExportarCSV.disabled = !historicoDisponivel;
            console.log(`Tabela renderizada. Exportar CSV ${historicoDisponivel ? 'HABILITADO' : 'DESABILITADO'}.`);
            filtrarTabelaHistorico();
        } catch (e) {
            console.error("ERRO render Tabela:", e);
            tbodyHistorico.innerHTML = `<tr><td colspan="8" class="historico-vazio" style="color:red;">Erro ao carregar histórico do servidor. Tente novamente.</td></tr>`;
        }
    }

    function renderCharts(reportDataAPI, purposeIsToClear = false) {
        console.log("Fn renderCharts: Iniciando renderização de gráficos...");
        try { if (chartInstanceFrequencia instanceof Chart) chartInstanceFrequencia.destroy(); } catch (e) { console.warn("Aviso: Erro ao destruir gráfico Frequência", e); } finally { chartInstanceFrequencia = null; }
        try { if (chartInstanceCustoSetor instanceof Chart) chartInstanceCustoSetor.destroy(); } catch (e) { console.warn("Aviso: Erro ao destruir gráfico Custo Setor", e); } finally { chartInstanceCustoSetor = null; }
        try { if (chartInstanceQuantidade instanceof Chart) chartInstanceQuantidade.destroy(); } catch (e) { console.warn("Aviso: Erro ao destruir gráfico Quantidade", e); } finally { chartInstanceQuantidade = null; }

        if (typeof Chart === 'undefined' || typeof ChartDataLabels === 'undefined') {
            console.error("ERRO CRÍTICO: Chart.js ou ChartDataLabels não estão carregados. Gráficos não serão renderizados.");
            return;
        }

        const minhasCoresGrafico = {
            fernGreen:    { bg: 'rgba(88, 129, 87, 0.7)',  br: 'rgba(88, 129, 87, 1)'  },
            hunterGreen:  { bg: 'rgba(58, 90, 64, 0.7)',   br: 'rgba(58, 90, 64, 1)'   },
            sage:         { bg: 'rgba(163, 177, 138, 0.7)',br: 'rgba(163, 177, 138, 1)'},
        };

        if (!reportDataAPI) {
            if (!purposeIsToClear) {
                console.warn("AVISO: reportDataAPI é nulo. Gráficos não serão renderizados.");
            }
            [canvasFrequencia, canvasCustoSetor, canvasQuantidade].forEach(canvas => {
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.font = "14px Arial";
                    ctx.fillStyle = "#888";
                    ctx.textAlign = "center";
                    ctx.fillText("Sem dados para exibir.", canvas.width / 2, canvas.height / 2);
                }
            });
            return;
        }

        const hasData = reportDataAPI.topFrequency?.length || reportDataAPI.topQuantity?.length || reportDataAPI.topSectorCost?.length;
        if (!hasData) {
            console.warn("AVISO: Sem dados para gráficos no reportDataAPI.");
            [canvasFrequencia, canvasCustoSetor, canvasQuantidade].forEach(canvas => {
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.font = "14px Arial";
                    ctx.fillStyle = "#888";
                    ctx.textAlign = "center";
                    ctx.fillText("Sem dados para exibir.", canvas.width / 2, canvas.height / 2);
                }
            });
            return;
        }

        console.log("INFO: Renderizando gráficos com dados recebidos...");
        const { topFrequency = [], topQuantity = [], topSectorCost = [] } = reportDataAPI;
        
        // MODIFICAÇÃO AQUI: Opções comuns dos gráficos
        const commonChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { // Configurações do eixo X (horizontal)
                    ticks: {
                        font: { size: 11 },
                        color: '#344e41' // Brunswick Green para texto do eixo X
                    },
                    grid: {
                        display: false // Remove linhas de grade verticais
                    }
                },
                y: { // Configurações do eixo Y (vertical)
                    display: false, // <<< REMOVE O EIXO Y
                    beginAtZero: true,
                    // Linhas de grade e ticks do Y são automaticamente ocultadas se display: false
                }
            },
            plugins: {
                legend: {
                    display: false, // Legenda já estava oculta, mantendo
                    labels: { color: '#344e41' }
                },
                title: {
                    display: true,
                    padding: { top: 10, bottom: 30 },
                    font: { size: 18, weight: '500' },
                    color: '#344e41' // Brunswick Green para título
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'end',
                    offset: -2,
                    color: '#344e41', // Brunswick Green para os valores nas barras
                    font: {
                        size: 15,
                        weight: 'bold'
                    },
                    formatter: (value) => value === 0 ? '' : value
                }
            }
        };
        // FIM DA MODIFICAÇÃO commonChartOptions

        try {
            const ctxFreq = canvasFrequencia?.getContext('2d');
            if (ctxFreq && topFrequency.length > 0) {
                const labels = topFrequency.map(item => item.codEntrada);
                const data = topFrequency.map(item => item.count);
                chartInstanceFrequencia = new Chart(ctxFreq, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Registros', data: data,
                            backgroundColor: minhasCoresGrafico.fernGreen.bg,
                            borderColor: minhasCoresGrafico.fernGreen.br,
                            hoverBackgroundColor: minhasCoresGrafico.hunterGreen.bg,
                            hoverBorderColor: minhasCoresGrafico.hunterGreen.br,
                            borderWidth: 1
                        }]
                    },
                    options: { // Aplicar as opções comuns, sobrescrever o título específico
                        ...commonChartOptions,
                        plugins: {
                            ...commonChartOptions.plugins,
                            title: {
                                ...commonChartOptions.plugins.title,
                                text: 'Top 5 Produtos por Frequência de Retrabalho'
                            }
                            // Datalabels já estão configurados em commonChartOptions
                        }
                    }
                });
                console.log("SUCESSO: Gráfico de Frequência de Produto renderizado.");
            } else if (!ctxFreq) { console.warn("AVISO: Canvas para Gráfico de Frequência não encontrado."); }
            else { console.log("INFO: Sem dados para Gráfico de Frequência."); if(ctxFreq) { ctxFreq.clearRect(0,0,canvasFrequencia.width, canvasFrequencia.height); ctxFreq.font = "14px Arial"; ctxFreq.fillStyle = "#888"; ctxFreq.textAlign = "center"; ctxFreq.fillText("Sem dados.", canvasFrequencia.width/2, canvasFrequencia.height/2);}}
        } catch (e) { console.error("ERRO ao renderizar Gráfico de Frequência:", e); chartInstanceFrequencia = null; }

        try {
            const ctxCusto = canvasCustoSetor?.getContext('2d');
            if (ctxCusto && topSectorCost.length > 0) {
                const labels = topSectorCost.map(item => item.sector);
                const data = topSectorCost.map(item => item.cost);
                chartInstanceCustoSetor = new Chart(ctxCusto, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Custo Total (R$)', data: data,
                            backgroundColor: minhasCoresGrafico.hunterGreen.bg,
                            borderColor: minhasCoresGrafico.hunterGreen.br,
                            hoverBackgroundColor: minhasCoresGrafico.fernGreen.bg,
                            hoverBorderColor: minhasCoresGrafico.fernGreen.br,
                            borderWidth: 1
                        }]
                    },
                    options: { // Aplicar as opções comuns, sobrescrever título e formatador de datalabels/tooltip
                        ...commonChartOptions,
                        plugins: {
                            ...commonChartOptions.plugins,
                            title: {
                                ...commonChartOptions.plugins.title,
                                text: 'Custo Total de Retrabalho por Setor (Top 3)'
                            },
                            datalabels: { // Sobrescrever formatador para este gráfico específico
                                ...commonChartOptions.plugins.datalabels,
                                formatter: value => value === 0 ? '' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            },
                            tooltip: { // Adicionar callback para tooltip formatado como moeda
                                callbacks: {
                                    label: context => `${context.dataset.label || ''}: ${context.parsed.y.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                                }
                            }
                        }
                        // Não precisamos mais de scales.y.ticks.callback aqui, pois o eixo Y está oculto
                    }
                });
                console.log("SUCESSO: Gráfico de Custo por Setor renderizado.");
            } else if (!ctxCusto) { console.warn("AVISO: Canvas para Gráfico de Custo por Setor não encontrado."); }
             else { console.log("INFO: Sem dados para Gráfico Custo Setor."); if(ctxCusto) { ctxCusto.clearRect(0,0,canvasCustoSetor.width, canvasCustoSetor.height); ctxCusto.font = "14px Arial"; ctxCusto.fillStyle = "#888"; ctxCusto.textAlign = "center"; ctxCusto.fillText("Sem dados.", canvasCustoSetor.width/2, canvasCustoSetor.height/2);}}
        } catch (e) { console.error("ERRO ao renderizar Gráfico de Custo por Setor:", e); chartInstanceCustoSetor = null; }

        try {
            const ctxQuant = canvasQuantidade?.getContext('2d');
            if (ctxQuant && topQuantity.length > 0) {
                const labels = topQuantity.map(item => item.codEntrada);
                const data = topQuantity.map(item => item.sum);
                chartInstanceQuantidade = new Chart(ctxQuant, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Quantidade Total', data: data,
                            backgroundColor: minhasCoresGrafico.sage.bg,
                            borderColor: minhasCoresGrafico.sage.br,
                            hoverBackgroundColor: minhasCoresGrafico.fernGreen.bg,
                            hoverBorderColor: minhasCoresGrafico.fernGreen.br,
                            borderWidth: 1
                        }]
                    },
                    options: { // Aplicar as opções comuns, sobrescrever o título específico
                        ...commonChartOptions,
                        plugins: {
                            ...commonChartOptions.plugins,
                            title: {
                                ...commonChartOptions.plugins.title,
                                text: 'Top 5 Produtos por Quantidade Total Retrabalhada'
                            }
                            // Datalabels já estão configurados em commonChartOptions
                        }
                    }
                });
                console.log("SUCESSO: Gráfico de Quantidade de Produto renderizado.");
            } else if (!ctxQuant) { console.warn("AVISO: Canvas para Gráfico de Quantidade de Produto não encontrado."); }
             else { console.log("INFO: Sem dados para Gráfico Quantidade Produto."); if(ctxQuant) { ctxQuant.clearRect(0,0,canvasQuantidade.width, canvasQuantidade.height); ctxQuant.font = "14px Arial"; ctxQuant.fillStyle = "#888"; ctxQuant.textAlign = "center"; ctxQuant.fillText("Sem dados.", canvasQuantidade.width/2, canvasQuantidade.height/2);}}
        } catch (e) { console.error("ERRO ao renderizar Gráfico de Quantidade de Produto:", e); chartInstanceQuantidade = null; }
        console.log("Fn renderCharts: Finalizada.");
    }

    async function renderReportsAndCharts() {
        console.log(`Fn renderReportsAndCharts: Buscando dados de relatórios da API...`);
        listaMaisFrequentes.innerHTML = '<li>Carregando...</li>';
        listaSetoresFrequentes.innerHTML = '<li>Carregando...</li>';
        listaMaiorQuantidade.innerHTML = '<li>Carregando...</li>';
        paragrafoCustoTotal.textContent = 'Calculando...';
        renderCharts(null, true);

        let reportDataAPI = null;
        try {
            const dataInicio = inputFiltroInicio.value || null;
            const dataFim = inputFiltroFim.value || null;
            reportDataAPI = await apiCalcularRelatorios(dataInicio, dataFim);

            listaMaisFrequentes.innerHTML = ''; listaSetoresFrequentes.innerHTML = ''; listaMaiorQuantidade.innerHTML = '';

            if (!reportDataAPI) throw new Error("API de relatórios retornou dados nulos ou indefinidos.");

            const { totalCost = 0, topFrequency = [], topQuantity = [], topSectors = [] } = reportDataAPI;

            if (topFrequency.length > 0) topFrequency.forEach(({ codEntrada, count }) => { const li = document.createElement('li'); li.innerHTML = `<strong>${codEntrada}</strong> (${count} ocorrências)`; listaMaisFrequentes.appendChild(li); });
            else listaMaisFrequentes.innerHTML = '<li>Nenhum dado disponível.</li>';

            if (topSectors.length > 0) topSectors.forEach(({ sector, count }) => { const li = document.createElement('li'); li.innerHTML = `<strong>${sector}</strong> (${count} ocorrências)`; listaSetoresFrequentes.appendChild(li); });
            else listaSetoresFrequentes.innerHTML = '<li>Nenhum dado disponível.</li>';

            if (topQuantity.length > 0) topQuantity.forEach(({ codEntrada, sum }) => { const li = document.createElement('li'); li.innerHTML = `<strong>${codEntrada}</strong> (Total: ${sum} unidades)`; listaMaiorQuantidade.appendChild(li); });
            else listaMaiorQuantidade.innerHTML = '<li>Nenhum dado disponível.</li>';

            paragrafoCustoTotal.textContent = totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            console.log("Listas de relatórios renderizadas com dados da API.");
        } catch (error) {
            console.error("ERRO ao renderizar seções de relatórios:", error);
            listaMaisFrequentes.innerHTML = '<li>Erro ao carregar.</li>';
            listaSetoresFrequentes.innerHTML = '<li>Erro ao carregar.</li>';
            listaMaiorQuantidade.innerHTML = '<li>Erro ao carregar.</li>';
            paragrafoCustoTotal.textContent = 'Erro!';
            reportDataAPI = null;
        }

        try {
            renderCharts(reportDataAPI);
        } catch (e) {
            console.error("Erro crítico ao chamar renderCharts de dentro de renderReportsAndCharts:", e);
        }
    }

    async function exportToCSV() {
        console.log(">>> INFO: Iniciando exportação CSV...");
        btnExportarCSV.textContent = "Exportando...";
        btnExportarCSV.disabled = true;
        try {
            const dataInicio = inputFiltroInicio.value || null;
            const dataFim = inputFiltroFim.value || null;
            const dadosParaExportar = await apiObterHistorico(dataInicio, dataFim);

            if (!dadosParaExportar || dadosParaExportar.length === 0) {
                const temFiltro = dataInicio || dataFim;
                alert(temFiltro ? "Não há dados no período selecionado para exportar." : "Não há dados de histórico para exportar.");
                return;
            }
            console.log(`Exportando ${dadosParaExportar.length} registros (filtrados, se aplicável).`);

            const cabecalho = ["DataHoraRegistro", "NumOP", "CodigoEntrada", "DescricaoProduto", "Setor", "Beneficiamento", "QuantidadeRetrabalhada", "CustoRetrabalho(R$)"];
            const escaparCSV = (str) => {
                if (str == null) return '';
                str = String(str);
                if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes(',')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const linhas = dadosParaExportar.map(r => {
                let dataFormatada = '';
                try {
                    dataFormatada = new Date(r.timestamp).toLocaleString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
                } catch (e) { dataFormatada = r.timestamp; }
                return [
                    escaparCSV(dataFormatada),
                    escaparCSV(r.numOP),
                    escaparCSV(r.codEntrada),
                    escaparCSV(r.descricao),
                    escaparCSV(r.setor),
                    escaparCSV(r.beneficiamento),
                    r.quantidade,
                    (r.custo || 0).toFixed(2).replace('.', ',')
                ];
            });

            const cabecalhoString = cabecalho.join(';');
            const linhasString = linhas.map(row => row.join(';')).join('\n');
            const csvContent = "\uFEFF" + cabecalhoString + "\n" + linhasString;

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dataStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            link.setAttribute("download", `historico_retrabalho_${dataStamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log("Download CSV iniciado.");
        } catch (e) {
            console.error("ERRO ao exportar para CSV:", e);
            alert("Erro ao gerar o arquivo CSV. Verifique o console para mais detalhes.");
        } finally {
            btnExportarCSV.textContent = "Exportar Histórico (CSV)";
            const currentFilteredData = await apiObterHistorico(inputFiltroInicio.value || null, inputFiltroFim.value || null);
            btnExportarCSV.disabled = !currentFilteredData || currentFilteredData.length === 0;
        }
    }


    // --- 5. Event Listeners ---
    console.log("Adicionando event listeners...");
    checkboxModoCadastro.addEventListener('change', () => {
        toggleCadastroMode(checkboxModoCadastro.checked);
    });

    inputNumOP.addEventListener('blur', async () => {
        if (isCadastroMode) return;
        const op = inputNumOP.value.trim();
        inputNumOP.disabled = true;
        console.log(`Evento blur no campo Nº OP: "${op}" - Chamando API REAL...`);
        preencherFormulario(null);
        if (op) {
            const produtoData = await apiBuscarProdutoPorOP(op);
            if (produtoData) {
                preencherFormulario(produtoData);
                if (produtoData.OP) inputNumOP.value = produtoData.OP;
            } else {
                inputNumOP.focus();
            }
        }
        inputNumOP.disabled = false;
        console.log("Busca de produto por OP finalizada.");
    });

    inputNumOP.addEventListener('keypress', (e) => {
        if (isCadastroMode) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            inputNumOP.blur();
        }
    });

    formProduto.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        console.log(`>>> INFO: Formulário submetido! Modo Cadastro: ${isCadastroMode}`);
        btnPrincipalAcao.disabled = true;
        btnPrincipalAcao.textContent = 'Processando...';

        try {
            if (isCadastroMode) {
                console.log("Tentando cadastrar novo produto...");
                const novaOP = inputNumOP.value.trim();
                const novoCodEntrada = inputCodEntrada.value.trim();
                const novoDescricao = inputDescricao.value.trim();
                const novoValorUnitarioStr = inputValorUnitario.value;

                if (!novaOP || !novoCodEntrada || !novoDescricao || !novoValorUnitarioStr) {
                    alert("Para cadastrar um novo produto, preencha pelo menos: Nº OP, Cód. Entrada, Descrição e Valor Unitário.");
                    throw new Error("Campos obrigatórios para cadastro de produto não preenchidos.");
                }
                const novoValorUnitario = parseFloat(novoValorUnitarioStr);
                if (isNaN(novoValorUnitario) || novoValorUnitario < 0) {
                    alert("Valor Unitário inválido. Deve ser um número positivo.");
                    inputValorUnitario.select();
                    throw new Error("Valor Unitário inválido para cadastro.");
                }

                const produtoNovoParaAPI = {
                    OP: novaOP,
                    codEntrada: novoCodEntrada,
                    codSaida: inputCodSaida.value.trim() || null,
                    descricao: novoDescricao,
                    cliente: inputCliente.value.trim() || null,
                    beneficiamento: inputBeneficiamento.value.trim() || null,
                    setor: inputSetor.value.trim() || null,
                    pesoUnitario: inputPesoUnitario.value || null,
                    unidade: inputUnidade.value.trim() || null,
                    valorUnitario: novoValorUnitario
                };

                const respCadastro = await apiCadastrarProduto(produtoNovoParaAPI);
                if (respCadastro.success) {
                    console.log("Produto cadastrado com sucesso via API:", respCadastro.data);
                    alert(`Produto '${produtoNovoParaAPI.descricao}' (OP: ${produtoNovoParaAPI.OP}) cadastrado com sucesso!`);
                    checkboxModoCadastro.checked = false;
                    toggleCadastroMode(false);
                } else {
                    console.error("Falha ao cadastrar produto via API:", respCadastro.error);
                    if (respCadastro.error && respCadastro.error.includes("OP")) inputNumOP.select();
                    else if (respCadastro.error && respCadastro.error.includes("Cód. Entrada")) inputCodEntrada.select();
                }

            } else {
                console.log("Tentando registrar retrabalho...");
                const opRetrabalho = inputNumOP.value.trim();
                const codEntradaRetrabalho = inputCodEntrada.value.trim();
                const quantidadeStr = inputQuantidadeRetrabalho.value;

                if (!opRetrabalho || !codEntradaRetrabalho) {
                    alert("É necessário buscar uma OP válida antes de registrar o retrabalho.");
                    inputNumOP.focus();
                    throw new Error("OP ou Código de Entrada não preenchidos para retrabalho.");
                }
                const quantidade = parseInt(quantidadeStr, 10);
                if (isNaN(quantidade) || quantidade <= 0) {
                    alert("A Quantidade de Retrabalho deve ser um número inteiro maior que zero.");
                    inputQuantidadeRetrabalho.select();
                    throw new Error("Quantidade de retrabalho inválida.");
                }

                const produtoConfirmado = await apiBuscarProdutoPorOP(opRetrabalho);
                if (!produtoConfirmado || produtoConfirmado.codEntrada !== codEntradaRetrabalho) {
                    alert("Erro: Os dados do produto foram alterados ou não puderam ser confirmados. Por favor, busque a OP novamente.");
                    inputNumOP.focus();
                    throw new Error("Dados do produto inconsistentes ou não encontrados ao registrar retrabalho.");
                }

                const valorUnitarioConfirmado = parseFloat(produtoConfirmado.valorUnitario || 0);
                const custoTotalRetrabalho = quantidade * valorUnitarioConfirmado;
                const timestampAtual = new Date().toISOString();

                const registroRetrabalhoParaAPI = {
                    timestamp: timestampAtual,
                    numOP: opRetrabalho,
                    codEntrada: produtoConfirmado.codEntrada,
                    descricao: produtoConfirmado.descricao || '',
                    setor: produtoConfirmado.setor || '',
                    beneficiamento: produtoConfirmado.beneficiamento || '',
                    quantidade: quantidade,
                    custo: custoTotalRetrabalho
                };

                console.log(">>> INFO: Enviando para POST /api/retrabalhos (REAL):", registroRetrabalhoParaAPI);
                const responseRegister = await fetch(`${API_BASE_URL}/retrabalhos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(registroRetrabalhoParaAPI)
                });

                console.log("Resposta Fetch Registro Retrabalho:", responseRegister.status);
                if (responseRegister.ok) {
                    const registroSalvo = await responseRegister.json();
                    console.log("Registro de retrabalho salvo via API REAL:", registroSalvo);
                    alert(`Retrabalho para OP ${opRetrabalho} (Qtd: ${quantidade}) registrado com sucesso!`);
                    await renderizarTabelaHistorico();
                    await renderReportsAndCharts();
                    inputNumOP.value = '';
                    preencherFormulario(null);
                    inputNumOP.focus();
                } else {
                    const errorData = await responseRegister.json().catch(() => ({ message: responseRegister.statusText }));
                    console.error("Erro ao registrar retrabalho via API REAL:", responseRegister.status, errorData.message);
                    alert(`Erro ao registrar retrabalho (${responseRegister.status}): ${errorData.message}`);
                }
            }
        } catch (error) {
            console.error("Erro GERAL durante o submit do formulário:", error);
            if (error.message && !error.message.includes("obrigatórios") &&
                !error.message.includes("inválido") && !error.message.includes("não preenchidos") &&
                !error.message.includes("HTTP") && !error.message.includes("consistentes")) {
                alert("Ocorreu um erro inesperado ao processar a solicitação.");
            }
        } finally {
            btnPrincipalAcao.disabled = false;
            if (isCadastroMode) {
                btnPrincipalAcao.textContent = 'Salvar Novo Produto';
            } else {
                btnPrincipalAcao.textContent = 'Registrar Retrabalho';
            }
        }
    });


    tbodyHistorico.addEventListener('click', async (evento) => {
        if (evento.target.classList.contains('btn-excluir-registro')) {
            const idStr = evento.target.dataset.id;
            if (idStr !== undefined) {
                const idParaExcluir = parseInt(idStr, 10);
                const linha = evento.target.closest('tr');
                const opConfirm = linha.cells[1].textContent;
                const descConfirm = linha.cells[2].textContent;
                const qtdConfirm = linha.cells[5].textContent;

                const confirmacao = confirm(`Tem certeza que deseja excluir este registro de retrabalho?\n\nProduto: ${descConfirm} (OP/Cód.Entrada: ${opConfirm})\nQuantidade: ${qtdConfirm}`);
                if (confirmacao) {
                    console.log("Confirmada exclusão do registro com ID do DB:", idParaExcluir);
                    try {
                        const respExclusao = await apiExcluirRegistro(idParaExcluir);
                        if (respExclusao.success) {
                            console.log("Registro excluído com sucesso via API.");
                            alert("Registro de retrabalho excluído com sucesso!");
                            await renderizarTabelaHistorico();
                            await renderReportsAndCharts();
                        } else {
                            console.error("Falha ao excluir registro via API:", respExclusao.error);
                        }
                    } catch (e) {
                        console.error("Erro GERAL ao tentar excluir registro:", e);
                        alert("Ocorreu um erro inesperado ao tentar excluir o registro.");
                    }
                }
            }
        }
    });

    inputBuscaHistorico.addEventListener('input', filtrarTabelaHistorico);
    btnExportarCSV.addEventListener('click', exportToCSV);

    btnFiltrarData.addEventListener('click', async () => {
        console.log("Botão 'Filtrar Período' clicado.");
        await renderizarTabelaHistorico();
        await renderReportsAndCharts();
    });

    btnLimparFiltroData.addEventListener('click', async () => {
        console.log("Botão 'Limpar Filtro de Datas' clicado.");
        inputFiltroInicio.value = '';
        inputFiltroFim.value = '';
        await renderizarTabelaHistorico();
        await renderReportsAndCharts();
    });
    console.log("Event Listeners adicionados.");

    // --- 6. Inicialização ---
    async function inicializarApp() {
        console.log("Executando inicialização da aplicação...");
        checkboxModoCadastro.checked = false;
        toggleCadastroMode(false);
        inputFiltroInicio.value = ''; inputFiltroFim.value = ''; inputBuscaHistorico.value = '';

        try {
            await renderizarTabelaHistorico();
            await renderReportsAndCharts();
        } catch (error) {
            console.error("Erro durante a renderização inicial da aplicação:", error);
            alert("Erro ao carregar dados iniciais do servidor. Verifique a conexão e tente recarregar a página.");
        }
        console.log("--- Fim da inicialização do script.js ---");
    }
    inicializarApp();

}); // Fim do DOMContentLoaded