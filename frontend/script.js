// Shared frontend script for the public pages: navigation, stock showcase, filters and forms.

// Efeito de escurecer o menu ao rolar a página
window.addEventListener("scroll", function() {
    const header = document.querySelector("header");
    if (window.scrollY > 50) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});

let carrosEstoqueAtuais = [];
let estoqueBoomCarregado = false;

// Pagination keeps the stock page light even when the dealership has hundreds of vehicles.
const VEICULOS_POR_PAGINA = 12;
let paginaEstoqueAtual = 1;

function atualizarEstoqueBoom(carros) {
    if (!Array.isArray(carros)) return;

    carrosEstoqueAtuais = carros;
    estoqueBoomCarregado = true;
    atualizarFiltroMarcas(carrosEstoqueAtuais);
    renderizarEstoquePagina(carrosEstoqueAtuais);

    const grid = document.getElementById('grid-carros');
    if (grid) {
        grid.innerHTML = '';
        carrosEstoqueAtuais.forEach(carro => {
            grid.innerHTML += `<div class="swiper-slide">${gerarHTMLCard(carro)}</div>`;
        });
        iniciarSwiper();
    }

    window.dispatchEvent(new Event('estoqueBoomAtualizado'));
}

// 1. Função pura: Gera apenas o interior do card
function gerarHTMLCard(carro) {
    const msgWhatsapp = `Olá! Tenho interesse no veículo ${carro.marca} ${carro.modelo} (${carro.ano}) que vi no site.`;
    const linkWpp = `https://wa.me/551533634000?text=${encodeURIComponent(msgWhatsapp)}`;
    const linkDetalhes = `veiculo.html?id=${carro.id}`;
    
    // Gera as tags dinamicamente
    let tagsHTML = '';
    if (carro.tags && carro.tags.length > 0) {
        tagsHTML = '<div class="tags-container">';
        carro.tags.forEach(tag => {
            tagsHTML += `<span class="badge-destaque">${tag}</span>`;
        });
        tagsHTML += '</div>';
    }

    return `
        <div class="card-carro">
            <a href="${linkDetalhes}" class="card-img-container" style="display: block; text-decoration: none;">
                ${tagsHTML}
                <img src="${carro.foto}" alt="${carro.modelo}">
            </a>
            
            <div class="card-body">
                <a href="${linkDetalhes}" style="text-decoration: none; color: inherit; transition: 0.3s;"
                onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='inherit'">
                    <h3>${carro.marca} ${carro.modelo}</h3>
                </a>
                
                <p class="subtitulo">${carro.versao}</p>
                
                <div class="card-specs">
                    <span><i class="far fa-calendar-alt"></i> ${carro.ano}</span>
                    <span><i class="fas fa-road"></i> ${carro.km}</span>
                    <span><i class="fas fa-cog"></i> ${carro.cambio}</span>
                </div>
                 
                <div class="card-footer">
                    <span class="preco">${carro.preco}</span>
                    <a href="${linkWpp}" target="_blank" class="btn-card">
                        <i class="fab fa-whatsapp"></i> Tenho Interesse
                    </a>
                </div>
            </div>
        </div>
    `;
}

// 2. Renderiza apenas se estiver na página de Estoque
function renderizarEstoquePagina(listaCarros = [], pagina = 1) {
    const gridCompleto = document.getElementById('grid-estoque-pagina');
    const contador = document.getElementById('contador-veiculos');

    if (!gridCompleto) return;

    const totalPaginas = Math.max(1, Math.ceil(listaCarros.length / VEICULOS_POR_PAGINA));
    paginaEstoqueAtual = Math.min(Math.max(1, pagina), totalPaginas);

    const inicio = (paginaEstoqueAtual - 1) * VEICULOS_POR_PAGINA;
    const carrosDaPagina = listaCarros.slice(inicio, inicio + VEICULOS_POR_PAGINA);

    gridCompleto.innerHTML = '';
    carrosDaPagina.forEach(carro => {
        gridCompleto.innerHTML += gerarHTMLCard(carro);
    });

    if (contador) {
        contador.innerText = `${listaCarros.length} veículos encontrados`;
    }

    renderizarPaginacaoEstoque(listaCarros, totalPaginas);
}

