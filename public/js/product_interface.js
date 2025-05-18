// Fetch and display product/room/note details from Supabase for StudXchange

// Helper: Get query param
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Fetch all collections in parallel from Supabase
async function fetchAllData() {
    const supabase = window.supabaseClient;
    if (!supabase) throw new Error('Supabase client not initialized');
    const [{ data: products, error: prodErr }, { data: rooms, error: roomErr }, { data: notes, error: noteErr }] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('rooms').select('*'),
        supabase.from('notes').select('*')
    ]);
    if (prodErr || roomErr || noteErr) {
        throw new Error('Failed to fetch data from Supabase');
    }
    return { products, rooms, notes };
}

// Find item by id in any collection
function findItemById(data, id) {
    let item = data.products.find(p => p._id === id || p.id === id);
    if (item) { item._type = 'product'; return item; }
    item = data.rooms.find(r => r._id === id || r.id === id);
    if (item) { item._type = 'room'; return item; }
    item = data.notes.find(n => n._id === id || n.id === id);
    if (item) { item._type = 'note'; return item; }
    return null;
}

// Render product/room/note detail
function renderDetail(item) {
    const container = document.getElementById('productDetailContainer');
    if (!container) return;
    let imagesHtml = '';
    const placeholderImg = 'https://via.placeholder.com/370x320?text=No+Image';
    if (item.images && item.images.length) {
        imagesHtml = `
            <div class="main-image-wrapper">
                <img id="mainProductImage" src="${item.images[0] || placeholderImg}" alt="Product Image" class="main-product-image" onerror="this.onerror=null;this.src='https://via.placeholder.com/370x320?text=No+Image';">
            </div>
            <div class="thumbnail-row">
                ${item.images.map((img, idx) => `<img src="${img || placeholderImg}" alt="Thumbnail" class="thumbnail-img" onclick="updateMainImage('${img || placeholderImg}')" onerror="this.onerror=null;this.src='https://via.placeholder.com/370x320?text=No+Image';">`).join('')}
            </div>
        `;
    } else {
        imagesHtml = `<div class="main-image-wrapper"><img id="mainProductImage" src="${placeholderImg}" alt="No Image" class="main-product-image"></div>`;
    }
    let mapHtml = '';
    // Support both object and string for location
    let locObj = item.location;
    if (typeof locObj === 'string') {
        try {
            locObj = JSON.parse(locObj);
        } catch (e) { locObj = null; }
    }
    if (locObj && typeof locObj.lat === 'number' && typeof locObj.lon === 'number') {
        mapHtml = `<div id="productMap" class="map-container"></div>`;
    }
    // Render logic by type
    if (item._type === 'room' || (item.category && item.category.toLowerCase() === 'room')) {
        // --- ROOM DETAIL ---
        container.innerHTML = `
            <div class="product-images">
                ${imagesHtml}
                ${mapHtml}
            </div>
            <div class="product-info">
                <div class="product-title">${item.title || 'Untitled Room'}</div>
                <div class="product-price">₹${item.price || 'N/A'} / month</div>
                <div class="product-meta">
                    <span><b>College:</b> ${item.college || 'N/A'}</span>
                    <span><b>Room Type:</b> ${item.roomType || 'N/A'}</span>
                    <span><b>Furnishing:</b> ${item.furnishing || 'N/A'}</span>
                    <span><b>Available from:</b> ${item.availableFrom || 'N/A'}</span>
                    <span><b>Facilities:</b> ${item.facilities || 'N/A'}</span>
                    <span><b>Address:</b> ${item.address || 'N/A'}</span>
                </div>
                <div class="product-buttons">
                    <button class="btn btn-success" onclick="contactRoomSeller()">Contact Seller</button>
                    <button class="btn btn-secondary" onclick="showCompare()">Compare</button>
                </div>
                <div class="product-description">${item.description || ''}</div>
                <div class="room-rating-section" style="margin-top:18px;">
                    <label for="roomRating"><b>Rate this Room:</b></label>
                    <select id="roomRating" onchange="submitRoomRating('${item._id || item.id}')" class="form-select" style="width:120px;display:inline-block;margin-left:10px;">
                        <option value="">Select</option>
                        <option value="1">1 ★</option>
                        <option value="2">2 ★★</option>
                        <option value="3">3 ★★★</option>
                        <option value="4">4 ★★★★</option>
                        <option value="5">5 ★★★★★</option>
                    </select>
                    <span id="roomRatingMsg" style="margin-left:10px;color:#2a3d56;font-weight:500;"></span>
                </div>
            </div>
        `;
        if (mapHtml) setTimeout(() => renderMap(item.location), 100);
        return;
    }
    if (item._type === 'note' || (item.category && item.category.toLowerCase() === 'notes')) {
        // --- NOTE DETAIL (Buy Now only) ---
        container.innerHTML = `
            <div class="product-images">
                ${imagesHtml}
            </div>
            <div class="product-info">
                <div class="product-title">${item.title || 'Untitled Note'}</div>
                <div class="product-price">₹${item.price || 'Free'}</div>
                <div class="product-buttons">
                    <button class="btn btn-success" onclick="downloadNotePdf('${item.pdfUrl || ''}')">Buy Now</button>
                </div>
                <div class="product-description">${item.description || ''}</div>
            </div>
        `;
        return;
    }
    // --- PRODUCT DETAIL (default) ---
    container.innerHTML = `
        <div class="product-images">
            ${imagesHtml}
            ${mapHtml}
        </div>
        <div class="product-info">
            <div class="product-title">${item.title || 'Untitled'}</div>
            <div class="product-price">₹${item.price || 'N/A'}</div>
            <div class="product-meta">
                <span><b>Category:</b> ${item.category || item._type}</span>
                <span><b>College:</b> ${item.college || 'N/A'}</span>
                ${item.condition ? `<span><b>Condition:</b> ${item.condition}</span>` : ''}
            </div>
            <div class="product-buttons">
                <button class="btn btn-success" onclick="buyNow()">Buy Now</button>
                <button class="btn btn-info" onclick="showSellerInfo()">Seller Info</button>
                <button class="btn btn-secondary" onclick="showCompare()">Compare</button>
            </div>
            <div class="product-description">${item.description || ''}</div>
        </div>
    `;
    if (mapHtml) {
        setTimeout(() => renderMap(locObj), 100);
    }
}

