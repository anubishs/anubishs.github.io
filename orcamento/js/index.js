
(function () {
    const { jsPDF } = window.jspdf;

    function money(v) {
        return Number(v || 0).toFixed(2).replace('.', ',');
    }

    function getEl(id) { return document.getElementById(id) }

    const customList = [];
    // --- Detalhamento de serviços (títulos + descrições) ---
    const SERVICE_DEFINITIONS = {
        setup: {
            title: 'Configuração inicial',
            desc: 'Preparação do projeto: criação do repositório, instalação de dependências e criação do ambiente (local / staging).'
        },
        frontend: {
            title: 'Front-end',
            desc: 'Construção da parte visual: transformar o layout em HTML/CSS/JS responsivo, aplicar estilos e animações.'
        },
        backend: {
            title: 'Back-end',
            desc: 'Lógica e banco de dados: permitir criação, edição e remoção de posts, além de painel administrativo.'
        },
        seo: {
            title: 'SEO básico',
            desc: 'Ajustes para facilitar que o site apareça no Google: títulos, meta descrições, URLs amigáveis e sitemap.'
        },
        tests: {
            title: 'Testes e ajustes',
            desc: 'Verificação em navegadores e dispositivos, correção de erros e ajustes finais de responsividade.'
        },
        domain: {
            title: 'Configuração de domínio & SSL',
            desc: 'Vinculação do domínio ao servidor e configuração do certificado SSL para conexão segura (https).'
        },
        analytics: {
            title: 'Integrações',
            desc: 'Conexão com serviços externos (formulários, Google Analytics, chat, redes sociais) para funcionalidades e métricas.'
        },
        hosting: {
            title: 'Assistência de hospedagem',
            desc: 'Ajuda na escolha e configuração do serviço de hospedagem, deploy inicial e ajustes de DNS.'
        }
    };

    const selectedDetails = new Set();


    function addCustomItem() {
        const label = getEl('customLabel').value.trim();
        const val = parseFloat(getEl('customValue').value) || 0;
        if (!label) return alert('Descreva o item.');
        customList.push({ label, val });
        renderCustomList();
        getEl('customLabel').value = ''; getEl('customValue').value = '';
    }

    function renderCustomList() {
        const wrap = getEl('customList'); wrap.innerHTML = '';
        customList.forEach((c, i) => {
            const div = document.createElement('div');
            div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.gap = '8px'; div.style.marginTop = '6px';
            div.innerHTML = `<div>${c.label}</div><div style='display:flex;gap:8px'><div>R$ ${money(c.val)}</div><button data-idx='${i}' class='delBtn' style='background:transparent;border:0;color:#ef4444;cursor:pointer'>Remover</button></div>`;
            wrap.appendChild(div);
        });
        wrap.querySelectorAll('.delBtn').forEach(b => b.addEventListener('click', e => { customList.splice(+e.target.dataset.idx, 1); renderCustomList() }));
    }

    getEl('addCustom').addEventListener('click', addCustomItem);
    function bindDetalhamentoControls() {
        document.querySelectorAll('[data-detail-key]').forEach(cb => {
            cb.addEventListener('change', e => {
                const k = e.target.dataset.detailKey;
                if (e.target.checked) selectedDetails.add(k); else selectedDetails.delete(k);
                renderPreview(); // atualiza preview sempre que marcar/desmarcar
            });
        });
    }
    bindDetalhamentoControls();

    function collectAndCalculate() {
        const cliente = getEl('cliente').value || '[Nome do cliente]';
        const projeto = getEl('projeto').value || '';
        const obs = getEl('observacoes').value || '';
        const payment = getEl('paymentTerms').value || '';

        // base values
        const vals = {
            setup: parseFloat(getEl('valorSetup').value) || 0,
            frontend: parseFloat(getEl('valorFront').value) || 0,
            backend: parseFloat(getEl('valorBack').value) || 0,
            seo: parseFloat(getEl('valorSeo').value) || 0,
            tests: parseFloat(getEl('valorTests').value) || 0,
            domain: parseFloat(getEl('valorDomain').value) || 0,
            integrations: parseFloat(getEl('valorIntegracoes').value) || 0,
            assist: parseFloat(getEl('valorAssist').value) || 0
        };

        const checked = Array.from(document.querySelectorAll('[data-key]'))
            .filter(ch => ch.checked)
            .map(ch => ch.getAttribute('data-key'));

        const items = [];
        if (checked.includes('setup')) items.push({ label: 'Configuração inicial', desc: 'Setup do repositório, ambiente e dependências', val: vals.setup });
        if (checked.includes('frontend')) items.push({ label: 'Desenvolvimento Front-end', desc: 'Conversão do layout em HTML/CSS/JS responsivo com animações', val: vals.frontend });
        if (checked.includes('backend')) items.push({ label: 'Desenvolvimento Back-end', desc: 'CRUD de posts e painel administrativo', val: vals.backend });
        if (checked.includes('seo')) items.push({ label: 'SEO básico', desc: 'Meta tags, sitemap, URLs amigáveis', val: vals.seo });
        if (checked.includes('tests')) items.push({ label: 'Testes e ajustes', desc: 'Compatibilidade, correção de bugs e responsividade', val: vals.tests });
        if (checked.includes('analytics')) items.push({ label: 'Integrações', desc: 'Formulários, Google Analytics, redes sociais', val: vals.integrations });
        if (checked.includes('hosting')) items.push({ label: 'Assistência hospedagem', desc: 'Ajuda na contratação/ configuração da hospedagem', val: vals.assist });
        if (checked.includes('domain')) items.push({ label: 'Configuração de domínio e SSL', desc: 'DNS, vinculação e certificação SSL', val: vals.domain });

        // custom items
        customList.forEach(c => items.push({ label: c.label, desc: 'Item customizado', val: c.val }));

        // pages multiplier (for information only) — not changing base values but can be shown
        const pages = parseInt(getEl('pages').value) || 1;

        const total = items.reduce((s, it) => s + Number(it.val || 0), 0);

        return { cliente, projeto, obs, payment, items, total, pages, selectedDetails: Array.from(selectedDetails) };
    }

    function renderPreview() {
        const data = collectAndCalculate();
        getEl('pdfCliente').innerText = data.cliente;
        getEl('pdfProjeto').innerText = data.projeto;
        getEl('pdfPayment').innerText = data.payment;
        getEl('pdfObs').innerText = data.obs;
        getEl('pdfTotal').innerText = money(data.total);
        getEl('metaDate').querySelector('span').innerText = new Date().toLocaleDateString('pt-BR');

        const tbody = getEl('itemsTable').querySelector('tbody'); tbody.innerHTML = '';
        data.items.forEach(it => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style='width:35%'>${it.label}</td><td>${it.desc}</td><td style='text-align:right'>R$ ${money(it.val)}</td>`;
            tbody.appendChild(tr);
        });

        // Renderizar Detalhamento selecionado (no PDF)
        // const detalhesWrapper = getEl('pdfDetalhes');
        // const detalhesList = getEl('pdfDetalhesList');
        // detalhesList.innerHTML = '';
        // if (data.selectedDetails && data.selectedDetails.length > 0) {
        //     detalhesWrapper.style.display = 'block';
        //     data.selectedDetails.forEach(k => {
        //         const def = SERVICE_DEFINITIONS[k];
        //         if (!def) return;
        //         const div = document.createElement('div');
        //         div.innerHTML = `<strong>${def.title}</strong><p>${def.desc}</p>`;
        //         detalhesList.appendChild(div);
        //     });
        // } else {
        //     detalhesWrapper.style.display = 'none';
        // }

        // update filename
        getEl('fileName').innerText = `orcamento_${data.cliente.replace(/\W+/g, '_') || 'cliente'}.pdf`;
    }


    getEl('calc').addEventListener('click', () => { renderPreview(); alert('Cálculo finalizado — confira o preview à direita.') });
    getEl('previewBtn').addEventListener('click', renderPreview);

    async function exportPdf() {
    renderPreview();

    const invoiceEl = document.getElementById('invoice');
    const scale = 2;

    // 1. Gerar a imagem da primeira página (orçamento resumido)
    const canvas = await html2canvas(invoiceEl, {
        scale: scale,
        useCORS: true,
        backgroundColor: "#ffffff"
    });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
        unit: 'pt',
        format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Ajustar imagem na página 1
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // 2. Criar a segunda página manualmente para detalhamento
    pdf.addPage();

    const data = collectAndCalculate();

    // Margens
    const marginLeft = 40;
    let y = 40;

    pdf.setFontSize(18);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Detalhamento de Serviços', marginLeft, y);
    y += 30;

    pdf.setFontSize(12);
    pdf.setTextColor(33, 33, 33);

    // Para cada serviço selecionado mostrar título e descrição
    data.selectedDetails.forEach(key => {
        const def = SERVICE_DEFINITIONS[key];
        if (!def) return;

        // Título
        pdf.setFont(undefined, 'bold');
        pdf.text(def.title, marginLeft, y);
        y += 16;

        // Descrição (quebra automática de linha)
        pdf.setFont(undefined, 'normal');
        const splitDesc = pdf.splitTextToSize(def.desc, pageWidth - 2 * marginLeft);
        pdf.text(splitDesc, marginLeft, y);
        y += splitDesc.length * 14 + 14;

        // Se passar de 700 pt, criar página nova
        if (y > pageHeight - 80) {
            pdf.addPage();
            y = 40;
        }
    });

    // Observações no final da segunda página
    if (y > pageHeight - 120) {
        pdf.addPage();
        y = 40;
    }

    pdf.setDrawColor(220);
    pdf.setLineWidth(0.5);
    pdf.line(marginLeft, y, pageWidth - marginLeft, y);
    y += 10;

    pdf.setFont(undefined, 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(99, 99, 99);
    const obsLines = pdf.splitTextToSize(data.obs, pageWidth - 2 * marginLeft);
    pdf.text(obsLines, marginLeft, y);

    // Salvar arquivo
    const fname = document.getElementById('fileName').innerText || 'orcamento.pdf';
    pdf.save(fname);
}



    getEl('exportPdf').addEventListener('click', () => {
        getEl('exportPdf').disabled = true; getEl('exportPdf').innerText = 'Gerando...';
        setTimeout(async () => { try { await exportPdf(); } catch (e) { alert('Erro ao gerar PDF: ' + e.message) } finally { getEl('exportPdf').disabled = false; getEl('exportPdf').innerText = 'Exportar PDF' } }, 150);
    });

    // initial render
    renderPreview();
})();
