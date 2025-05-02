// Supabase Configuration
// This file contains Supabase configuration for StudXchange

// Supabase configuration with actual project credentials
const SUPABASE_URL = 'https://ygfjhicakkcctduoscdy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZmpoaWNha2tjY3RkdW9zY2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5MDgzMDQsImV4cCI6MjA2MDQ4NDMwNH0.pjDlkmoNMpJGxf7viom2hNgWTVEUUz7yYWgMUAaCx8c';

// Ensure Supabase library is loaded before using
if (typeof window.supabase === 'undefined') {
  throw new Error('Supabase library not loaded. Please check your script order in HTML.');
}

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  global: {
    fetch: fetch.bind(globalThis)
  }
});

console.log("Supabase initialized successfully for Vercel deployment");

// Configure Supabase Storage for large files
const SUPABASE_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max file size

// Export the supabase client and constants for use in other files
window.supabaseClient = supabaseClient;
window.SUPABASE_MAX_FILE_SIZE = SUPABASE_MAX_FILE_SIZE;
