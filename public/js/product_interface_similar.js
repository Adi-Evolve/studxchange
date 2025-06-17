// Infinite scroll for similar products (vertical, by category)
let similarProductsPage = 0;
let similarProductsLoading = false;
let similarProductsDone = false;
let loadedSimilarProductIds = new Set();

async function fetchSimilarProductsPaginated(product, page = 0, pageSize = 8) {
    if (!window.supabaseClient || !product || !product.category) return [];
    let query = window.supabaseClient.from('products').select('*')
        .eq('category', product.category)
        .neq('id', product.id)
        .eq('is_sold', false);
    const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data) return [];
    return data;
}

async function loadMoreSimilarProducts(product) {
    if (similarProductsLoading || similarProductsDone) return;
    similarProductsLoading = true;
    const products = await fetchSimilarProductsPaginated(product, similarProductsPage);
    if (!products.length) {
        similarProductsDone = true;
        return;
    }
    const container = document.getElementById('similarProducts');
    products.forEach(p => {
        if (loadedSimilarProductIds.has(p.id)) return;
        loadedSimilarProductIds.add(p.id);
        const card = document.createElement('div');
        card.className = 'similar-product-card';
        card.innerHTML = `
            <img src="${(p.images && p.images[0]) || p.image || 'https://via.placeholder.com/120x120?text=No+Image'}" alt="Similar Product" />
            <div class="similar-product-title">${p.title}</div>
            <div class="similar-product-price">₹${p.price}</div>
            <a href="productinterface.html?id=${p.id}" class="similar-product-link">View Details</a>
        `;
        container.appendChild(card);
    });
    similarProductsPage++;
    similarProductsLoading = false;
}

function setupSimilarProductsInfiniteScroll(product) {
    const container = document.getElementById('similarProducts');
    if (!container) return;
    container.onscroll = function() {
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
            loadMoreSimilarProducts(product);
        }
    };
    // Initial load
    loadMoreSimilarProducts(product);
}

// Patch renderProduct to call infinite scroll setup
const origRenderProduct = window.renderProduct;
window.renderProduct = async function() {
    await origRenderProduct();
    const prod = window.productDetails;
    if (prod) {
        // Reset state if navigating to a new product
        similarProductsPage = 0;
        similarProductsLoading = false;
        similarProductsDone = false;
        loadedSimilarProductIds = new Set();
        const container = document.getElementById('similarProducts');
        if (container) container.innerHTML = '';
        setupSimilarProductsInfiniteScroll(prod);
    }
};
