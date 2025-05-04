const API_BASE_URL = 'http://localhost:3000/api'; // Change this to your Vercel URL in production

class ProductService {
    static async fetchProducts(options = {}) {
        try {
            const { category = 'all', query = '', college = 'all' } = options;
            let url = `${API_BASE_URL}/products?`;
            
            if (category !== 'all') url += `category=${encodeURIComponent(category)}&`;
            if (query) url += `query=${encodeURIComponent(query)}&`;
            if (college !== 'all') url += `college=${encodeURIComponent(college)}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch products');
            
            const data = await response.json();
            return data.products;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    static async fetchFeaturedProducts() {
        try {
            const response = await fetch(`${API_BASE_URL}/featured-products`);
            if (!response.ok) throw new Error('Failed to fetch featured products');
            
            const data = await response.json();
            return data.products;
        } catch (error) {
            console.error('Error fetching featured products:', error);
            throw error;
        }
    }

    static renderProductCard(product) {
        return `
            <div class="product" onclick="window.location.href='product_interface.html?id=${product._id || product.id}&type=${encodeURIComponent(product.category ? product.category.toLowerCase() : '')}'">
                <div class="product-img" style="background-image: url('${product.images[0] || 'default-product.jpg'}')"></div>
                <div class="product-info">
                    <h3>${product.title}</h3>
                    <p class="price">₹${product.price}</p>
                    <p class="location">${product.college}</p>
                    ${product.distance ? `<p class="distance">${product.distance.toFixed(1)} km away</p>` : ''}
                </div>
                <button class="wishlist-btn" onclick="event.stopPropagation(); toggleWishlist(event, ${JSON.stringify(product)})">
                    <i class="fa-heart ${isInWishlist(product) ? 'fas' : 'far'}"></i>
                </button>
            </div>
        `;
    }
}
