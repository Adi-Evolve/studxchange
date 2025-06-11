// Supabase Configuration - CORS-safe version
// This script initializes the Supabase client for all pages

// Check if we need to initialize the Supabase client
if (!window.supabaseClient) {
  
  
  // Make sure we have the required variables
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    
    // Try to get them from localStorage as fallback (if previously stored)
    const storedUrl = localStorage.getItem('SUPABASE_URL');
    const storedKey = localStorage.getItem('SUPABASE_ANON_KEY');
    
    if (storedUrl && storedKey) {
      
      window.SUPABASE_URL = storedUrl;
      window.SUPABASE_ANON_KEY = storedKey;
    } else {
      
    }
  } else {
    // Store credentials in localStorage for potential fallback
    localStorage.setItem('SUPABASE_URL', window.SUPABASE_URL);
    localStorage.setItem('SUPABASE_ANON_KEY', window.SUPABASE_ANON_KEY);
  }
  
  // Try to use window.supabase or globalThis.supabase (from CDN)
  const supabaseLib = window.supabase || (typeof globalThis !== 'undefined' ? globalThis.supabase : undefined);
  
  if (supabaseLib && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    try {
      // Create client with proper configuration to avoid CORS issues
      window.supabaseClient = supabaseLib.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        },
        global: {
          headers: {
            'X-Client-Info': 'studxchange-web'
          }
        }
      });
      
    } catch (err) {
      
    }
  } else {
    
    if (!supabaseLib) {
      
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      
    }
  }
}

// Export for convenience
const supabase = window.supabaseClient;

// Image Upload Configuration
// API key is now stored in environment variables on the server
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
// All data operations should use Supabase client directly to avoid CORS issues