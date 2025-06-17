// Fetch and render "Also Check" featured items for StudXchange interface pages
// Requires: Supabase client in db-config.js

// Fetch and render 'Also You Might Like' sponsored items from sponsorship_sequences table
async function renderAlsoYouMightLikeSlider(containerId = 'alsoYouMightLikeSection') {
    if (typeof arguments[0] === 'string' && arguments[0] !== 'alsoYouMightLikeSection') {
        // If called with a type argument, ignore it and warn
        console.warn('[Sponsored] renderAlsoYouMightLikeSlider: type argument is deprecated and ignored. Showing all types.');
        containerId = arguments[1] || 'alsoYouMightLikeSection';
    }
    if (!window.supabaseClient) return;
    // Fetch sponsorship sequence for this type
    const { data: sponsorships, error } = await supabaseClient
        .from('sponsorship_sequences')
        .select('*')
        .order('slot', { ascending: true });
    console.log('[Sponsored] sponsorships fetched:', sponsorships);
    if (error || !sponsorships || !sponsorships.length) {
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = '<div style="padding:24px;color:#888;">No sponsored items found.</div>';
        return;
    }
    // Fetch actual items by type and id
    // Bulk fetch all sponsored items by IDs for this type
    // Fetch each sponsored item one by one in slot order, from the correct table
    let items = [];
    for (const s of sponsorships) {
        let table = s.item_type === 'note' ? 'notes' : s.item_type === 'room' ? 'rooms' : 'products';
        try {
            let { data: item, error: fetchErr, status } = await supabaseClient.from(table).select('*').eq('id', s.item_id).maybeSingle();
            if (!fetchErr && item && (!status || status === 200)) {
                items.push({ ...item, _label: s.label, _slot: s.slot, _type: s.item_type });
                console.log(`[Sponsored] Item fetched: type=${s.item_type} id=${s.item_id}`, item);
            } else {
                console.warn(`[Sponsored] Item NOT found: type=${s.item_type} id=${s.item_id}`);
            }
        } catch (e) {
            console.error(`[Sponsored] Error fetching item: type=${s.item_type} id=${s.item_id}`, e);
        }
    }
    // Render as slider
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="also-you-might-like-section mb-4">
        <h4>Also You Might Like</h4>
        <div class="also-you-might-like-slider d-flex flex-row flex-nowrap gap-4 overflow-auto" style="scroll-behavior:smooth;max-width:100vw;padding-bottom:8px;"></div>
    </div>`;
    const slider = container.querySelector('.also-you-might-like-slider');
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'also-check-card also-might-like-card position-relative';
        card.style = 'min-width:220px;max-width:260px;background:#fff;border-radius:18px;box-shadow:0 2px 16px rgba(40,60,100,0.09);transition:box-shadow .18s,transform .13s;padding:0 0 16px 0;margin:0 16px 8px 16px;overflow:hidden;';
        card.innerHTML = `
            <span class="badge bg-warning text-dark position-absolute" style="top:10px;right:14px;font-size:0.90rem;z-index:2;">${item._label || 'Sponsored'}</span>
            <img src="${(item.images && item.images[0]) || item.image || 'https://via.placeholder.com/220x140?text=No+Image'}" alt="${item.title || item.name || 'Item'}" style="height:140px;width:100%;object-fit:cover;border-radius:18px 18px 0 0;">
            <div style="padding:13px 10px 0 10px;">
                <div class="also-check-title fw-semibold" style="font-size:1.13rem;line-height:1.22;min-height:36px;">${item.title || item.name || 'Untitled'}</div>
                <div class="also-check-price text-primary mb-1" style="font-size:1.08rem;font-weight:700;">₹${item.price || item.fees || 'N/A'}</div>
                <a href="${item._type==='note'?'notes_interface.html':item._type==='room'?'room_interface.html':'productinterface.html'}?id=${item.id}" class="btn btn-outline-primary btn-sm mt-2" style="width:100%;font-weight:600;">View</a>
            </div>
        `;
        card.onmouseover = () => { card.style.boxShadow = '0 6px 24px rgba(40,60,100,0.16)'; card.style.transform = 'translateY(-2px) scale(1.03)'; };
        card.onmouseout = () => { card.style.boxShadow = '0 2px 16px rgba(40,60,100,0.09)'; card.style.transform = 'none'; };
        slider.appendChild(card);
    });
    // Auto-slide logic
    let scrollAmount = 0;
    let autoSlideInterval = setInterval(() => {
        if (!slider) return;
        let cardWidth = slider.firstChild ? slider.firstChild.offsetWidth + 18 : 240;
        if (slider.scrollLeft + slider.offsetWidth + 5 >= slider.scrollWidth) {
            slider.scrollTo({ left: 0, behavior: 'smooth' });
            scrollAmount = 0;
        } else {
            scrollAmount += cardWidth;
            slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
    }, 2500);
    slider.onmouseenter = () => clearInterval(autoSlideInterval);
    slider.onmouseleave = () => {
        autoSlideInterval = setInterval(() => {
            if (!slider) return;
            let cardWidth = slider.firstChild ? slider.firstChild.offsetWidth + 18 : 240;
            if (slider.scrollLeft + slider.offsetWidth + 5 >= slider.scrollWidth) {
                slider.scrollTo({ left: 0, behavior: 'smooth' });
                scrollAmount = 0;
            } else {
                scrollAmount += cardWidth;
                slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
            }
        }, 2500);
    };

}
window.renderAlsoYouMightLikeSlider = renderAlsoYouMightLikeSlider;


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
