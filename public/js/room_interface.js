// room_interface.js

// Render room detail page in same style as product detail

function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

async function fetchRoomById(roomId) {
    const supabase = window.supabaseClient;
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    if (error) throw new Error('Failed to fetch room: ' + error.message);
    // Fetch owner info from users table using seller_id or owner_id
    const ownerId = data.seller_id || data.owner_id;
    if (ownerId) {
        const { data: user, error: userErr } = await supabase
            .from('users')
            .select('name')
            .eq('id', ownerId)
            .single();
        if (!userErr && user) {
            data.ownerName = user.name || '';
        }
    }
    return data;
}

// Infinite scroll for similar rooms
let similarRoomsPage = 0;
let similarRoomsLoading = false;
let similarRoomsDone = false;
let loadedSimilarRoomIds = new Set();
async function fetchSimilarRooms(room, page = 0, pageSize = 8) {
    const supabase = window.supabaseClient;
    if (!supabase) return [];
    let query = supabase.from('rooms').select('*').neq('id', room.id);
    if (room.college) query = query.eq('college', room.college);
    const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data) return [];
    return data;
}
async function loadMoreSimilarRooms(room) {
    if (similarRoomsLoading || similarRoomsDone) return;
    similarRoomsLoading = true;
    const rooms = await fetchSimilarRooms(room, similarRoomsPage);
    if (!rooms.length) {
        similarRoomsDone = true;
        return;
    }
    const container = document.getElementById('similarRoomsScroll');
    rooms.forEach(rm => {
        if (loadedSimilarRoomIds.has(rm.id)) return;
        loadedSimilarRoomIds.add(rm.id);
        const card = document.createElement('div');
        card.className = 'similar-product-card';
        card.innerHTML = `
            <img src="${(rm.images && rm.images[0]) || rm.image || 'https://via.placeholder.com/120x120?text=No+Image'}" alt="Similar Room" />
            <div class="similar-product-title">${rm.title || rm.roomName || 'Untitled'}</div>
            <div class="similar-product-price">₹${rm.price || rm.fees || 'N/A'}</div>
            <a href="room_interface.html?id=${rm.id}" class="similar-product-link">View Details</a>
        `;
        container.appendChild(card);
    });
    similarRoomsPage++;
    similarRoomsLoading = false;
}
function setupSimilarRoomsInfiniteScroll(room) {
    const container = document.getElementById('similarRoomsScroll');
    if (!container) return;
    container.onscroll = function() {
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 50) {
            loadMoreSimilarRooms(room);
        }
    };
    // Initial load
    loadMoreSimilarRooms(room);
}
// Old function for reference
//
async function renderRoom(room) {
    const mainSection = document.getElementById('roomMainSection');
    if (!mainSection) return;
    let images = room.images || [];
    if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch {}
    }
    if (!Array.isArray(images)) images = [];
    const placeholderImg = 'https://via.placeholder.com/370x320?text=No+Image';
    // Location string
    let locationStr = '';
    if (room.location) {
        let loc = room.location;
        if (typeof loc === 'string') {
            try { loc = JSON.parse(loc); } catch {}
        }
        if (loc && loc.name) locationStr = loc.name;
        else if (loc && loc.lat && loc.lon) locationStr = `Lat: ${loc.lat}, Lon: ${loc.lon}`;
        else locationStr = room.location;
    }
    // Main image and thumbnails
    let imagesHtml = '';
    if (images.length) {
        imagesHtml = `
            <div class="product-images">
                <img id="mainRoomImage" src="${images[0] || placeholderImg}" alt="Room Image" class="main-product-image" onerror="this.onerror=null;this.src='${placeholderImg}';">
                <div class="product-secondary-imgs">
                    ${images.map((img, idx) => `<img src="${img || placeholderImg}" alt="Thumbnail" class="thumbnail-img" onclick="updateMainRoomImage('${img || placeholderImg}')" onerror="this.onerror=null;this.src='${placeholderImg}';">`).join('')}
                </div>
            </div>
        `;
    } else {
        imagesHtml = `<div class="product-images"><img id="mainRoomImage" src="${placeholderImg}" alt="No Image" class="main-product-image"></div>`;
    }
    // Occupancy and amenities
    let occupancyStr = room.occupancy || room.capacity || 'N/A';
    let amenitiesStr = '';
    if (room.amenities) {
        if (typeof room.amenities === 'string') {
            try { room.amenities = JSON.parse(room.amenities); } catch {}
        }
        if (Array.isArray(room.amenities)) {
            amenitiesStr = room.amenities.join(', ');
        } else if (typeof room.amenities === 'object') {
            amenitiesStr = Object.values(room.amenities).join(', ');
        } else {
            amenitiesStr = room.amenities;
        }
    } else {
        amenitiesStr = 'N/A';
    }
    // Room detail card
    mainSection.innerHTML = `
        <div class="product-left">
            ${imagesHtml}
        </div>
        <div class="product-right">
            <div class="product-title">${room.roomName || room.title || 'Untitled Room'}</div>
            <div class="product-price">₹${room.fees || room.price || 'N/A'} / month</div>
            <ul class="product-details-list">
                <li><strong>Owner:</strong> ${room.ownerName || 'N/A'}</li>
                <li><b>College:</b> ${room.college || 'N/A'}</li>
                <li><b>Room Type:</b> ${room.roomType || 'N/A'}</li>
                <li><b>Occupancy:</b> ${occupancyStr}</li>
                <li><b>Amenities:</b> ${amenitiesStr}</li>
                
                <li><b>Description:</b> ${room.description || ''}</li>
            </ul>
            <div class="action-buttons">
                <button class="btn btn-primary" id="contactSellerBtn"><i class="fa fa-whatsapp"></i> Contact Seller</button>
                <button class="btn btn-secondary" id="compareBtn"><i class="fa fa-table"></i> Compare</button>
            </div>
        </div>
    `;
    // Map
    renderRoomMap(room);
    // Setup contact seller
    document.getElementById('contactSellerBtn').onclick = () => contactRoomSellerFull(room.seller_id || room.user_id);
    // Setup compare
    document.getElementById('compareBtn').onclick = () => addRoomToCompare(room);
    // Render reviews
    renderReviews(room.id);

}

