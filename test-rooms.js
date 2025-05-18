require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseRooms() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY in .env');
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Testing Supabase rooms table...');
  // Insert a test room
  const { data: insertData, error: insertError } = await supabase
    .from('rooms')
    .insert([{ college: 'Test College', title: 'Test Room', category: 'Room', ownerName: 'Test Owner', contact1: '1234567890', price: '1000', amenities: ['wifi', 'ac'], location: 'Test Location' }])
    .select();
  if (insertError) {
    console.error('Insert error:', insertError);
    return;
  }
  console.log('Inserted room:', insertData);
  // Fetch the room
  const { data: fetchData, error: fetchError } = await supabase
    .from('rooms')
    .select('*')
    .limit(1);
  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }
  console.log('Fetched room:', fetchData);
}

testSupabaseRooms();

async function testRooms() {
  try {
    console.log('Testing rooms collection...');
    console.log('Connection string:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    console.log('Connected to MongoDB successfully!');
    console.log('Connection state:', mongoose.connection.readyState);
    console.log('Database name:', mongoose.connection.db.databaseName);
    
    // Create the Room model
    const Room = mongoose.model('Room', roomSchema);
    console.log('Room model created successfully');
  } catch (error) {
    console.error('Error in testRooms:', error);
  }
}

testRooms(); 