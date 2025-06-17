// searchSupabase.js
// Centralized search logic for StudXchange
// CORS-safe version that only uses the Supabase client

async function searchSupabase(query, category = 'all') {
  // Default empty results
  const emptyResults = { products: [], notes: [], rooms: [] };
  if (!query) return emptyResults;
  // Check if Supabase client is available
  if (!window.supabaseClient) {
    if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      try {
        window.supabaseClient = window.supabase.createClient(
          window.SUPABASE_URL,
          window.SUPABASE_ANON_KEY
        );
      } catch (err) {
        return emptyResults;
      }
    } else {
      return emptyResults;
    }
  }
  try {
    // Split query into keywords, ignore empty
    const keywords = query.split(/\s+/).filter(Boolean).map(k => k.toLowerCase());
    if (keywords.length === 0) return { products: [], notes: [], rooms: [] };
    const categoryFilter = category && category.toLowerCase() !== 'all' ? category : null;

    // Helper: does any keyword match any field?
    function matchesAny(item, fields) {
      return keywords.some(kw =>
        fields.some(f =>
          (item[f] && item[f].toString().toLowerCase().includes(kw))
        )
      );
    }

    // Fetch all data (with optional category filter)
    let productQuery = window.supabaseClient.from('products').select('*');
    let noteQuery = window.supabaseClient.from('notes').select('*');
    let roomQuery = window.supabaseClient.from('rooms').select('*');
    if (categoryFilter) {
      productQuery = productQuery.ilike('category', categoryFilter);
      noteQuery = noteQuery.ilike('category', categoryFilter);
      roomQuery = roomQuery.ilike('category', categoryFilter);
    }
    const [productsResult, notesResult, roomsResult] = await Promise.all([
      productQuery,
      noteQuery,
      roomQuery
    ]);
    // Filter on client for multi-keyword logic
    const products = (productsResult.data || []).filter(p => matchesAny(p, ['title','category','description']));
    const notes = (notesResult.data || []).filter(n => matchesAny(n, ['title','category','description','content']));
    const rooms = (roomsResult.data || []).filter(r => matchesAny(r, ['title','category','description']));
    return { products, notes, rooms };

    const results = {
      products: productsResult.data || [],
      notes: notesResult.data || [],
      rooms: roomsResult.data || []
    };
    return results;
  } catch (err) {
    return emptyResults;
  }
}

// Export for use in other scripts
window.searchSupabase = searchSupabase;

