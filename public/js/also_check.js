// Fetch and render "Also Check" featured items for StudXchange interface pages
// Requires: Supabase client in db-config.js

async function fetchAlsoCheckItems(type) {
    if (!window.supabaseClient) return [];
    const { data, error } = await supabaseClient
        .from('featured_items')
        .select('item_id, priority, label')
        .eq('type', type)
        .order('priority', { ascending: true });
    if (error || !data) return [];
    // Fetch details for each item
    let table = type === 'product' ? 'products' : type === 'room' ? 'rooms' : 'notes';
    let ids = data.map(f => f.item_id);
    if (!ids.length) return [];
    const { data: items, error: itemsErr } = await supabaseClient
        .from(table)
        .select('*')
        .in('id', ids);
    if (itemsErr || !items) return [];
    // Order as per priority and attach label
    return ids.map((id, idx) => {
        let item = items.find(item => item.id === id);
        if (item) item._featuredLabel = data[idx]?.label || 'Sponsored';
        return item;
    }).filter(Boolean);
}

function renderAlsoCheckSection(type, containerId) {
    fetchAlsoCheckItems(type).then(items => {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!items.length) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <div class="also-check-section mb-4">
                <h4>Also Check</h4>
                <div class="also-check-list d-flex flex-row flex-nowrap gap-3 overflow-auto">
                    ${items.map(item => `
                        <div class="also-check-card card p-2 position-relative" style="min-width:180px;max-width:220px;">
                            <span class="badge bg-warning text-dark position-absolute" style="top:6px;right:8px;font-size:0.75rem;z-index:2;">${item._featuredLabel || 'Sponsored'}</span>
                            <img src="${(item.images && item.images[0]) || 'https://via.placeholder.com/180x120?text=No+Image'}" alt="${item.title || item.name || 'Item'}" class="card-img-top mb-2" style="height:110px;object-fit:cover;border-radius:6px;">
                            <div class="card-body p-1">
                                <div class="also-check-title fw-semibold" style="font-size:1.02rem;">${item.title || item.name || 'Untitled'}</div>
                                <div class="also-check-price text-primary mb-1">₹${item.price || 'N/A'}</div>
                                <a href="${type}_interface.html?id=${item.id}" class="btn btn-outline-primary btn-sm mt-1">View</a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
}
