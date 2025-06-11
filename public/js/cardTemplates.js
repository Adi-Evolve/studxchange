// cardTemplates.js
// Shared card rendering functions for products, notes, and rooms

// Attach to window for global access
window.renderProductCard = renderProductCard;
window.renderNoteCard = renderNoteCard;
window.renderRoomCard = renderRoomCard;

function renderProductCard(p) {
    const id = p.id || p._id;
    const img = (p.images && p.images[0]) ? p.images[0] : (p.image || 'https://via.placeholder.com/320x220?text=No+Image');
    const name = p.name || p.title || 'Untitled';
    const price = p.price ? `\u20b9${p.price}` : 'N/A';
    // Defensive: If id is missing, disable navigation
    if (!id) {
        return `<div class='product-card-new' style="background:#ffeaea;opacity:0.7;pointer-events:none;text-align:center;">
            <div class='product-image-new' style="background-image:url('${img}');"></div>
            <div class='product-title-new'>${name} <span style='color:#c00;font-size:0.85em;'>(Invalid Product)</span></div>
            <div class='product-meta-new' style="margin:8px 0 0 0;text-align:center;">
                <span class='product-category-new'><i class='fa fa-tag'></i> N/A</span>
                <span class='product-condition-new' style="margin-left:8px;"><i class='fa fa-star'></i> N/A</span>
            </div>
            <div class='product-bottom-row-new' style="text-align:center;"><span class='product-price-new'>${price}</span></div>
            <button class='product-buynow-btn-new' disabled>View Details</button>
        </div>`;
    }
    const category = p.category ? `<span class='product-category-new'><i class='fa fa-tag'></i> ${p.category}</span>` : '';
    const condition = p.condition ? `<span class='product-condition-new' style="margin-left:8px;"><i class='fa fa-star'></i> ${p.condition}</span>` : '';
    return `<div class='product-card-new' style="cursor:pointer;text-align:center;" onclick="if(event.target.closest('.product-buynow-btn-new'))return;window.location.href='productinterface.html?id=${id}'">
        <div class='product-image-new' style="background-image:url('${img}');"></div>
        <div class='product-title-new'>${name}</div>
        <div class='product-meta-new' style="margin:8px 0 0 0;text-align:center;">
            ${category}
            ${condition}
        </div>
        <div class='product-bottom-row-new' style="text-align:center;"><span class='product-price-new' style="display:inline-block;text-align:center;width:100%;">${price}</span></div>
        <button class='product-buynow-btn-new' style="font-size:0.95rem;padding:7px 18px;margin-top:8px;" onclick="window.location.href='productinterface.html?id=${id}';event.stopPropagation();">View Details</button>
    </div>`;
}


function renderNoteCard(n) {
    const img = (n.images && n.images[0]) ? n.images[0] : (n.image || 'https://via.placeholder.com/320x220?text=No+Image');
    const title = n.title || n.name || 'Untitled';
    const price = n.price ? `₹${n.price}` : 'N/A';
    const id = n.id || n._id;
    const wishlist = `<span class="wishlist-heart-new" title="Add to Wishlist" onclick="toggleWishlist(event, '${id}')"><i class="far fa-heart wishlist-icon"></i></span>`;
    return `<div class='product-card-new'>
        <div class='product-image-new' style="background-image:url('${img}');">
            ${wishlist}
        </div>
        <div class='product-info-new'>
            <div class='product-title-new'>${title}</div>
            <div class='product-meta-new'>
                <span class='product-category-new'><i class='fa fa-book'></i> Notes</span>
            </div>
            <div class='product-bottom-row-new'>
                <span class='product-price-new'>${price}</span>
            </div>
            <button class='product-buynow-btn-new' onclick="window.location.href='notes_interface.html?id=${id}'">View Details</button>
        </div>
    </div>`;
}

function renderRoomCard(r) {
    const img = (r.images && r.images[0]) ? r.images[0] : (r.image || 'https://via.placeholder.com/320x220?text=No+Image');
    const name = r.name || r.title || 'Untitled';
    const price = r.price ? `₹${r.price}` : 'N/A';
    const id = r.id || r._id;
    const college = r.college ? `<span class='product-category-new'><i class='fa fa-university'></i> ${r.college}</span>` : '';
    const wishlist = `<span class="wishlist-heart-new" title="Add to Wishlist" onclick="toggleWishlist(event, '${id}')"><i class="far fa-heart wishlist-icon"></i></span>`;
    return `<div class='product-card-new'>
        <div class='product-image-new' style="background-image:url('${img}');">
            ${wishlist}
        </div>
        <div class='product-info-new'>
            <div class='product-title-new'>${name}</div>
            <div class='product-meta-new'>
                ${college}
                <span class='product-category-new'><i class='fa fa-bed'></i> Room</span>
            </div>
            <div class='product-bottom-row-new'>
                <span class='product-price-new'>${price}</span>
            </div>
            <button class='product-buynow-btn-new' onclick="window.location.href='room_interface.html?id=${id}'">View Details</button>
        </div>
    </div>`;
}
