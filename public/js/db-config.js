// Supabase Configuration
// Credentials are injected via env.js for frontend
if (!window.supabaseClient) {
  // Try to use window.supabase or globalThis.supabase (from CDN)
  const supabaseLib = window.supabase || (typeof globalThis !== 'undefined' ? globalThis.supabase : undefined);
  if (supabaseLib && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    window.supabaseClient = supabaseLib.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  } else if (!supabaseLib) {
    alert('Supabase JS library is not loaded! Please check your script order and CDN link.');
    throw new Error('Supabase JS library not loaded');
  } else {
    alert('Supabase client is not initialized. Check your env.js and script order.');
    throw new Error('Supabase client not initialized');
  }
}
const supabase = window.supabaseClient;

// Image Upload Configuration
// API key is now stored in environment variables on the server
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
// No API_ENDPOINTS or API_BASE_URL logic remains. All data operations should use Supabase client directly.