// Builds numbered page controls and wires them to re-render the current filtered list.
function renderizarPaginacaoEstoque(listaCarros, totalPaginas) {
    const nav = document.getElementById('paginacao-estoque');
    if (!nav) return;

    nav.innerHTML = '';

    if (totalPaginas <= 1) return;

    const criarBotao = (label, pagina, opcoes = {}) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'pagina-botao';
        botao.innerHTML = label;
        botao.disabled = !!opcoes.desabilitado;
        if (opcoes.ativo) botao.classList.add('ativo');
        botao.addEventListener('click', () => {
            renderizarEstoquePagina(listaCarros, pagina);
            const grid = document.getElementById('grid-estoque-pagina');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return botao;
    };

    nav.appendChild(criarBotao('<i class="fas fa-chevron-left"></i>', paginaEstoqueAtual - 1, { desabilitado: paginaEstoqueAtual === 1 }));

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        nav.appendChild(criarBotao(String(pagina), pagina, { ativo: pagina === paginaEstoqueAtual }));
    }

    nav.appendChild(criarBotao('<i class="fas fa-chevron-right"></i>', paginaEstoqueAtual + 1, { desabilitado: paginaEstoqueAtual === totalPaginas }));
}

// 3. Inicialização do Swiper
function iniciarSwiper() {
    if (typeof Swiper !== 'undefined') {
        new Swiper(".mySwiper", {
            observer: true,
            observeParents: true,
            slidesPerView: 1,
            spaceBetween: 20,
            loop: carrosEstoqueAtuais.length > 1,
            pagination: { el: ".swiper-pagination", clickable: true },
            navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
            breakpoints: {
                768: { slidesPerView: 2, spaceBetween: 30 },
                1024: { slidesPerView: 3, spaceBetween: 30 }
            }
        });
    }
}

// Central initialization keeps one script serving multiple pages without crashing on missing elements.
document.addEventListener('DOMContentLoaded', () => {
    if (typeof iniciarFiltros === 'function') iniciarFiltros(); 
    if (typeof carregarDetalhesVeiculo === 'function') carregarDetalhesVeiculo();
    
    // Funções de formulários
    if (typeof iniciarFormularioConsignacao === 'function') iniciarFormularioConsignacao();
    if (typeof iniciarFormularioFinanciamento === 'function') iniciarFormularioFinanciamento();
    if (typeof iniciarFormularioContato === 'function') iniciarFormularioContato();
    if (typeof iniciarFiltroModelosConsignacao === 'function') iniciarFiltroModelosConsignacao();

    // ATENÇÃO: É esta linha que liga os filtros da página de Blog!
    if (typeof iniciarFiltrosBlog === 'function') iniciarFiltrosBlog();
    
    // Liga o Dropdown animado de data do Blog
    if (typeof iniciarDropdownData === 'function') iniciarDropdownData();

    // Lógica do Menu Mobile
    const btnMenuMobile = document.getElementById('menu-toggle');
    const menuNavLinks = document.querySelector('.nav-links');
    const headerMobile = document.querySelector('header');

    if (btnMenuMobile && menuNavLinks && headerMobile) {
        btnMenuMobile.addEventListener('click', function() {
            menuNavLinks.classList.toggle('active');
            headerMobile.classList.toggle('menu-open');
        });

        const linksDoMenu = document.querySelectorAll('.nav-links a');
        linksDoMenu.forEach(link => {
            link.addEventListener('click', () => {
                menuNavLinks.classList.remove('active');
                headerMobile.classList.remove('menu-open');
            });
        });
    }

    // The stock page uses a drawer on narrow screens and an inline sidebar on larger layouts.
    const mobileToggle = document.getElementById('mobile-filtros-toggle');
    const mobileDrawer = document.getElementById('mobile-filtros-panel');
    const mobileBackdrop = document.getElementById('mobile-filtros-backdrop');
    const mobileClose = document.getElementById('filtro-fechar-mobile');
    const mobileApply = document.getElementById('btn-aplicar-filtro');

    function abrirFiltrosMobile() {
        if (!mobileDrawer || !mobileBackdrop || !mobileToggle) return;
        mobileDrawer.classList.add('mobile-open');
        mobileBackdrop.classList.add('mobile-open');
        mobileToggle.setAttribute('aria-expanded', 'true');
    }

    function fecharFiltrosMobile() {
        if (!mobileDrawer || !mobileBackdrop || !mobileToggle) return;
        mobileDrawer.classList.remove('mobile-open');
        mobileBackdrop.classList.remove('mobile-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            const aberto = mobileDrawer && mobileDrawer.classList.contains('mobile-open');
            if (aberto) {
                fecharFiltrosMobile();
            } else {
                abrirFiltrosMobile();
            }
        });
    }

    if (mobileClose) {
        mobileClose.addEventListener('click', fecharFiltrosMobile);
    }

    if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', fecharFiltrosMobile);
    }

    if (mobileApply) {
        mobileApply.addEventListener('click', function() {
            if (typeof document.querySelector === 'function') {
                const busca = document.getElementById('busca-texto');
                if (busca) {
                    busca.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            fecharFiltrosMobile();
        });
    }
});

