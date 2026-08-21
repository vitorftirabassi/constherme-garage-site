// Replaces mock stock with Boom data when the backend proxy is configured.
// Failures are intentionally non-fatal so the site can still render with fallback data.
(async function(){
    async function normalizeVehicle(v) {
        // Best-effort normalization from common API shapes
        return {
            id: v.id || v.Id || v.codigo || v.Codigo || v.codigo_veiculo || Math.random()*1000000,
            marca: v.marca || v.brand || v.make || v.Marca || v.Brand || 'Marca',
            modelo: v.modelo || v.model || v.Modelo || v.Model || 'Modelo',
            versao: v.versao || v.version || v.Versao || '',
            ano: v.ano || v.year || v.ano_fabricacao || v.Year || '',
            km: v.km || v.kilometragem || v.mileage || v.KM || '0 km',
            cambio: v.cambio || v.transmission || v.Cambio || '',
            preco: v.preco || v.price || v.preco_venda || v.Price || 'Sob consulta',
            foto: v.foto || v.image || v.photo || v.imagem || 'imagens/img_carros/default.jpg',
            tags: v.tags || v.tags_list || [],
            especificacoes: v.especificacoes || {}
        };
    }

    async function fetchAndRender() {
        try {
            const resp = await fetch('/api/boom-stock');
            if (!resp.ok) return; // silent fail — keeps mock data
            const data = await resp.json();

            // Attempt to find array of vehicles in common locations
            let list = [];
            if (Array.isArray(data)) list = data;
            else if (Array.isArray(data.vehicles)) list = data.vehicles;
            else if (Array.isArray(data.lista) ) list = data.lista;
            else if (Array.isArray(data.fullestoque)) list = data.fullestoque;
            else if (Array.isArray(data.data)) list = data.data;
            else {
                // try to heuristically find the largest array value
                for (const k in data) {
                    if (Array.isArray(data[k]) && data[k].length > list.length) list = data[k];
                }
            }

            if (!list || list.length === 0) return;

            const carros = await Promise.all(list.map(normalizeVehicle));

            // Update estoque page if present
            if (typeof renderizarEstoquePagina === 'function') renderizarEstoquePagina(carros);

            // Update home swiper grid if present
            const grid = document.getElementById('grid-carros');
            if (grid) {
                grid.innerHTML = '';
                carros.forEach(carro => {
                    const cardHtml = gerarHTMLCard(carro);
                    grid.innerHTML += `<div class="swiper-slide">${cardHtml}</div>`;
                });
                if (typeof iniciarSwiper === 'function') iniciarSwiper();
            }

        } catch (err) {
            console.error('Erro ao buscar estoque Boom:', err);
        }
    }

    // Wait a short time to ensure original script.js has defined its functions
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(fetchAndRender, 300));
    } else {
        setTimeout(fetchAndRender, 300);
    }
})();
