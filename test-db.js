// Deprecated: This file is no longer used. Backend has migrated to Supabase.
async function testConnection() {
  console.log('Testing MongoDB connection...');
  
  try {
    // Ensure MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not defined');
      process.exit(1);
    }
    
    console.log('Attempting to connect with URI:', process.env.MONGODB_URI.substring(0, 20) + '...');
    
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB successfully');
    
    // Verify we can access the database
    const dbName = mongoose.connection.db.databaseName;
    console.log('Database name:', dbName);
    
    // Test a simple operation to ensure the connection is working
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name).join(', '));
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB. Error details:', error);
    console.error('Connection string format correct? URI starts with:', 
                 process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'undefined');
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('MongoDB connection test passed!');
      process.exit(0);
    } else {
      console.error('MongoDB connection test failed!');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error during test:', err);
    process.exit(1);
  }); 