// Helpers convert formatted UI labels into numbers so filters work with the API response.
function extrairAnoNumerico(valor) {
    const match = String(valor).match(/\d{4}/);
    return match ? Number(match[0]) : 0;
}

function extrairKmNumerico(valor) {
    if (!valor) return 0;
    const numero = Number(String(valor).replace(/[^0-9,\.]/g, '').replace('.', '').replace(',', '.'));
    return Number.isFinite(numero) ? numero : 0;
}

function extrairPrecoNumerico(valor) {
    if (!valor) return 0;
    const numero = Number(String(valor).replace(/[^0-9,\.]/g, '').replace('.', '').replace(',', '.'));
    return Number.isFinite(numero) ? numero : 0;
}

// Builds the "Marcas" filter options from whatever brands actually exist in the current stock,
// so a brand only appears (or disappears) when there is at least one vehicle for it.
function atualizarFiltroMarcas(listaCarros = []) {
    const container = document.getElementById('lista-marcas');
    if (!container) return;

    const radioAtivo = container.querySelector('input[name="marca"]:checked');
    const marcaSelecionadaAntes = radioAtivo ? radioAtivo.value : 'Todas';

    const marcasUnicas = Array.from(new Set(
        listaCarros
            .map(carro => (carro.marca || '').trim())
            .filter(marca => marca && marca !== 'Marca')
    )).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    let html = '<label><input type="radio" name="marca" value="Todas"> Todas as Marcas</label>';
    marcasUnicas.forEach(marca => {
        html += `<label><input type="radio" name="marca" value="${escapeHtml(marca)}"> ${escapeHtml(marca)}</label>`;
    });
    container.innerHTML = html;

    // Keeps the previously selected brand checked if it still exists in stock; otherwise falls back to "Todas".
    const marcaAindaExiste = marcaSelecionadaAntes === 'Todas' || marcasUnicas.includes(marcaSelecionadaAntes);
    const valorParaMarcar = marcaAindaExiste ? marcaSelecionadaAntes : 'Todas';
    const radioParaMarcar = container.querySelector(`input[name="marca"][value="${CSS.escape(valorParaMarcar)}"]`);
    if (radioParaMarcar) radioParaMarcar.checked = true;
}

