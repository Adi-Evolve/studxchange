require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY in .env');
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Testing Supabase connection...');
  // Insert a test row
  const { data: insertData, error: insertError } = await supabase
    .from('test_table')
    .insert([{ test_col: 'Hello from Supabase!' }])
    .select();
  if (insertError) {
    console.error('Insert error:', insertError);
    return;
  }
  console.log('Inserted row:', insertData);
  // Fetch the row
  const { data: fetchData, error: fetchError } = await supabase
    .from('test_table')
    .select('*')
    .limit(1);
  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }
  console.log('Fetched row:', fetchData);
}

testSupabaseConnection();
