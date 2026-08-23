// Replaces mock stock with Boom data when the backend proxy is configured.
// Failures are intentionally non-fatal so the site can still render with fallback data.
(async function(){
    async function normalizeVehicle(v) {
        const firstGallery = Array.isArray(v.galeria) ? v.galeria.find(item => item && item.veiculo_galeria_url) : null;
        const galleryImage = firstGallery ? `https://arquivos.boomsistemas.com.br/veiculos/${firstGallery.veiculo_galeria_url}` : null;
        const kmValue = v.km || v.kilometragem || v.veiculo_km || v.KM;
        const priceValue = v.preco || v.price || v.preco_venda || v.Price || v.veiculo_valor || v.valor;
        const normalizedPrice = typeof priceValue === 'number'
            ? priceValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : (priceValue || 'Sob consulta');
        const normalizedKm = kmValue
            ? (typeof kmValue === 'string' && /km/i.test(kmValue) ? kmValue : `${kmValue} km`)
            : '0 km';

        // Best-effort normalization from common API shapes
        return {
            id: v.id || v.Id || v.codigo || v.Codigo || v.codigo_veiculo || v.veiculo_id || Math.random()*1000000,
            marca: v.marca || v.brand || v.make || v.Marca || v.Brand || v.veiculo_marca_nome || 'Marca',
            modelo: v.modelo || v.model || v.Modelo || v.Model || v.veiculo_modelo_nome || 'Modelo',
            versao: v.versao || v.version || v.Versao || v.veiculo_versao || '',
            ano: v.ano || v.year || v.ano_fabricacao || v.Year || v.veiculo_ano || '',
            km: normalizedKm,
            cambio: v.cambio || v.transmission || v.Cambio || '',
            preco: normalizedPrice,
            foto: v.fotoUrl || galleryImage || v.foto || v.image || v.photo || v.imagem || 'imagens/img_carros/default.jpg',
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