function escapeHtml(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function iniciarFiltros() {
    const inputBusca = document.getElementById('busca-texto');
    const selectAno = document.getElementById('ano-filtro');
    const selectKm = document.getElementById('km-filtro');
    const selectTransmissao = document.getElementById('transmissao-filtro');
    const selectPreco = document.getElementById('preco-filtro');
    const listaMarcas = document.getElementById('lista-marcas');
    
    if (!inputBusca) return;

    // All filters are combined in a single pass so desktop and mobile share exactly the same rules.
    function aplicarFiltros() {
        const termoBusca = inputBusca.value.toLowerCase().trim();
        const radioSelecionado = document.querySelector('input[name="marca"]:checked');
        const marcaSelecionada = radioSelecionado ? radioSelecionado.value : 'Todas';
        const anoSelecionado = selectAno ? selectAno.value : 'todos';
        const kmSelecionado = selectKm ? selectKm.value : 'todos';
        const transmissaoSelecionada = selectTransmissao ? selectTransmissao.value : 'todos';
        const precoSelecionado = selectPreco ? selectPreco.value : 'todos';

        const carrosFiltrados = carrosEstoqueAtuais.filter(carro => {
            const textoCompletoCarro = `${carro.marca} ${carro.modelo} ${carro.versao}`.toLowerCase();
            const passouNoTexto = textoCompletoCarro.includes(termoBusca);
            const passouNaMarca = marcaSelecionada === 'Todas' || carro.marca === marcaSelecionada;

            const passouNoAno = anoSelecionado === 'todos' || extrairAnoNumerico(carro.ano) >= Number(anoSelecionado);
            const passouNaKm = kmSelecionado === 'todos' || extrairKmNumerico(carro.km) <= Number(kmSelecionado);
            const passouNaTransmissao = transmissaoSelecionada === 'todos' || carro.cambio === transmissaoSelecionada;
            const passouNoPreco = precoSelecionado === 'todos' || extrairPrecoNumerico(carro.preco) <= Number(precoSelecionado);

            return passouNoTexto && passouNaMarca && passouNoAno && passouNaKm && passouNaTransmissao && passouNoPreco;
        });

        renderizarEstoquePagina(carrosFiltrados);
    }

    inputBusca.addEventListener('input', aplicarFiltros); 
    if (listaMarcas) {
        listaMarcas.addEventListener('change', function(event) {
            if (event.target && event.target.name === 'marca') {
                aplicarFiltros();
            }
        });
    }

    [selectAno, selectKm, selectTransmissao, selectPreco].forEach(select => {
        if (select) {
            select.addEventListener('change', aplicarFiltros);
        }
    });
}

// Dedicated vehicle page renderer fed by the same stock structure used in the grids.
function carregarDetalhesVeiculo() {
    const container = document.getElementById('detalhes-veiculo-container');
    if (!container) return; // Proteção: Só avança se a div existir na tela

    const urlParams = new URLSearchParams(window.location.search);
    const idCarro = urlParams.get('id');
    const carro = carrosEstoqueAtuais.find(c => String(c.id) === String(idCarro));

    if (!carro) {
        if (!estoqueBoomCarregado) {
            container.innerHTML = `<div class="container text-center py-5"><h2>Carregando veículo...</h2></div>`;
            if (!container.dataset.boomListener) {
                container.dataset.boomListener = 'true';
                window.addEventListener('estoqueBoomAtualizado', carregarDetalhesVeiculo, { once: true });
            }
            return;
        }
        container.innerHTML = `<div class="container text-center py-5"><h2>Veículo não encontrado.</h2><a href="estoque.html" class="btn-primary">Voltar ao Estoque</a></div>`;
        return;
    }

    const msgWhatsapp = `Olá! Gostaria de mais informações sobre o ${carro.marca} ${carro.modelo} ${carro.versao} (${carro.ano}) de ${carro.preco}.`;
    const linkWpp = `https://wa.me/551533634000?text=${encodeURIComponent(msgWhatsapp)}`;

    // Evita repetir o texto quando "modelo" já inclui a "versão" (comum nos dados vindos do Boom).
    const versaoJaIncluidaNoModelo = carro.versao && String(carro.modelo).includes(carro.versao);
    const nomeVeiculoParaFinanciamento = versaoJaIncluidaNoModelo
        ? `${carro.marca} ${carro.modelo}`.trim()
        : `${carro.marca} ${carro.modelo} ${carro.versao || ''}`.trim();

    // CORREÇÃO 2: Verificação da Ficha Técnica Detalhada implementada
    let htmlEspecificacoesDetalhadas = '';
    if (carro.especificacoes) {
        htmlEspecificacoesDetalhadas = `
            <div class="secao-especificacoes">
                <h3>Ficha Técnica Detalhada</h3>
                <ul class="lista-especificacoes">
                    <li><span>Motor</span> <strong>${carro.especificacoes.motor}</strong></li>
                    <li><span>Potência</span> <strong>${carro.especificacoes.potencia}</strong></li>
                    <li><span>Cor</span> <strong>${carro.especificacoes.cor}</strong></li>
                    <li><span>Portas</span> <strong>${carro.especificacoes.portas}</strong></li>
                    <li><span>Blindado</span> <strong>${carro.especificacoes.blindado}</strong></li>
                    <li><span>Combustível</span> <strong>${carro.especificacoes.combustivel}</strong></li>
                </ul>
            </div>
        `;
    }

    // Lista de equipamentos e opcionais reais do veículo, fornecida pela Boom.
    let htmlOpcionais = '';
    if (Array.isArray(carro.opcionais) && carro.opcionais.length > 0) {
        htmlOpcionais = `
            <div class="secao-especificacoes">
                <h3>Equipamentos e Opcionais</h3>
                <div class="lista-opcionais">
                    ${carro.opcionais.map(item => `<span class="tag-opcional"><i class="fas fa-check"></i> ${item}</span>`).join('')}
                </div>
            </div>
        `;
    }

    const fotosVeiculo = Array.isArray(carro.fotos) && carro.fotos.length ? carro.fotos : [carro.foto];

    container.innerHTML = `
        <div class="container layout-detalhes">
            <div class="info-principal">
                <div class="cabecalho-veiculo">
                    <div>
                        <h1>${carro.marca} ${carro.modelo}</h1>
                        <span class="versao">${carro.versao}</span>
                    </div>
                    <div class="preco-destaque">${carro.preco}</div>
                </div>

                <div class="galeria-principal">
                    <img id="galeria-foto-principal" src="${fotosVeiculo[0]}" alt="${carro.modelo}" class="galeria-foto-clicavel" title="Clique para ampliar">
                    ${fotosVeiculo.length > 1 ? `<div class="galeria-miniaturas">${fotosVeiculo.map((url, i) => `<img src="${url}" alt="Foto ${i + 1} de ${fotosVeiculo.length}" data-indice="${i}" loading="lazy" class="${i === 0 ? 'ativa' : ''}">`).join('')}</div>` : ''}
                </div>

                <h3>Visão Geral</h3>
                <div class="ficha-tecnica-grid">
                    <div class="item-ficha">
                        <i class="far fa-calendar-alt"></i>
                        <div><span>Ano</span><strong>${carro.ano}</strong></div>
                    </div>
                    <div class="item-ficha">
                        <i class="fas fa-road"></i>
                        <div><span>Quilometragem</span><strong>${carro.km}</strong></div>
                    </div>
                    <div class="item-ficha">
                        <i class="fas fa-cog"></i>
                        <div><span>Câmbio</span><strong>${carro.cambio}</strong></div>
                    </div>
                    <div class="item-ficha">
                        <i class="fas fa-shield-alt"></i>
                        <div><span>Procedência</span><strong>Laudo Aprovado</strong></div>
                    </div>
                </div>
                
                ${htmlEspecificacoesDetalhadas}
                
                ${htmlOpcionais}
                
            </div>

            <aside>
                <div class="card-compra-sticky">
                    <h3>Gostou deste veículo?</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 25px; text-align: center;">
                        Fale diretamente com nossos consultores para simular financiamento ou avaliar seu usado na troca.
                    </p>
                    <a href="${linkWpp}" target="_blank" class="btn-whatsapp-large">
                        <i class="fab fa-whatsapp"></i> Falar com Especialista
                    </a>
                    <a href="financiamento.html?veiculo=${encodeURIComponent(nomeVeiculoParaFinanciamento)}" class="btn-outline" style="width: 100%; text-align: center; border-color: #333; color: var(--text-light);">
                        Simular Financiamento
                    </a>
                </div>
            </aside>
        </div>
    `;

    iniciarGaleriaVeiculo(fotosVeiculo);
}

// Galeria da página do veículo: miniaturas trocam a foto principal e o clique abre um visualizador em tela cheia.
function iniciarGaleriaVeiculo(fotos) {
    const principal = document.getElementById('galeria-foto-principal');
    if (!principal) return;

    let indice = 0;
    let viewer = null;

    const mostrar = (novoIndice) => {
        indice = (novoIndice + fotos.length) % fotos.length;
        principal.src = fotos[indice];
        document.querySelectorAll('.galeria-miniaturas img').forEach((img, i) => img.classList.toggle('ativa', i === indice));
        if (viewer) {
            viewer.querySelector('img').src = fotos[indice];
            viewer.querySelector('.viewer-contador').textContent = `${indice + 1} / ${fotos.length}`;
        }
    };

    const fechar = () => {
        if (!viewer) return;
        viewer.remove();
        viewer = null;
        document.body.style.overflow = '';
        document.removeEventListener('keydown', aoTeclar);
    };

    function aoTeclar(e) {
        if (e.key === 'Escape') fechar();
        else if (e.key === 'ArrowRight') mostrar(indice + 1);
        else if (e.key === 'ArrowLeft') mostrar(indice - 1);
    }

    const abrir = () => {
        if (viewer) return;
        const varias = fotos.length > 1;
        viewer = document.createElement('div');
        viewer.className = 'foto-viewer';
        viewer.innerHTML = `
            <button type="button" class="viewer-fechar" aria-label="Fechar">&times;</button>
            ${varias ? '<button type="button" class="viewer-nav viewer-anterior" aria-label="Foto anterior">&#10094;</button>' : ''}
            <img src="${fotos[indice]}" alt="Foto ampliada do veículo">
            ${varias ? '<button type="button" class="viewer-nav viewer-proxima" aria-label="Próxima foto">&#10095;</button>' : ''}
            <span class="viewer-contador">${indice + 1} / ${fotos.length}</span>
        `;
        viewer.addEventListener('click', (e) => {
            if (e.target.closest('.viewer-anterior')) mostrar(indice - 1);
            else if (e.target.closest('.viewer-proxima')) mostrar(indice + 1);
            else if (e.target.tagName !== 'IMG') fechar();
        });
        document.body.appendChild(viewer);
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', aoTeclar);
    };

    principal.addEventListener('click', abrir);
    document.querySelectorAll('.galeria-miniaturas img').forEach(img => {
        img.addEventListener('click', () => mostrar(Number(img.dataset.indice)));
    });
}

// 8. Lógica do Formulário de Consignação
function iniciarFormularioConsignacao() {
    const formConsignacao = document.getElementById('form-consignacao');
    
    // Validação: Só executa se o formulário existir na tela atual
    if (!formConsignacao) return;

    formConsignacao.addEventListener('submit', function(event) {
        // Impede que a página recarregue ao clicar no botão
        event.preventDefault();

        // Captura os valores digitados pelo usuário
        const nome = document.getElementById('nome').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const marca = document.getElementById('marca').value.trim();
        const modelo = document.getElementById('modelo').value.trim();
        const mensagem = document.getElementById('mensagem').value.trim();

        // Constrói a mensagem profissional para o consultor da loja
        let textoWhatsApp = `Olá, equipe Constherme Garage! Meu nome é *${nome}* e gostaria de solicitar uma avaliação para consignação do meu veículo.\n\n`;
        textoWhatsApp += `*🚗 Veículo:* ${marca} ${modelo}\n`;
        textoWhatsApp += `*📱 Meu Contato:* ${telefone}\n`;
        
        // Só adiciona a observação se o cliente tiver digitado algo
        if (mensagem !== "") {
            textoWhatsApp += `\n*📝 Observações:* ${mensagem}`;
        }

        // Codifica o texto para o formato de URL e abre o WhatsApp da loja
        const numeroLoja = "551533634000";
        const linkWpp = `https://wa.me/${numeroLoja}?text=${encodeURIComponent(textoWhatsApp)}`;
        
        window.open(linkWpp, '_blank');
    });
}

// 9. Lógica do Formulário de Financiamento
function iniciarFormularioFinanciamento() {
    const formFinanciamento = document.getElementById('form-financiamento');
    
    if (!formFinanciamento) return;

    // Pré-preenche o formulário quando o usuário chega vindo do botão "Simular Financiamento" de um anúncio.
    const urlParams = new URLSearchParams(window.location.search);
    const veiculoInteresse = urlParams.get('veiculo');
    if (veiculoInteresse) {
        const campoMensagem = document.getElementById('fin-mensagem');
        if (campoMensagem) campoMensagem.value = `Tenho interesse no ${veiculoInteresse}`;

        const campoMarca = document.getElementById('fin-marca');
        if (campoMarca) {
            const opcaoCorrespondente = Array.from(campoMarca.options).find(opcao =>
                opcao.value && veiculoInteresse.toLowerCase().includes(opcao.value.toLowerCase())
            );
            if (opcaoCorrespondente) campoMarca.value = opcaoCorrespondente.value;
        }
    }

    formFinanciamento.addEventListener('submit', function(event) {
        event.preventDefault();

        const nome = document.getElementById('fin-nome').value.trim();
        const telefone = document.getElementById('fin-telefone').value.trim();
        const cpf = document.getElementById('fin-cpf').value.trim();
        const dataNascimento = document.getElementById('fin-data').value;
        const marca = document.getElementById('fin-marca') ? document.getElementById('fin-marca').value : '';
        const mensagem = document.getElementById('fin-mensagem').value.trim();

        let textoWhatsApp = `Olá, equipe Constherme Garage!\n`;
        textoWhatsApp += `Meu nome é *${nome}* e gostaria de uma simulação de financiamento.\n\n`;
        textoWhatsApp += `*📋 Meus Dados:*\n`;
        textoWhatsApp += `- CPF: ${cpf}\n`;
        textoWhatsApp += `- Nascimento: ${dataNascimento.split('-').reverse().join('/')}\n`;
        textoWhatsApp += `- Telefone: ${telefone}\n`;

        if (marca !== "") {
            textoWhatsApp += `- Marca de Interesse: ${marca}\n`;
        }

        if (mensagem !== "") {
            textoWhatsApp += `\n*📝 Observação/Veículo:* ${mensagem}`;
        }

        const numeroLoja = "551533634000";
        const linkWpp = `https://wa.me/${numeroLoja}?text=${encodeURIComponent(textoWhatsApp)}`;
        
        window.open(linkWpp, '_blank');
    });
}

// 10. Lógica do Formulário de Contato
function iniciarFormularioContato() {
    const formContato = document.getElementById('form-contato');
    
    // Validação: Só executa se o formulário existir na tela atual
    if (!formContato) return;

    formContato.addEventListener('submit', function(event) {
        // Impede que a página recarregue ao clicar no botão
        event.preventDefault();

        // Captura os valores digitados pelo usuário
        const nome = document.getElementById('contato-nome').value.trim();
        const telefone = document.getElementById('contato-telefone').value.trim();
        const assunto = document.getElementById('contato-assunto').value.trim();
        const mensagem = document.getElementById('contato-mensagem').value.trim();

        // Constrói a mensagem para a equipe da loja
        let textoWhatsApp = `Olá, equipe Constherme Garage!\n`;
        textoWhatsApp += `Meu nome é *${nome}* e estou entrando em contato através do site.\n\n`;
        textoWhatsApp += `*📌 Assunto:* ${assunto}\n`;
        textoWhatsApp += `*📱 Meu Contato:* ${telefone}\n\n`;
        textoWhatsApp += `*💬 Mensagem:*\n${mensagem}`;

        // Codifica o texto para o formato de URL e abre o WhatsApp da loja
        const numeroLoja = "551533634000";
        const linkWpp = `https://wa.me/${numeroLoja}?text=${encodeURIComponent(textoWhatsApp)}`;
        
        window.open(linkWpp, '_blank');
    });
}

// 11. Lógica de Filtros do Blog
function iniciarFiltrosBlog() {
    const filtroTema = document.getElementById('filtro-tema');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroData = document.getElementById('filtro-data');
    const posts = document.querySelectorAll('.post-blog');

    if (!filtroTema || !filtroCategoria || !filtroData) return;

    function aplicarFiltros() {
        const temaSelecionado = filtroTema.value;
        const categoriaSelecionada = filtroCategoria.value;
        const dataSelecionada = filtroData.value; // Ex: "06/2026" ou "Todos"

        posts.forEach(post => {
            const temaPost = post.getAttribute('data-tema');
            const categoriaPost = post.getAttribute('data-categoria');
            const dataPost = post.getAttribute('data-data'); // Ex: "20/06/2026"

            const passouTema = (temaSelecionado === 'Todos') || (temaPost === temaSelecionado);
            const passouCategoria = (categoriaSelecionada === 'Todas') || (categoriaPost === categoriaSelecionada);
            
            // Verifica se a data do post termina com o Mês/Ano escolhido no filtro
            const passouData = (dataSelecionada === 'Todos') || dataPost.endsWith(dataSelecionada);

            if (passouTema && passouCategoria && passouData) {
                post.classList.remove('oculto');
                post.style.display = 'flex'; 
            } else {
                post.classList.add('oculto');
                post.style.display = 'none'; 
            }
        });
    }

    filtroTema.addEventListener('change', aplicarFiltros);
    filtroCategoria.addEventListener('change', aplicarFiltros);
    filtroData.addEventListener('change', aplicarFiltros);
}

// 12. Lógica do Dropdown Customizado de Data
function iniciarDropdownData() {
    const customSelect = document.getElementById('custom-data-select');
    if (!customSelect) return; // Cancela se não estiver na página do blog

    const selected = customSelect.querySelector('.select-selected');
    const itemsContainer = customSelect.querySelector('.select-items');
    const anos = customSelect.querySelectorAll('.ano-titulo');
    const opcoes = customSelect.querySelectorAll('.item-opcao');
    const inputEscondido = document.getElementById('filtro-data');

    // 1. Abrir/Fechar a caixa principal ao clicar
    selected.addEventListener('click', function(e) {
        e.stopPropagation();
        itemsContainer.classList.toggle('select-hide');
        selected.style.borderColor = itemsContainer.classList.contains('select-hide') ? '#444' : 'var(--primary-color)';
    });

    // 2. Abrir/Retrair os meses ao clicar no Ano
    anos.forEach(ano => {
        ano.addEventListener('click', function(e) {
            e.stopPropagation(); // Evita que feche a caixa principal
            const listaMeses = this.nextElementSibling; // Pega a div .meses-lista
            const icone = this.querySelector('i');
            
            if (listaMeses.style.display === 'none') {
                listaMeses.style.display = 'block';
                icone.classList.replace('fa-chevron-down', 'fa-chevron-up');
            } else {
                listaMeses.style.display = 'none';
                icone.classList.replace('fa-chevron-up', 'fa-chevron-down');
            }
        });
    });

    // 3. Ao clicar em um Mês ou Ano (passar a informação para o input)
    opcoes.forEach(opcao => {
        opcao.addEventListener('click', function() {
            const valor = this.getAttribute('data-value');
            const texto = this.innerText;

            // Atualiza o texto na tela
            selected.innerText = texto;
            
            // Atualiza o input invisível e avisa o navegador que ele mudou
            inputEscondido.value = valor;
            inputEscondido.dispatchEvent(new Event('change'));

            // Fecha a caixa
            itemsContainer.classList.add('select-hide');
            selected.style.borderColor = '#444';
        });
    });

    // 4. Fechar o dropdown se clicar em qualquer lugar fora dele
    document.addEventListener('click', function(e) {
        if (!customSelect.contains(e.target)) {
            itemsContainer.classList.add('select-hide');
            selected.style.borderColor = '#444';
        }
    });
}
// 13. Lógica do Dropdown em Cascata (Consignação)
function iniciarFiltroModelosConsignacao() {
    const selectMarca = document.getElementById('consignacao-marca');
    const customSelectModelo = document.getElementById('custom-modelo-select');
    const selectedText = customSelectModelo ? customSelectModelo.querySelector('.select-selected') : null;
    const listaModelos = document.getElementById('lista-modelos-dropdown');
    const inputHiddenModelo = document.getElementById('consignacao-modelo-hidden');
    const containerOutroModelo = document.getElementById('container-outro-modelo');
    const inputOutroModelo = document.getElementById('consignacao-outro-modelo');

    if (!selectMarca || !customSelectModelo) return;

    // Mini Banco de Dados Simulado (Mock)
    const bancoDeCarros = {
        "Fiat": {
            "Argo": ["1.0", "Drive 1.0", "Trekking 1.3"],
            "Toro": ["Endurance 1.8", "Volcano 2.0 Diesel", "Ultra 2.0 Diesel"]
        },
        "Volkswagen": {
            "Polo": ["Track 1.0", "Comfortline 200 TSI", "Highline 200 TSI"],
            "Nivus": ["Comfortline", "Highline"]
        },
        "BMW": {
            "X4": ["xDrive 30i M Sport"],
            "Série 3": ["320i GP", "320i M Sport"]
        }
    };

    // 1. Quando o usuário escolhe a Marca
    selectMarca.addEventListener('change', function() {
        const marca = this.value;
        listaModelos.innerHTML = ''; // Limpa a lista anterior
        inputHiddenModelo.value = '';
        selectedText.innerText = 'Selecione o Modelo';
        containerOutroModelo.style.display = 'none';
        
        if (marca === "Outra") {
            customSelectModelo.classList.add('disabled');
            selectedText.innerText = 'Digite o modelo abaixo';
            inputHiddenModelo.value = 'Outro';
            containerOutroModelo.style.display = 'block';
            inputOutroModelo.required = true;
            return;
        }

        // Habilita o dropdown customizado
        customSelectModelo.classList.remove('disabled');

        // Gera o HTML da Sanfona baseado na marca escolhida
        const modelos = bancoDeCarros[marca] || {};
        for (const [modelo, versoes] of Object.entries(modelos)) {
            let htmlVersoes = '';
            versoes.forEach(versao => {
                htmlVersoes += `<div class="item-opcao" data-value="${modelo} - ${versao}">${versao}</div>`;
            });

            listaModelos.innerHTML += `
                <div class="grupo-modelo">
                    <div class="modelo-titulo">${modelo} <i class="fas fa-chevron-down"></i></div>
                    <div class="versoes-lista" style="display: none;">
                        ${htmlVersoes}
                    </div>
                </div>
            `;
        }

        // Adiciona a opção "Outros" no final da lista
        listaModelos.innerHTML += `<div class="item-opcao" data-value="Outro" style="font-weight: bold; text-align: center; background: #222;">Não encontrei meu modelo (Outros)</div>`;

        ativarInteracoesDoDropdown();
    });

    // 2. Controla os cliques dentro do dropdown customizado
    function ativarInteracoesDoDropdown() {
        const titulosModelo = customSelectModelo.querySelectorAll('.modelo-titulo');
        const opcoes = customSelectModelo.querySelectorAll('.item-opcao');

        titulosModelo.forEach(titulo => {
            titulo.addEventListener('click', function(e) {
                e.stopPropagation();
                const listaVersoes = this.nextElementSibling;
                const icone = this.querySelector('i');
                
                if (listaVersoes.style.display === 'none') {
                    listaVersoes.style.display = 'block';
                    icone.classList.replace('fa-chevron-down', 'fa-chevron-up');
                } else {
                    listaVersoes.style.display = 'none';
                    icone.classList.replace('fa-chevron-up', 'fa-chevron-down');
                }
            });
        });

        opcoes.forEach(opcao => {
            opcao.addEventListener('click', function(e) {
                e.stopPropagation();
                const valor = this.getAttribute('data-value');
                
                if (valor === "Outro") {
                    selectedText.innerText = "Outro Modelo";
                    inputHiddenModelo.value = "Outro";
                    containerOutroModelo.style.display = 'block';
                    inputOutroModelo.required = true;
                } else {
                    selectedText.innerText = valor;
                    inputHiddenModelo.value = valor;
                    containerOutroModelo.style.display = 'none';
                    inputOutroModelo.required = false;
                }

                listaModelos.classList.add('select-hide');
                selectedText.style.borderColor = '#444';
            });
        });
    }

    // 3. Abrir/Fechar a caixa principal
    selectedText.addEventListener('click', function(e) {
        if (customSelectModelo.classList.contains('disabled')) return;
        e.stopPropagation();
        listaModelos.classList.toggle('select-hide');
        selectedText.style.borderColor = listaModelos.classList.contains('select-hide') ? '#444' : 'var(--primary-color)';
    });

    // 4. Fechar se clicar fora
    document.addEventListener('click', function(e) {
        if (!customSelectModelo.contains(e.target) && listaModelos) {
            listaModelos.classList.add('select-hide');
            if (selectedText) selectedText.style.borderColor = '#444';
        }
    });
}