// featuredProducts.js
// Shared featured products logic for StudXchange

document.addEventListener('DOMContentLoaded', function() {
  // Always run after DOM is ready
  const featuredRow = document.getElementById('featuredScrollRow');
  if (!featuredRow) return;
  
  featuredRow.innerHTML = '<div class="loading">Loading featured products...</div>';
  
  // Helper: Render a single card
  function renderFeaturedCard(item) {
      const img = (item.images && item.images[0]) ? item.images[0] : 'https://via.placeholder.com/220x150?text=No+Image';
      const title = item.title || 'Untitled';
      const price = item.price ? `₹${item.price}` : 'N/A';
      const type = item.category ? item.category : (item.source || 'product');
      let badge = '';
      if (type.toLowerCase().includes('note')) badge = '<span style="background:#e7f0ff;color:#1a75ff;border-radius:8px;font-size:0.82rem;padding:2px 8px;margin-left:6px;">Notes</span>';
      else if (type.toLowerCase().includes('room')) badge = '<span style="background:#e4f9f6;color:#0b948f;border-radius:8px;font-size:0.82rem;padding:2px 8px;margin-left:6px;">Room</span>';
      else badge = '<span style="background:#f6eaff;color:#7d3cff;border-radius:8px;font-size:0.82rem;padding:2px 8px;margin-left:6px;">Product</span>';
      
      let detailUrl = 'productinterface.html?id=' + (item._id || item.id || '');
      if (type.toLowerCase().includes('note')) detailUrl = 'notes_interface.html?id=' + (item._id || item.id || '');
      else if (type.toLowerCase().includes('room')) detailUrl = 'room_interface.html?id=' + (item._id || item.id || '');
      
      return `
          <div class="product-card" tabindex="0" style="width:220px;min-width:220px;max-width:220px;height:320px;display:flex;flex-direction:column;align-items:stretch;box-shadow:0 2px 16px rgba(42,61,86,0.10);border-radius:16px;background:#fff;cursor:pointer;scroll-snap-align:start;" onclick="window.location.href='${detailUrl}'">
              <div style="height:150px;width:100%;background:#f4f4f9;border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                  <img src="${img}" alt="Image" style="width:100%;height:100%;object-fit:cover;border-radius:16px 16px 0 0;" onerror="this.onerror=null;this.src='https://via.placeholder.com/220x150?text=No+Image';">
              </div>
              <div style="padding:14px 12px 0 12px;flex:1 1 auto;display:flex;flex-direction:column;">
                  <div style="font-size:1.07rem;font-weight:600;color:#2a3d56;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title} ${badge}</div>
                  <div style="font-size:1.08rem;color:#1a75ff;font-weight:bold;margin:6px 0 0 0;">${price}</div>
                  <div style="font-size:0.92rem;color:#555;margin:7px 0 0 0;white-space:normal;word-break:break-word;">${item.college ? `<i class='fa fa-university'></i> ${item.college}` : ''}</div>
              </div>
          </div>
      `;
  }
  
  // Fetch and render featured items
  (async () => {
      try {
          // Use Supabase JS SDK (assumes window.supabaseClient is initialized)
          const supabase = window.supabaseClient;
          if (!supabase) throw new Error('Supabase client not initialized');
          
          // Fetch from all relevant tables (products, rooms, notes)
          const [{ data: products }, { data: rooms }, { data: notes }] = await Promise.all([
              supabase.from('products').select('*'),
              supabase.from('rooms').select('*'),
              supabase.from('notes').select('*'),
          ]);
          
          let all = [];
          if (products && Array.isArray(products)) all = all.concat(products.map(p => ({ ...p, source: 'product' })));
          if (rooms && Array.isArray(rooms)) all = all.concat(rooms.map(r => ({ ...r, source: 'room' })));
          if (notes && Array.isArray(notes)) all = all.concat(notes.map(n => ({ ...n, source: 'note' })));
          
          if (!all.length) {
              featuredRow.innerHTML = '<p>No featured products available.</p>';
              return;
          }
          
          // Sort by createdAt or id descending (if available)
          all.sort((a, b) => (b.createdAt || b.id || 0) - (a.createdAt || a.id || 0));
          featuredRow.innerHTML = all.map(renderFeaturedCard).join('');
          
      } catch (err) {
          console.error('Error loading featured products:', err);
          featuredRow.innerHTML = '<div style="color:#c00;padding:18px;">Failed to load featured products. Please try again later.</div>';
      }
  })();
});
