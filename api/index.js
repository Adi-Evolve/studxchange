// Deprecated: This file is no longer used. Backend has migrated to Supabase.
// Export the Express API for Vercel serverless functions
// This helps mitigate cold start issues and MongoDB connection problems
module.exports = async (req, res) => {
  try {
    // Set CORS headers for Vercel serverless functions
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    // Handle OPTIONS requests for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Connect to the database before handling the request
    if (mongoose.connection.readyState !== 1) {
      console.log('API: Connecting to MongoDB before handling request');
      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          socketTimeoutMS: 10000
        });
        console.log('API: Connected to MongoDB successfully');
      } catch (dbError) {
        console.error('API: Failed to connect to MongoDB:', dbError);
        // Still proceed with the request, as the server.js will also try to connect
      }
    }
    
    // Handle the request through the Express app
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
  }
}; 