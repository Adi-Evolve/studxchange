
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
        const isNote = product.category && product.category.toLowerCase() === 'notes';
        const isRoom = product.category && (product.category.toLowerCase().includes('room') || product.category.toLowerCase().includes('hostel'));
        const handleClick = isNote
            ? `sessionStorage.setItem('selectedNote', JSON.stringify(${JSON.stringify(product)})); window.location.href='productinterface.html';`
            : `window.location.href='productinterface.html?id=${product._id || product.id || ''}'`;
        const imgUrl = (product.images && product.images[0]) ? product.images[0] : 'https://via.placeholder.com/320x200?text=No+Image';
        if (isNote) {
            // Notes Card
            return `
            <div class="notes-card" onclick="${handleClick}">
                <div class="notes-image-container">
                    <img class="notes-image" src="${imgUrl}" alt="Notes Image" onerror="this.onerror=null;this.src='https://via.placeholder.com/90x90?text=No+Image';">
                </div>
                <div class="notes-title">${product.title || 'Untitled Note'}</div>
                <div class="notes-price">₹${product.price || 'Free'}</div>
                <div class="notes-info">${product.college ? `<span><i class='fa fa-university'></i> ${product.college}</span><br>` : ''}${product.subject ? `<span><i class='fa fa-book'></i> ${product.subject}</span><br>` : ''}${product.description ? `<span>${product.description.substring(0, 60)}...</span>` : ''}</div>
                <button class="notes-buynow-btn">Buy Now</button>
            </div>
            `;
        } else if (isRoom) {
            // Room Card
            return `
            <div class="room-card" onclick="${handleClick}">
                <div class="room-image-container">
                    <img class="room-image" src="${imgUrl}" alt="Room Image" onerror="this.onerror=null;this.src='https://via.placeholder.com/90x90?text=No+Image';">
                </div>
                <div class="room-title">${product.title || 'Room/Hostel'}</div>
                <div class="room-price">₹${product.price || 'N/A'}</div>
                <div class="room-info">
                    ${product.college ? `<span><i class='fa fa-university'></i> ${product.college}</span><br>` : ''}
                    ${product.roomType ? `<span><i class='fa fa-bed'></i> ${product.roomType}</span><br>` : ''}
                    ${product.furnishing ? `<span><i class='fa fa-couch'></i> ${product.furnishing}</span><br>` : ''}
                    ${product.facilities ? `<span><i class='fa fa-bath'></i> ${product.facilities}</span><br>` : ''}
                    ${product.address ? `<span><i class='fa fa-map-marker-alt'></i> ${product.address}</span><br>` : ''}
                    ${product.availableFrom ? `<span><i class='fa fa-calendar'></i> Avail. from: ${product.availableFrom}</span><br>` : ''}
                </div>
                <div class="room-accessibility">
                    ${product.accessibility ? product.accessibility.map(a => `<span title="${a}"><i class="fa fa-wheelchair"></i></span>`).join(' ') : ''}
                </div>
                ${product.distance ? `<div class="room-distance"><i class="fa fa-location-arrow"></i> ${product.distance.toFixed(1)} km away</div>` : ''}
                <button class="room-buynow-btn">Contact</button>
            </div>
            `;
        } else {
            // Regular Product Card
            return `
            <div class="product-card" onclick="${handleClick}">
                <div class="product-image-container">
                    <img class="product-image" src="${imgUrl}" alt="Product Image" onerror="this.onerror=null;this.src='https://via.placeholder.com/90x90?text=No+Image';">
                </div>
                <div class="product-title">${product.title || 'Untitled'}</div>
                <div class="product-price">₹${product.price || 'N/A'}</div>
                <div class="product-info">
                    ${product.college ? `<span><i class='fa fa-university'></i> ${product.college}</span><br>` : ''}
                    ${product.category ? `<span class="badge bg-primary">${product.category}</span> ` : ''}
                    ${product.condition ? `<span><i class='fa fa-star'></i> ${product.condition}</span><br>` : ''}
                    ${product.description ? `<span>${product.description.substring(0, 60)}...</span>` : ''}
                </div>
                ${product.distance ? `<div class="distance"><i class="fa fa-location-arrow"></i> ${product.distance.toFixed(1)} km away</div>` : ''}
                <button class="product-buynow-btn">View</button>
            </div>
            `;
        }
    }
}