// --- MAP RENDERING ---
function renderRoomMap(room) {
    const mapDiv = document.getElementById('roomMapContainer');
    mapDiv.innerHTML = '<div id="roomMap" style="width:100%;height:100%;border-radius:12px;"></div>';
    // Load Leaflet if not loaded
    if (!window.L) {
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
        document.head.appendChild(leafletCSS);
        const leafletScript = document.createElement('script');
        leafletScript.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
        leafletScript.onload = () => renderRoomMap(room);
        document.body.appendChild(leafletScript);
        return;
    }
    let loc = room.location;
    if (typeof loc === 'string') {
        try { loc = JSON.parse(loc); } catch {}
    }
    let lat = 19.076, lon = 72.8777; // Default Mumbai
    if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
        lat = loc.lat;
        lon = loc.lon;
    }
    if (window.roomLeafletMap) { window.roomLeafletMap.remove(); }
    window.roomLeafletMap = L.map('roomMap').setView([lat, lon], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: ' OpenStreetMap'
    }).addTo(window.roomLeafletMap);
    L.marker([lat, lon]).addTo(window.roomLeafletMap);
}


async function fetchRoomReviews(roomId) {
    // Simple localStorage fallback for demo; replace with Supabase table for prod
    const key = `room_reviews_${roomId}`;
    try {
        const supabase = window.supabaseClient;
        const { data, error } = await supabase.from('room_reviews').select('*').eq('room_id', roomId).order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(r => ({ user: r.user_name, userEmail: r.user_email, text: r.text, rating: r.rating }));
    } catch {
        // fallback to localStorage
        let arr = [];
        try { arr = JSON.parse(localStorage.getItem(key)) || []; } catch {}
        return arr;
    }
}

