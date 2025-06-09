// cardTemplates.js
// Shared card rendering functions for products, notes, and rooms

function renderProductCard(p) {
    const img = (p.images && p.images[0]) ? p.images[0] : (p.image || 'https://via.placeholder.com/180x120?text=No+Image');
    const name = p.name || p.title || 'Untitled';
    const price = p.price ? `₹${p.price}` : 'N/A';
    const condition = p.condition ? `<span class='product-condition'><i class='fa fa-star'></i> ${p.condition}</span>` : '';
    const id = p.id || p._id;
    const wishlist = `<span class="wishlist-heart" title="Add to Wishlist" onclick="toggleWishlist(event, '${id}')"><i class="far fa-heart wishlist-icon"></i></span>`;
    // Optional: Add rating stars if available
    let ratingHtml = '';
    if (typeof p.rating === 'number') {
        const fullStars = Math.floor(p.rating);
        const halfStar = p.rating % 1 >= 0.5;
        ratingHtml = `<span class='product-rating'>` +
            '<i class="fa fa-star" style="color:#ffc107"></i>'.repeat(fullStars) +
            (halfStar ? '<i class="fa fa-star-half-alt" style="color:#ffc107"></i>' : '') +
            '</span>';
    }
    return `<div class='product redesigned' style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div class='product-img' style="background-image:url('${img}'); position:relative; margin:auto;">
            ${wishlist}
        </div>
        <div class='product-title' style="text-align:center;">${name}</div>
        <div class='price' style="text-align:center;">${price}</div>
        <div style="text-align:center;">${condition}</div>
        <div style="text-align:center;">${ratingHtml}</div>
        <button class='buy-now' style="margin:12px auto 14px auto;display:block;">View Details</button>
    </div>`;
}
window.renderProductCard = renderProductCard;

function renderNoteCard(n) {
    const img = (n.images && n.images[0]) ? n.images[0] : (n.image || 'https://via.placeholder.com/180x120?text=No+Image');
    const title = n.title || n.name || 'Untitled';
    const price = n.price ? `₹${n.price}` : 'N/A';
    const desc = n.description || n.content || '';
    const id = n.id || n._id;
    return `<div class='product-card'>
        <div class='product-image' style="background-image:url('${img}');"></div>
        <h4>${title}</h4>
        <div class='price'>${price}</div>
        <div class='desc'>${desc}</div>
        <button onclick="window.location.href='notes_interface.html?id=${id}'">View Details</button>
    </div>`;
}
window.renderNoteCard = renderNoteCard;

function renderRoomCard(r) {
    const img = (r.images && r.images[0]) ? r.images[0] : (r.image || 'https://via.placeholder.com/180x120?text=No+Image');
    const name = r.name || r.title || 'Untitled';
    const price = r.price ? `₹${r.price}` : 'N/A';
    const desc = r.description || '';
    const id = r.id || r._id;
    return `<div class='product-card'>
        <div class='product-image' style="background-image:url('${img}');"></div>
        <h4>${name}</h4>
        <div class='price'>${price}</div>
        <div class='desc'>${desc}</div>
        <button onclick="window.location.href='room_interface.html?id=${id}'">View Details</button>
    </div>`;
}