// Map rendering using Leaflet
function renderMap(location) {
    if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
        const mapDiv = document.getElementById('productMap');
        if (mapDiv) mapDiv.innerHTML = '<div style="padding:20px;color:#888;text-align:center;">Location not available</div>';
        return;
    }
    // Remove any existing map instance
    if (window._leafletMap) {
        window._leafletMap.remove();
        window._leafletMap = null;
    }
    const map = L.map('productMap').setView([location.lat, location.lon], 15);
    window._leafletMap = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([location.lat, location.lon]).addTo(map);
    setTimeout(() => map.invalidateSize(), 200);
}

// Contact Seller for Room (WhatsApp)
function contactRoomSeller() {
    if (!window.currentItem) return;
    const phone = window.currentItem.sellerPhone || window.currentItem.sellerContact || '';
    if (!phone) return alert('Seller phone not available');
    const msg = encodeURIComponent(`Hi, I am interested in renting the room: ${window.currentItem.title}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}
// Room Rating Submission
function submitRoomRating(roomId) {
    const rating = document.getElementById('roomRating').value;
    if (!rating) return;
    // Simulate rating submission (could POST to API here)
    document.getElementById('roomRatingMsg').innerText = `Thanks for rating! (${rating}★)`;
    setTimeout(() => { document.getElementById('roomRatingMsg').innerText = ''; }, 2500);
}
// Notes: Direct PDF Download
function downloadNotePdf(pdfUrl) {
    if (!pdfUrl) return alert('PDF not available');
    window.open(pdfUrl, '_blank');
}
// Buy Now button: WhatsApp redirect
function buyNow() {
    if (!window.currentItem) return;
    const phone = window.currentItem.sellerPhone || window.currentItem.sellerContact || '';
    if (!phone) return alert('Seller phone not available');
    const msg = encodeURIComponent(`Hi, I am interested in buying the product: ${window.currentItem.title}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

// Seller Info Modal
function showSellerInfo() {
    const modal = new bootstrap.Modal(document.getElementById('sellerInfoModal'));
    const c = window.currentItem || {};
    let html = `<b>Name:</b> ${c.sellerName || 'N/A'}<br>
                <b>Email:</b> ${c.sellerEmail || 'N/A'}<br>
                <b>Phone:</b> ${c.sellerPhone || 'N/A'}<br>
                <b>College:</b> ${c.college || 'N/A'}<br>`;
    // Optionally: fetch and show seller's past sold items
    document.getElementById('sellerInfoContent').innerHTML = html + '<hr><b>Past Sold Items:</b><div id="sellerSoldItems">Loading...</div>';
    modal.show();
    fetchSellerSoldItems();
}

async function fetchSellerSoldItems() {
    const c = window.currentItem || {};
    if (!c.sellerEmail) return document.getElementById('sellerSoldItems').innerHTML = 'No records.';
    // Example endpoint: /api/sold-items?sellerEmail=...
    try {
        const resp = await fetch(`${API_BASE_URL}/sold-items?sellerEmail=${encodeURIComponent(c.sellerEmail)}`);
        const items = await resp.json();
        if (!items.length) return document.getElementById('sellerSoldItems').innerHTML = 'No records.';
        document.getElementById('sellerSoldItems').innerHTML = items.map(i => `<div>${i.title} - ₹${i.price}</div>`).join('');
    } catch {
        document.getElementById('sellerSoldItems').innerHTML = 'Could not load.';
    }
}

// Compare Modal
function showCompare() {
    const modal = new bootstrap.Modal(document.getElementById('compareModal'));
    document.getElementById('compareContent').innerHTML = `<div>
        <b>Compare Products</b><br>
        <input id="compareSearch" class="form-control" placeholder="Search product..." oninput="searchCompareProducts()">
        <div id="compareSuggestions" style="max-height:120px;overflow:auto;margin:10px 0;"></div>
        <div id="compareTable" style="margin-top:10px;"></div>
    </div>`;
    renderCompareSuggestions();
    renderCompareTable([window.currentItem]);
    modal.show();
}

let allDataCache = null;

function renderCompareSuggestions() {
    const suggestions = (allDataCache?.products || []).slice(0, 5)
        .filter(p => p._id !== window.currentItem._id)
        .map(p => `<div onclick="addCompareProduct('${p._id}')" style="cursor:pointer;padding:3px 0;">${p.title}</div>`).join('');
    document.getElementById('compareSuggestions').innerHTML = suggestions;
}

async function searchCompareProducts() {
    const val = document.getElementById('compareSearch').value.toLowerCase();
    const found = (allDataCache?.products || []).filter(p => p.title.toLowerCase().includes(val) && p._id !== window.currentItem._id);
    document.getElementById('compareSuggestions').innerHTML = found.map(p => `<div onclick="addCompareProduct('${p._id}')" style="cursor:pointer;padding:3px 0;">${p.title}</div>`).join('');
}

let compareList = [];
function addCompareProduct(id) {
    const p = allDataCache.products.find(x => x._id === id);
    if (!p) return;
    if (!compareList.some(x => x._id === id)) compareList.push(p);
    renderCompareTable([window.currentItem, ...compareList]);
}
function renderCompareTable(products) {
    if (!products.length) return;
    let html = `<table class="table table-bordered"><thead><tr><th>Title</th><th>Price</th><th>Category</th><th>College</th></tr></thead><tbody>`;
    html += products.map(p => `<tr><td>${p.title}</td><td>₹${p.price}</td><td>${p.category}</td><td>${p.college}</td></tr>`).join('');
    html += '</tbody></table>';
    document.getElementById('compareTable').innerHTML = html;
}

// Main loader
window.addEventListener('DOMContentLoaded', async () => {
    const id = getQueryParam('id');
    let item = null;
    if (id) {
        allDataCache = await fetchAllData();
        item = findItemById(allDataCache, id);
        if (!item) {
            document.getElementById('productDetailContainer').innerHTML = '<div class="alert alert-danger">Product not found.</div>';
            return;
        }
    } else {
        // Try loading note from sessionStorage (for PDF/notes navigation)
        const noteStr = sessionStorage.getItem('selectedNote');
        if (noteStr) {
            try {
                item = JSON.parse(noteStr);
                item._type = 'note';
            } catch {
                item = null;
            }
        }
        if (!item) {
            document.getElementById('productDetailContainer').innerHTML = '<div class="alert alert-warning">No product selected.</div>';
            return;
        }
    }
    window.currentItem = item;
    renderDetail(item);
});
