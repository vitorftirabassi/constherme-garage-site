// Loads stock exclusively from the Boom backend proxy.
(async function(){
    async function normalizeVehicle(v) {
        const firstGallery = Array.isArray(v.galeria) ? v.galeria.find(item => item && (item.url_imagem || item.veiculo_galeria_url)) : null;
        const galleryImage = firstGallery ? (firstGallery.url_imagem || `https://arquivos.boomsistemas.com.br/veiculos/${firstGallery.veiculo_galeria_url}`) : null;
        const kmValue = v.km || v.kilometragem || v.veiculo_km || v.KM;
        const priceValue = v.preco || v.price || v.preco_venda || v.Price || v.veiculo_valor || v.veiculo_valor_venda || v.valor;
        const numericPrice = Number(String(priceValue || '').replace(',', '.'));
        const normalizedPrice = Number.isFinite(numericPrice) && numericPrice > 0
            ? numericPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : (priceValue || 'Sob consulta');
        const normalizedKm = kmValue
            ? (typeof kmValue === 'string' && /km/i.test(kmValue) ? kmValue : `${kmValue} km`)
            : '0 km';

        // Best-effort normalization from common API shapes
        return {
            id: v.id || v.Id || v.codigo || v.Codigo || v.codigo_veiculo || v.veiculo_id || Math.random()*1000000,
            marca: v.marca || v.brand || v.make || v.Marca || v.Brand || v.veiculo_marca_nome || 'Marca',
            modelo: v.modelo || v.model || v.Modelo || v.Model || v.veiculo_modelo_nome || v.veiculo_modelo || 'Modelo',
            versao: v.versao || v.version || v.Versao || v.veiculo_versao || v.veiculo_descricao || '',
            ano: v.ano || v.year || v.ano_fabricacao || v.Year || v.veiculo_ano || v.veiculo_ano_mod || '',
            km: normalizedKm,
            cambio: v.cambio || v.transmission || v.Cambio || v.veiculo_cambio || '',
            preco: normalizedPrice,
            foto: v.fotoUrl || galleryImage || v.foto || v.image || v.photo || v.imagem || 'imagens/img_carros/default.jpg',
            tags: v.tags || v.tags_list || (v.veiculo_zerokm === '1' ? ['Zero km'] : []),
            especificacoes: v.especificacoes || {
                motor: v.veiculo_motor || 'Não informado',
                potencia: v.veiculo_potencia ? `${v.veiculo_potencia} cv` : 'Não informado',
                cor: v.veiculo_cor || 'Não informado',
                portas: v.veiculo_portas ? `${v.veiculo_portas} portas` : 'Não informado',
                blindado: v.veiculo_blindado === '1' || v.veiculo_blindado === true ? 'Sim' : 'Não',
                combustivel: v.veiculo_combustivel || 'Não informado'
            },
            opcionais: Array.isArray(v.opcionais) ? v.opcionais : []
        };
    }

    async function fetchAndRender() {
        try {
            const resp = await fetch('/api/boom-stock');
            if (!resp.ok) return;
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

            if (typeof atualizarEstoqueBoom === 'function') atualizarEstoqueBoom(carros);

        } catch (err) {
            console.error('Erro ao buscar estoque Boom:', err);
        }
    }

    // script.js is loaded before this file, so stock can be fetched as soon as the DOM is ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fetchAndRender);
    } else {
        fetchAndRender();
    }
})();