async function submitRoomReview(roomId, text, rating) {
    // Simple localStorage fallback for demo; replace with Supabase insert for prod
    const key = `room_reviews_${roomId}`;
    try {
        const supabase = window.supabaseClient;
        let sender_id = null;
        if (supabase && supabase.auth && supabase.auth.getUser) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.id) sender_id = user.id;
        }
        if (!sender_id) throw new Error('Not logged in');
        await supabase.from('room_reviews').insert([{ room_id: roomId, text, rating, sender_id }]);
    } catch {
        // fallback to localStorage
        let arr = [];
        try { arr = JSON.parse(localStorage.getItem(key)) || []; } catch {}
        arr.unshift({ user: 'Anonymous', text, rating });
        localStorage.setItem(key, JSON.stringify(arr));
    }
}

// --- CONTACT SELLER (fetch phone from users table) ---
async function contactRoomSellerFull(sellerId) {
    if (!sellerId) return alert('Seller info not available.');
    try {
        const supabase = window.supabaseClient;
        const { data, error } = await supabase.from('users').select('phone').eq('id', sellerId).single();
        if (error || !data || !data.phone) return alert('Seller phone not found.');
        let phone = data.phone.trim();
        // If phone starts with +, use as is, else prepend +91
        if (!phone.startsWith('+')) {
            phone = '+91' + phone.replace(/^0+/, ''); // Remove leading zeros if present
        }
        // Remove all non-digit except leading +
        phone = phone.replace(/(?!^\+)\D/g, '');
        window.open('https://wa.me/' + encodeURIComponent(phone.replace('+','')), '_blank');
    } catch {
        alert('Could not fetch seller phone.');
    }
}

// --- COMPARE ROOMS ---
let compareRooms = [];
function addRoomToCompare(room) {
    if (compareRooms.find(r => r.id === room.id)) return showCompareTable();
    if (compareRooms.length >= 3) {
        alert('You can compare up to 3 rooms at a time.');
        return;
    }
    compareRooms.push(room);
    showCompareTable();
}

function removeCompareRoom(id) {
    compareRooms = compareRooms.filter(r => r.id !== id);
    showCompareTable();
    if (compareRooms.length === 0) {
        document.getElementById('compareTableContainer').style.display = 'none';
    }
}

function clearCompareRooms() {
    compareRooms = [];
    document.getElementById('compareTableContainer').style.display = 'none';
}

function updateMainRoomImage(src) {
    document.getElementById('mainRoomImage').src = src;
}

function renderSimilarRooms(similarRooms) {
    const similarRoomsContainer = document.getElementById('similarRoomsContainer');
    if (!similarRoomsContainer) return;
    const html = similarRooms.map(room => {
        return `
            <div class="similar-room">
                <img src="${room.images[0] || 'https://via.placeholder.com/370x320?text=No+Image'}" alt="Room Image">
                <div class="similar-room-info">
                    <h4>${room.roomName || room.title || 'Untitled Room'}</h4>
                    <p>₹${room.fees || room.price || 'N/A'} / month</p>
                </div>
            </div>
        `;
    }).join('');
    similarRoomsContainer.innerHTML = html;
}

function showCompareModal() {
    const modal = document.getElementById('compareModal');
    modal.style.display = 'flex';
    // Always attach close event
    const closeBtn = document.getElementById('closeCompareModal');
    if (closeBtn) {
        closeBtn.onclick = function(e) {
            e.stopPropagation();
            modal.style.display = 'none';
        };
    }
    // Also allow clicking outside modal content to close
    modal.onclick = function(e) {
        if (e.target === modal) modal.style.display = 'none';
    };
}

function renderCompareRoomsList() {
    const container = document.getElementById('compareRoomsListContainer');
    if (!container) return;
    const searchInput = document.getElementById('compareRoomsSearchInput');
    compareRoomsSearchTerm = searchInput.value.trim();
    fetchCompareRooms().then(rooms => {
        compareRoomsList = rooms;
        const html = rooms.map(room => {
            let checked = compareRooms.find(r => r.id === room.id) ? 'checked' : '';
            return `
                <div class="compare-room-list-item">
                    <input type="checkbox" ${checked} onclick="toggleCompareRoom(${room.id})">
                    <span>${room.roomName || room.title || 'Room/Hostel'}</span>
                </div>
            `;
        }).join('');
        container.innerHTML = html;
        renderCompareRoomsPagination();
    });
}

