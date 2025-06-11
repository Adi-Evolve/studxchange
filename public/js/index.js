document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fill the new horizontally scrollable row with .product-card cards
        const featuredRow = document.getElementById('featuredScrollRow');
        if (!featuredRow) return;

        featuredRow.innerHTML = '<div class="loading">Loading featured products...</div>';

        const products = await ProductService.fetchFeaturedProducts();
        if (!products || products.length === 0) {
            featuredRow.innerHTML = '<p>No featured products available.</p>';
            return;
        }

        featuredRow.innerHTML = products
            .map(product => ProductService.renderProductCard(product))
            .join('');

        // Delegated click handler for all .product-card cards in the scroll row
        featuredRow.addEventListener('click', function(e) {
            let card = e.target.closest('.product-card');
            if (!card || e.target.tagName === 'BUTTON') return;
            const id = card.getAttribute('data-id');
            const type = card.getAttribute('data-type');
            if (type === 'products') {
                window.location.href = `productinterface.html?id=${id}`;
            } else if (type === 'rooms') {
                window.location.href = `room_interface.html?id=${id}`;
            } else if (type === 'notes') {
                window.location.href = `notes_interface.html?id=${id}`;
            } else {
                window.location.href = `productinterface.html?id=${id}`;
            }
        });
    } catch (error) {
        
        document.getElementById('featured-products').innerHTML = 
            '<p class="error">Failed to load featured products. Please try again later.</p>';
    }
});