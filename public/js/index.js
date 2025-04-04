document.addEventListener('DOMContentLoaded', async () => {
    try {
        const featuredContainer = document.getElementById('featured-products');
        if (!featuredContainer) return;

        featuredContainer.innerHTML = '<div class="loading">Loading featured products...</div>';

        const products = await ProductService.fetchFeaturedProducts();
        
        if (products.length === 0) {
            featuredContainer.innerHTML = '<p>No featured products available.</p>';
            return;
        }

        featuredContainer.innerHTML = products
            .map(product => ProductService.renderProductCard(product))
            .join('');
    } catch (error) {
        console.error('Error loading featured products:', error);
        document.getElementById('featured-products').innerHTML = 
            '<p class="error">Failed to load featured products. Please try again later.</p>';
    }
});