function fetchCompareRooms() {
    const supabase = window.supabaseClient;
    const query = supabase.from('rooms').select('*');
    if (compareRoomsSearchTerm) {
        query.ilike('roomName', `%${compareRoomsSearchTerm}%`);
    }
    query.range((compareRoomsPage - 1) * compareRoomsPerPage, compareRoomsPage * compareRoomsPerPage - 1);
    return query.then(({ data, error }) => {
        if (error) throw error;
        return data;
    });
}

function renderCompareRoomsPagination() {
    const paginationContainer = document.getElementById('compareRoomsPaginationContainer');
    if (!paginationContainer) return;
    const totalPages = Math.ceil(compareRoomsList.length / compareRoomsPerPage);
    const html = [];
    for (let i = 1; i <= totalPages; i++) {
        html.push(`<button class="btn btn-sm ${i === compareRoomsPage ? 'btn-primary' : 'btn-secondary'}" onclick="changeCompareRoomsPage(${i})">${i}</button>`);
    }
    paginationContainer.innerHTML = html.join('');
}

function changeCompareRoomsPage(page) {
    compareRoomsPage = page;
    renderCompareRoomsList();
}

function toggleCompareRoom(id) {
    const room = compareRoomsList.find(r => r.id === id);
    if (compareRooms.find(r => r.id === id)) {
        compareRooms = compareRooms.filter(r => r.id !== id);
    } else {
        compareRooms.push(room);
    }
    if (compareRooms.length >= 3) {
        alert('You can compare up to 3 rooms at a time.');
        compareRooms = compareRooms.slice(0, 3);
    }
    renderCompareRoomsList();
    if (compareRooms.length > 0) {
        document.getElementById('compareTableContainer').style.display = 'block';
        showCompareTable();
    } else {
        document.getElementById('compareTableContainer').style.display = 'none';
    }
}

function showCompareTable() {
    const modal = document.getElementById('compareModal');
    const container = document.getElementById('compareTableContainer');
    if (!compareRooms.length) { modal.style.display = 'none'; return; }
    modal.style.display = 'flex';
    let fields = ['roomName','roomType','fees','college','occupancy','amenities','location','description'];
    let fieldLabels = {
        roomName: 'Room Name', roomType: 'Type', fees: 'Fees', college: 'College', occupancy: 'Occupancy', amenities: 'Amenities', location: 'Location', description: 'Description'
    };
    let html = '<table class="table table-bordered"><thead><tr><th>Field</th>' + compareRooms.map((r,i) => `<th>Room ${i+1} <button onclick="removeCompareRoom('${r.id}')" class="btn btn-sm btn-danger">X</button></th>`).join('') + '</tr></thead><tbody>';
    for (let f of fields) {
        html += `<tr><td>${fieldLabels[f]}</td>` + compareRooms.map(r => {
            let val = r[f] || (r.location && typeof r.location==='string'?JSON.parse(r.location).name:'');
            if (f==='amenities' && val && Array.isArray(val)) val = val.join(', ');
            return `<td>${val||'N/A'}</td>`;
        }).join('') + '</tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html + `<button class="btn btn-outline-secondary" onclick="clearCompareRooms()">Clear Compare</button>`;

    // Modal close button logic
    document.getElementById('closeCompareModal').onclick = function() {
        modal.style.display = 'none';
    };
    // Hide modal when clicking outside content
    modal.onclick = function(e) {
        if (e.target === modal) modal.style.display = 'none';
    };
}

window.addEventListener('DOMContentLoaded', async () => {
    const roomId = getQueryParam('id');
    if (!roomId) return;
    try {
        const room = await fetchRoomById(roomId);
        renderRoom(room);
        const similarRooms = await fetchSimilarRooms(room);
        renderSimilarRooms(similarRooms);
        document.getElementById('compareBtn').onclick = showCompareModal;
    } catch (err) {
        document.getElementById('roomMainSection').innerHTML = '<div style="color:#c00;padding:18px;">Failed to load room details. Please try again later.</div>';
    }
});
