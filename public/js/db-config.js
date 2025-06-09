// Supabase Configuration - CORS-safe version
// This script initializes the Supabase client for all pages

// Check if we need to initialize the Supabase client
if (!window.supabaseClient) {
  console.log('Initializing Supabase client in db-config.js');
  
  // Make sure we have the required variables
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('Missing Supabase credentials. Check if env.js is loaded properly.');
    // Try to get them from localStorage as fallback (if previously stored)
    const storedUrl = localStorage.getItem('SUPABASE_URL');
    const storedKey = localStorage.getItem('SUPABASE_ANON_KEY');
    
    if (storedUrl && storedKey) {
      console.log('Using Supabase credentials from localStorage');
      window.SUPABASE_URL = storedUrl;
      window.SUPABASE_ANON_KEY = storedKey;
    } else {
      console.error('No Supabase credentials available');
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
      console.log('Supabase client initialized successfully');
    } catch (err) {
      console.error('Error initializing Supabase client:', err);
    }
  } else {
    console.error('Cannot initialize Supabase client - missing library or credentials');
    if (!supabaseLib) {
      console.error('Supabase JS library is not loaded');
    }
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      console.error('Supabase credentials missing');
    }
  }
}

// Export for convenience
const supabase = window.supabaseClient;

// Image Upload Configuration
// API key is now stored in environment variables on the server
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
// All data operations should use Supabase client directly to avoid CORS issues