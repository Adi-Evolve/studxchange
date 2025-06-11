// searchSupabase.js
// Centralized search logic for StudXchange
// CORS-safe version that only uses the Supabase client

async function searchSupabase(query) {
  
  
  // Default empty results
  const emptyResults = { products: [], notes: [], rooms: [] };
  
  if (!query) {
    
    return emptyResults;
  }
  
  // Check if Supabase client is available
  if (!window.supabaseClient) {
    
    
    // Try to initialize it if env variables are available
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
    
    
    // Prepare search query with wildcards
    const likeQuery = `%${query}%`;
    
    // First, let's check the database schema to see what columns actually exist
    
    
    // Simple approach: just get a few records from each table to see their structure
    const schemaCheck = await Promise.all([
      window.supabaseClient.from('products').select('*').limit(1),
      window.supabaseClient.from('notes').select('*').limit(1),
      window.supabaseClient.from('rooms').select('*').limit(1)
    ]);
    
    // Log the schema to see what columns we actually have
    
    
    
    
    // Determine which fields to search based on the actual schema
    // Default search fields if we can't determine the schema
    let productSearchFields = ['title', 'description', 'category'];
    let notesSearchFields = ['title', 'description'];
    let roomsSearchFields = ['title', 'description', 'category'];
    
    // Update search fields if we have schema data
    if (schemaCheck[0].data && schemaCheck[0].data.length > 0) {
      productSearchFields = Object.keys(schemaCheck[0].data[0])
        .filter(key => typeof schemaCheck[0].data[0][key] === 'string')
        .filter(key => !key.includes('id') && !key.includes('created') && !key.includes('updated'));
    }
    
    if (schemaCheck[1].data && schemaCheck[1].data.length > 0) {
      notesSearchFields = Object.keys(schemaCheck[1].data[0])
        .filter(key => typeof schemaCheck[1].data[0][key] === 'string')
        .filter(key => !key.includes('id') && !key.includes('created') && !key.includes('updated'));
    }
    
    if (schemaCheck[2].data && schemaCheck[2].data.length > 0) {
      roomsSearchFields = Object.keys(schemaCheck[2].data[0])
        .filter(key => typeof schemaCheck[2].data[0][key] === 'string')
        .filter(key => !key.includes('id') && !key.includes('created') && !key.includes('updated'));
    }
    
    
      products: productSearchFields,
      notes: notesSearchFields,
      rooms: roomsSearchFields
    });
    
    // Helper for prioritized search
    async function prioritizedSearch(table, fieldsPriority) {
      let result = { data: [], error: null };
      for (const fields of fieldsPriority) {
        const searchFields = fields.filter(f => f != null);
        if (searchFields.length === 0) continue;
        const orQuery = searchFields.map(field => `${field}.ilike.${likeQuery}`).join('|');
        if (!orQuery) continue;
        result = await window.supabaseClient.from(table).select('*').or(orQuery);
        if (result.data && result.data.length > 0) break;
      }
      return result;
    }

    // Determine actual field names from schema
    const getField = (schema, candidates) => {
      for (const c of candidates) if (schema && schema[0] && c in schema[0]) return c;
      return candidates[0]; // fallback
    };
    const productTitleField = getField(schemaCheck[0].data, ['title', 'name']);
    const productCategoryField = getField(schemaCheck[0].data, ['category']);
    const productDescField = getField(schemaCheck[0].data, ['description']);
    const noteTitleField = getField(schemaCheck[1].data, ['title', 'name']);
    const noteCategoryField = getField(schemaCheck[1].data, ['category']);
    const noteDescField = getField(schemaCheck[1].data, ['description', 'content']);
    const roomTitleField = getField(schemaCheck[2].data, ['title', 'name']);
    const roomCategoryField = getField(schemaCheck[2].data, ['category']);
    const roomDescField = getField(schemaCheck[2].data, ['description']);

    // Prioritized search for each type
    const [productsResult, notesResult, roomsResult] = await Promise.all([
      prioritizedSearch('products', [
        [productTitleField],
        [productCategoryField],
        [productDescField]
      ]),
      prioritizedSearch('notes', [
        [noteTitleField],
        [noteCategoryField],
        [noteDescField]
      ]),
      prioritizedSearch('rooms', [
        [roomTitleField],
        [roomCategoryField],
        [roomDescField]
      ])
    ]);

    // If any result is an error, log it clearly
    if (productsResult.error) 
    if (notesResult.error) 
    if (roomsResult.error) 
    if ((!productsResult.data || productsResult.data.length === 0) && (!notesResult.data || notesResult.data.length === 0) && (!roomsResult.data || roomsResult.data.length === 0)) {
      
    }
    
    // Handle any errors
    if (productsResult.error) 
    if (notesResult.error) 
    if (roomsResult.error) 
    
    // Prepare results
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
