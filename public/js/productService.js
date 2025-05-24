
class ProductService {
    static async fetchProducts(options = {}) {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) throw new Error('Supabase client not initialized');
            const { category = 'all', query = '', college = 'all' } = options;
            let queryBuilder = supabase.from('products').select('*');
            if (category !== 'all') queryBuilder = queryBuilder.eq('category', category);
            if (college !== 'all') queryBuilder = queryBuilder.eq('college', college);
            // For search queries, use ilike for case-insensitive partial match
            if (query) queryBuilder = queryBuilder.ilike('title', `%${query}%`);
            const { data: products, error } = await queryBuilder.order('createdAt', { ascending: false });
            if (error) throw new Error('Failed to fetch products: ' + error.message);
            return products || [];
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    static async fetchFeaturedProducts() {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) throw new Error('Supabase client not initialized');
            // Fetch featured products (assuming a 'featured' boolean column or similar logic)
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .eq('featured', true)
                .order('createdAt', { ascending: false });
            if (error) throw new Error('Failed to fetch featured products: ' + error.message);
            return products || [];
        } catch (error) {
            console.error('Error fetching featured products:', error);
            throw error;
        }
    }

    static renderProductCard(product) {
        // Determine source table if available, otherwise fall back to category logic
        let source = product.source || '';
        if (!source) {
            if (product.category && product.category.toLowerCase() === 'notes') source = 'notes';
            else if (product.category && (product.category.toLowerCase().includes('room') || product.category.toLowerCase().includes('hostel'))) source = 'rooms';
            else source = 'products';
        }
        let handleClick = '';
        if (source === 'products') {
            handleClick = `window.location.href='productinterface.html?id=${product._id || product.id || ''}';`;
        } else if (source === 'rooms') {
            handleClick = `window.location.href='roominterface.html?id=${product._id || product.id || ''}';`;
        } else if (source === 'notes') {
            handleClick = `window.location.href='notes_interface.html?id=${product._id || product.id || ''}';`;
        } else {
            handleClick = `window.location.href='productinterface.html?id=${product._id || product.id || ''}';`;
        }
        const imgUrl = (product.images && product.images[0]) ? product.images[0] : 'https://via.placeholder.com/320x200?text=No+Image';
        if (isNote) {
    // Notes Card - always clickable, opens noteinterface.html
    return `
    <div class="notes-card" data-id="${product._id || product.id || ''}" data-type="notes" onclick="${handleClick}">
        <div class="notes-image-container">
            <img class="notes-image" src="${imgUrl}" alt="Notes Image" onerror="this.onerror=null;this.src='https://via.placeholder.com/90x90?text=No+Image';">
        </div>
        <div class="notes-title">${product.title || 'Untitled Note'}</div>
        <div class="notes-price">₹${product.price || 'Free'}</div>
        <div class="notes-info">${product.college ? `<span><i class='fa fa-university'></i> ${product.college}</span><br>` : ''}${product.subject ? `<span><i class='fa fa-book'></i> ${product.subject}</span><br>` : ''}${product.description ? `<span>${product.description.substring(0, 60)}...</span>` : ''}</div>
        <button class="notes-buynow-btn" onclick="event.stopPropagation();${handleClick}">Buy Now</button>
    </div>
    `;
} else if (isRoom) {
            // Room Card
            return `
            <div class="room-card" data-id="${product._id || product.id || ''}" data-type="rooms" onclick="${handleClick}">
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
                <button class="room-buynow-btn" onclick="event.stopPropagation();${handleClick}">Contact</button>
            </div>
            `;
        } else {
            // Regular Product Card
            return `
            <div class="product-card" data-id="${product._id || product.id || ''}" data-type="products" onclick="${handleClick}">
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
                <button class="product-buynow-btn" onclick="event.stopPropagation();${handleClick}">View</button>
            </div>
            `;
        }
    }
}
