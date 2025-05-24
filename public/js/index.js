document.addEventListener('DOMContentLoaded', async () => {
    try {
        const featuredContainer = document.getElementById('featured-products');
        if (!featuredContainer) return;

        featuredContainer.innerHTML = '<div class="loading">Loading featured products...</div>';

        const products = await ProductService.fetchFeaturedProducts();
        if (!products || products.length === 0) {
            featuredContainer.innerHTML = '<p>No featured products available.</p>';
            return;
        }

        featuredContainer.innerHTML = products
            .map(product => ProductService.renderProductCard(product))
            .join('');

        // Delegated click handler for all cards
        featuredContainer.addEventListener('click', function(e) {
            let card = e.target.closest('.product-card, .room-card, .notes-card');
            if (!card || e.target.tagName === 'BUTTON') return;
            const id = card.getAttribute('data-id');
            const type = card.getAttribute('data-type');
            if (type === 'products') {
                window.location.href = `productinterface.html?id=${id}`;
            } else if (type === 'rooms') {
                window.location.href = `roominterface.html?id=${id}`;
            } else if (type === 'notes') {
                window.location.href = `notes_interface.html?id=${id}`;
            } else {
                window.location.href = `productinterface.html?id=${id}`;
            }
        });
    } catch (error) {
        console.error('Error loading featured products:', error);
        document.getElementById('featured-products').innerHTML = 
            '<p class="error">Failed to load featured products. Please try again later.</p>';
    }
});