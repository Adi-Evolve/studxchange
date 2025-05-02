const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const compression = require('compression');
const helmet = require('helmet');
const { google } = require('googleapis');
const fs = require('fs');

require('dotenv').config();
require('./models/otp'); // Add this line to register the OTP model
require('./models/user');

const app = express();
const PORT = 9000;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Vercel doesn't need local directories for temporary storage
// The following code is kept for local development but won't run on Vercel
if (process.env.NODE_ENV !== 'production') {
  try {
    if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'tmp'));
    }
    if (!fs.existsSync(path.join(process.cwd(), 'tmp/uploads'))) {
      fs.mkdirSync(path.join(process.cwd(), 'tmp/uploads'));
    }
  } catch (err) {
    console.error('Error creating upload directories:', err);
    // Continue anyway - Vercel will handle this differently in production
  }
}

// Configure Google Drive API
const oauth2Client = new google.auth.OAuth2(
  '26642122071-o04c226de2ddtid10cqqumf0pjqbt515.apps.googleusercontent.com',
  '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',
  'https://developers.google.com/oauthplayground' // Redirect URL
);

// Set up Google Drive API
const drive = google.drive({
  version: 'v3',
  auth: oauth2Client
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Reduced limit for better performance
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' })); // Reduced limit for better performance
app.use(express.json({ limit: '10mb' })); // Added limit to express.json

// Compression middleware for better performance
app.use(compression());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for simplicity
  crossOriginEmbedderPolicy: false // Allow embedding
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h' // Cache static assets for 1 hour
}));

// Also serve static files from /public/ path for compatibility with Live Server
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '1h' // Cache static assets for 1 hour
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Add timeout middleware for all routes to prevent function timeouts
app.use((req, res, next) => {
  // Set a timeout slightly less than Vercel's function timeout (30s)
  const TIMEOUT_MS = 28000;
  
  // Create a timeout that will send a response if the request takes too long
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`Request timeout for ${req.method} ${req.path}`);
      
      // For API requests, send a JSON response
      if (req.path.startsWith('/api/')) {
        return res.status(503).json({
          message: 'Request timed out',
          error: 'The server took too long to respond. Please try again later.',
          success: false
        });
      }
      
      // For non-API requests, redirect to the homepage with an error message
      return res.redirect('/?error=timeout');
    }
  }, TIMEOUT_MS);
  
  // Clear the timeout when the response is sent
  res.on('finish', () => clearTimeout(timeoutId));
  res.on('close', () => clearTimeout(timeoutId));
  
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

// Create a cached connection variable
let cachedDb = null;
let lastConnectionTime = null;
const CONNECTION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

// Function to connect to MongoDB
async function connectToDatabase() {
  console.log('Connecting to MongoDB...');
  
  // Check if connection is still valid
  const currentTime = Date.now();
  const connectionExpired = lastConnectionTime && (currentTime - lastConnectionTime > CONNECTION_TIMEOUT);
  
  // If the connection is already established, recent, and in a good state, reuse it
  if (cachedDb && mongoose.connection.readyState === 1 && !connectionExpired) {
    console.log('Using cached database connection');
    return cachedDb;
  }
  
  // If connection exists but is expired or in a bad state, force a reconnection
  if (mongoose.connection.readyState !== 0) {
    console.log('Closing existing mongoose connection (expired or bad state)');
    try {
      await mongoose.connection.close();
      cachedDb = null;
    } catch (closeError) {
      console.error('Error closing mongoose connection:', closeError);
      // Continue anyway, we'll try to establish a new connection
    }
  }
  
  // Maximum number of connection attempts
  const MAX_RETRIES = 3;
  let retryCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    try {
      // Ensure MONGODB_URI is defined
      if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI environment variable is not defined');
        throw new Error('MongoDB connection string is not defined');
      }
      
      console.log(`Connection attempt ${retryCount + 1}/${MAX_RETRIES}`);
      console.log('Attempting to connect with URI:', process.env.MONGODB_URI.substring(0, 20) + '...');
      
      // Connect to MongoDB with optimized options for Vercel
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // Increased timeout for serverless
        bufferCommands: false, // Disable mongoose buffering
        connectTimeoutMS: 10000, // Increased timeout for serverless
        socketTimeoutMS: 20000, // Increased timeout for serverless
        family: 4, // Use IPv4, skip trying IPv6
        maxPoolSize: 10, // Increased pool size for better performance
        minPoolSize: 5, // Maintain more connections for reliability
        maxIdleTimeMS: 30000, // Keep connections alive longer
        serverApi: {
          version: '1',
          strict: false, // Less strict mode for better compatibility
          deprecationErrors: false // Disable deprecation errors
        }
      });
      
      console.log('Connected to MongoDB successfully');
      
      // Verify we can access the database
      const dbName = mongoose.connection.db.databaseName;
      console.log('Database name:', dbName);
      
      // Test a simple operation to ensure the connection is working
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name).join(', '));
      
      cachedDb = conn;
      lastConnectionTime = Date.now();
      
      // Set up event listeners
      mongoose.connection.on('error', err => {
        console.error('MongoDB connection error:', err);
        if (err.name === 'MongoExpiredSessionError') {
          console.log('Session expired, will reconnect on next request');
          lastConnectionTime = null; // Force reconnection on next request
        }
        // Don't set cachedDb to null here, let the reconnection logic handle it
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        lastConnectionTime = null;
      });
      
      console.log('Initial MongoDB connection successful');
      return cachedDb;
    } catch (error) {
      retryCount++;
      console.error(`Failed to connect to MongoDB (attempt ${retryCount}/${MAX_RETRIES}). Error details:`, error);
      
      if (retryCount >= MAX_RETRIES) {
        console.error('Maximum connection attempts reached. Giving up.');
        console.error('Connection string format correct? URI starts with:', 
                     process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'undefined');
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Define MongoDB Schemas and Models
const productSchema = new mongoose.Schema({
  college: String,
  title: String,
  category: String,
  price: String,
  images: [String],
  description: String,
  condition: String,
  sellerPhone: String,
  sellerEmail: String,
  createdAt: { type: Date, default: Date.now },
  location: String,
  coordinates: {
    lat: Number,
    lon: Number
  }
});

const roomSchema = new mongoose.Schema({
  college: String,
  title: String,
  category: { type: String, default: 'Room' },
  hostelName: String,
  ownerName: String,
  contact1: String,
  contact2: String,
  images: [String],
  collegeDistance: Number,
  occupancy: Number,
  amenities: [String],
  hasAC: Boolean,
  hasWifi: Boolean,
  hasWashingMachine: Boolean,
  hasMess: Boolean,
  messPrice: String,
  hasInstallment: Boolean,
  price: String,
  priceType: String,
  sellerPhone: String,
  sellerEmail: String,
  createdAt: { type: Date, default: Date.now },
  location: String,
  coordinates: {
    lat: Number,
    lon: Number
  }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: { 
    type: String, 
    minlength: [10, 'Phone number must be at least 10 characters long'],
    maxlength: [10, 'Phone number must be at most 10 characters long'],
    validate: {
      validator: function(v) {
        // Allow empty string or null for Google sign-in users
        return v === '' || v === null || v === undefined || /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  password: String,
  provider: String
});

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: { type: Date, default: Date.now, expires: 300 } // OTP expires after 5 minutes
});

const soldItemSchema = new mongoose.Schema({
  title: String,
  price: String,
  image: String,
  sellerEmail: String,
  soldDate: { type: Date, default: Date.now }
});

// Define Notes Schema
const notesSchema = new mongoose.Schema({
  college: String,
  title: String,
  category: { type: String, default: 'Notes' },
  price: String,
  images: [String],
  description: String,
  condition: String,
  pdfUrl: String,  // Google Drive URL for the PDF
  sellerPhone: String,
  sellerEmail: String,
  createdAt: { type: Date, default: Date.now },
  location: String,
  coordinates: {
    lat: Number,
    lon: Number
  }
});

// Models are defined outside of route handlers to avoid model redefinition errors
let Product, User, OTP, SoldItem, Room, Notes;

// Initialize models function to avoid model compilation errors in serverless environment
function initModels() {
  try {
    console.log('Initializing models...');
    
    if (!Product) {
      console.log('Initializing Product model...');
      Product = mongoose.models.Product || mongoose.model('Product', productSchema);
      console.log('Product model initialized successfully');
    }
    
    if (!User) {
      console.log('Initializing User model...');
      User = mongoose.models.User || mongoose.model('User', userSchema);
      console.log('User model initialized successfully');
    }
    
    if (!OTP) {
      console.log('Initializing OTP model...');
      OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);
      console.log('OTP model initialized successfully');
    }
    
    if (!SoldItem) {
      console.log('Initializing SoldItem model...');
      SoldItem = mongoose.models.SoldItem || mongoose.model('SoldItem', soldItemSchema);
      console.log('SoldItem model initialized successfully');
    }
    
    if (!Room) {
      console.log('Initializing Room model...');
      try {
        Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
        console.log('Room model initialized successfully');
      } catch (roomError) {
        console.error('Error initializing Room model:', roomError);
        // Try to recreate the model
        if (mongoose.models.Room) {
          delete mongoose.models.Room;
        }
        Room = mongoose.model('Room', roomSchema);
        console.log('Room model recreated successfully');
      }
    }
    
    if (!Notes) {
      console.log('Initializing Notes model...');
      try {
        // Check if model exists first to avoid model compilation errors
        Notes = mongoose.models.Notes || mongoose.model('Notes', notesSchema);
        console.log('Notes model initialized successfully');
      } catch (notesError) {
        console.error('Error initializing Notes model:', notesError);
        // Try to recreate the model
        if (mongoose.models.Notes) {
          delete mongoose.models.Notes;
        }
        try {
          Notes = mongoose.model('Notes', notesSchema);
          console.log('Notes model recreated successfully');
        } catch (recreateError) {
          console.error('Failed to recreate Notes model:', recreateError);
          // Last resort - try with a different model name
          Notes = mongoose.model('NotesCollection', notesSchema);
          console.log('Notes model created with alternative name');
        }
      }
    }
    
    console.log('All models initialized successfully');
  } catch (error) {
    console.error('Error initializing models:', error);
    throw error;
  }
}

// API Routes
// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      connection: mongoose.connection.readyState,
      connectionStatus: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  console.log('Health check:', healthData);
  res.json(healthData);
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    console.log('GET /api/products - Fetching products');
    
    // Ensure database connection with more robust handling
    try {
      await connectToDatabase();
      console.log('GET /api/products - Database connection successful');
    } catch (connError) {
      console.error('GET /api/products - Database connection error:', connError.message);
      return res.status(503).json({ 
        message: 'Database connection failed',
        error: 'Unable to connect to the database. Please try again later.',
        success: false
      });
    }
    
    // Initialize models with error handling
    try {
      initModels();
      console.log('GET /api/products - Models initialized successfully');
    } catch (modelError) {
      console.error('GET /api/products - Model initialization error:', modelError.message);
      return res.status(500).json({ 
        message: 'Model initialization failed',
        error: 'Server configuration error. Please try again later.',
        success: false
      });
    }
    
    // Check if Product model exists
    if (!Product) {
      console.error('GET /api/products - Product model not initialized');
      // Try to initialize it directly
      try {
        const productSchema = new mongoose.Schema({
          title: String,
          description: String,
          price: Number,
          college: String,
          sellerEmail: String,
          sellerName: String,
          sellerPhone: String,
          category: String,
          condition: String,
          images: [String],
          createdAt: {
            type: Date,
            default: Date.now
          }
        });
        
        Product = mongoose.models.Product || mongoose.model('Product', productSchema);
        console.log('GET /api/products - Product model initialized directly');
      } catch (schemaError) {
        console.error('GET /api/products - Failed to initialize Product model directly:', schemaError.message);
        return res.status(500).json({ 
          message: 'Product model initialization failed',
          error: 'Server configuration error. Please try again later.',
          success: false
        });
      }
    }
    
    // Check if sellerEmail filter is provided
    const { sellerEmail } = req.query;
    let query = {};
    
    if (sellerEmail) {
      console.log(`GET /api/products - Filtering by sellerEmail: ${sellerEmail}`);
      query.sellerEmail = sellerEmail;
    }
    
    // Perform the query with retry logic for session expiration
    let products;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        // Add timeout to the query to prevent hanging
        products = await Promise.race([
          Product.find(query).sort({ createdAt: -1 }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 15000)
          )
        ]);
        
        console.log(`GET /api/products - Query successful, found ${products ? products.length : 0} products`);
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`GET /api/products - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if ((queryError.name === 'MongoExpiredSessionError' || 
             queryError.message === 'Query timeout' ||
             queryError.message.includes('topology')) && 
            retryCount < MAX_RETRIES) {
          console.log('GET /api/products - Connection issue, reconnecting...');
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            try {
              await mongoose.connection.close();
            } catch (closeError) {
              console.error('GET /api/products - Error closing connection:', closeError.message);
            }
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the query
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw queryError;
        }
      }
    }
    
    // Handle case where products is undefined
    if (!products) {
      console.warn('GET /api/products - Products is undefined, returning empty array');
      products = [];
    }
    
    console.log(`GET /api/products - Returning ${products.length} products`);
    res.json(products);
  } catch (error) {
    console.error('GET /api/products - Error:', error.message);
    // Don't expose stack trace in production
    const errorResponse = process.env.NODE_ENV === 'production' 
      ? { message: 'Failed to fetch products', error: 'An unexpected error occurred' }
      : { message: error.message, stack: error.stack };
    
    res.status(500).json(errorResponse);
  }
});

// Get all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    console.log('GET /api/rooms - Fetching rooms');
    
    // Ensure database connection
    await connectToDatabase();
    console.log('GET /api/rooms - Database connection successful');
    
    // Initialize models
    initModels();
    console.log('GET /api/rooms - Models initialized');
    
    // Check if Room model is properly initialized
    if (!Room) {
      console.error('GET /api/rooms - Room model not initialized');
      return res.status(500).json({ message: 'Room model not initialized' });
    }
    
    console.log('GET /api/rooms - Room model is properly initialized');
    
    // Check if title or sellerEmail filter is provided
    const { title, sellerEmail } = req.query;
    let query = {};
    
    if (sellerEmail) {
      console.log(`GET /api/rooms - Filtering by sellerEmail: ${sellerEmail}`);
      query.sellerEmail = sellerEmail;
    }
    
    if (title) {
      console.log(`GET /api/rooms - Filtering by title: ${title}`);
      // Use case-insensitive regex for title search
      query.title = { $regex: new RegExp(title, 'i') };
    }
    
    console.log('GET /api/rooms - Executing query:', JSON.stringify(query));
    
    // Perform the query with retry logic for session expiration
    let rooms;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        rooms = await Room.find(query).sort({ createdAt: -1 });
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`GET /api/rooms - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if (queryError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log('GET /api/rooms - Session expired, reconnecting...');
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the query
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw queryError;
        }
      }
    }
    
    console.log(`GET /api/rooms - Found ${rooms.length} rooms`);
    
    // Log the first room if available
    if (rooms.length > 0) {
      console.log('GET /api/rooms - First room:', JSON.stringify(rooms[0]));
    }
    
    res.json(rooms);
  } catch (error) {
    console.error('GET /api/rooms - Error:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch rooms',
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    console.log(`GET /api/products/${req.params.id} - Fetching product`);
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    // Perform the query with retry logic for session expiration
    let product;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        product = await Product.findById(req.params.id);
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`GET /api/products/${req.params.id} - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if (queryError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log(`GET /api/products/${req.params.id} - Session expired, reconnecting...`);
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the query
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw queryError;
        }
      }
    }
    
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    console.log(`GET /api/products/${req.params.id} - Found product: ${product.title}`);
    res.json(product);
  } catch (error) {
    console.error(`GET /api/products/${req.params.id} - Error:`, error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Get note by ID
app.get('/api/notes/:id', async (req, res) => {
  try {
    console.log(`GET /api/notes/${req.params.id} - Fetching note`);
    
    // Check if download parameter is present
    const downloadPdf = req.query.download === 'true';
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    // Perform the query with retry logic for session expiration
    let note;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        note = await Notes.findById(req.params.id);
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`GET /api/notes/${req.params.id} - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if (queryError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log(`GET /api/notes/${req.params.id} - Session expired, reconnecting...`);
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the query
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw queryError;
        }
      }
    }
    
    if (!note) return res.status(404).json({ message: 'Note not found' });
    
    console.log(`GET /api/notes/${req.params.id} - Found note: ${note.title}`);
    
    // If download parameter is true, redirect to the PDF URL
    if (downloadPdf && note.pdfUrl) {
      console.log(`GET /api/notes/${req.params.id} - Redirecting to PDF download: ${note.pdfUrl}`);
      return res.redirect(note.pdfUrl);
    }
    
    // Otherwise, return the note data as JSON
    res.json(note);
  } catch (error) {
    console.error(`GET /api/notes/${req.params.id} - Error:`, error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Add a new product
app.post('/api/products', async (req, res) => {
  try {
    console.log('POST /api/products - Adding new product');
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const product = new Product(req.body);
    await product.save();
    
    console.log(`POST /api/products - Added product: ${product.title}`);
    res.status(201).json(product);
  } catch (error) {
    console.error('POST /api/products - Error:', error.message);
    res.status(400).json({ message: error.message, stack: error.stack });
  }
});

// Add a new room
app.post('/api/rooms', async (req, res) => {
  try {
    console.log('POST /api/rooms - Adding new room');
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const room = new Room(req.body);
    await room.save();
    
    console.log(`POST /api/rooms - Added room: ${room.title}`);
    res.status(201).json(room);
  } catch (error) {
    console.error('POST /api/rooms - Error:', error.message);
    res.status(400).json({ message: error.message, stack: error.stack });
  }
});

// Register a new user
app.post('/api/users/register', async (req, res) => {
  try {
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    
    // Remove password from response
    const userResponse = savedUser.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('POST /api/users/register - Error:', error.message);
    res.status(400).json({ message: error.message, stack: error.stack });
  }
});

// Login user
app.post('/api/users/login', async (req, res) => {
  try {
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check password
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create user response without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('POST /api/users/login - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Send OTP
app.post('/api/users/send-otp', async (req, res) => {
  try {
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { email, name } = req.body;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to database
    await OTP.findOneAndDelete({ email }); // Delete any existing OTP
    await new OTP({ email, otp }).save();
    
    // Send email with OTP
    const mailOptions = {
      from: 'studxchange05@gmail.com',
      to: email,
      subject: 'StudXchange - Email Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2a3d56;">Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Your verification code for StudXchange is:</p>
          <h1 style="color: #1a75ff; font-size: 32px;">${otp}</h1>
          <p>This code will expire in 5 minutes.</p>
          <p>If you did not request this verification, please ignore this email.</p>
          <p>Thanks,<br>StudXchange Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('POST /api/users/send-otp - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Verify OTP
app.post('/api/users/verify-otp', async (req, res) => {
  try {
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { email, otp } = req.body;
    
    // Find OTP in database
    const otpRecord = await OTP.findOne({ email, otp });
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Delete the OTP record
    await OTP.findByIdAndDelete(otpRecord._id);
    
    res.json({ verified: true });
  } catch (error) {
    console.error('POST /api/users/verify-otp - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Google Authentication
// Using the auth controller for better organization
app.post('/api/auth/google', require('./controllers/authController').googleAuth);

// Add endpoint to get sold items
app.get('/api/sold-items', async (req, res) => {
  try {
    console.log('GET /api/sold-items - Fetching sold items');
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { sellerEmail } = req.query;
    const query = sellerEmail ? { sellerEmail } : {};
    
    // Perform the query with retry logic for session expiration
    let soldItems;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        soldItems = await SoldItem.find(query).sort({ soldDate: -1 });
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`GET /api/sold-items - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if (queryError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log('GET /api/sold-items - Session expired, reconnecting...');
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the query
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw queryError;
        }
      }
    }
    
    console.log(`GET /api/sold-items - Found ${soldItems.length} sold items`);
    res.json(soldItems);
  } catch (error) {
    console.error('GET /api/sold-items - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Add endpoint to mark a product as sold
app.post('/api/products/mark-sold', async (req, res) => {
  try {
    console.log('POST /api/products/mark-sold - Marking product as sold');
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }
    
    // Find the product with retry logic for session expiration
    let product;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        product = await Product.findById(productId);
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`POST /api/products/mark-sold - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if (queryError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log('POST /api/products/mark-sold - Session expired, reconnecting...');
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the query
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw queryError;
        }
      }
    }
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Create a sold item record with retry logic
    let soldItem;
    retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
      try {
        soldItem = new SoldItem({
          title: product.title,
          price: product.price,
          image: product.images?.[0] || product.image || 'placeholder.jpg',
          sellerEmail: product.sellerEmail,
          soldDate: new Date()
        });
        
        // Save the sold item
        await soldItem.save();
        break; // If successful, exit the loop
      } catch (saveError) {
        retryCount++;
        console.error(`POST /api/products/mark-sold - Save error (attempt ${retryCount}/${MAX_RETRIES}):`, saveError.message);
        
        if (saveError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log('POST /api/products/mark-sold - Session expired, reconnecting...');
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the save
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw saveError;
        }
      }
    }
    
    // Delete the product with retry logic
    retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
      try {
        await Product.findByIdAndDelete(productId);
        break; // If successful, exit the loop
      } catch (deleteError) {
        retryCount++;
        console.error(`POST /api/products/mark-sold - Delete error (attempt ${retryCount}/${MAX_RETRIES}):`, deleteError.message);
        
        if (deleteError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log('POST /api/products/mark-sold - Session expired, reconnecting...');
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the delete
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw deleteError;
        }
      }
    }
    
    console.log(`POST /api/products/mark-sold - Product ${productId} marked as sold`);
    res.json({ message: 'Product marked as sold' });
  } catch (error) {
    console.error('POST /api/products/mark-sold - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Add endpoint to update user
app.put('/api/users/update', async (req, res) => {
  try {
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { email, phone } = req.body;
    
    // Find and update the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update phone number
    if (phone) {
      user.phone = phone;
    }
    
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('PUT /api/users/update - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Add DELETE endpoint for products
app.delete('/api/products/:id', async (req, res) => {
  try {
    console.log(`DELETE /api/products/${req.params.id} - Deleting product`);
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const productId = req.params.id;
    
    // Find the product to get its details before deletion
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Delete the product
    await Product.findByIdAndDelete(productId);
    
    console.log(`DELETE /api/products/${req.params.id} - Product deleted successfully`);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(`DELETE /api/products/${req.params.id} - Error:`, error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Get room by title
app.get('/api/rooms/title/:title', async (req, res) => {
  try {
    console.log(`GET /api/rooms/title/${req.params.title} - Fetching room by title`);
    
    // Ensure database connection
    await connectToDatabase();
    console.log(`GET /api/rooms/title/${req.params.title} - Database connection successful`);
    
    // Initialize models
    initModels();
    console.log(`GET /api/rooms/title/${req.params.title} - Models initialized`);
    
    // Check if Room model is properly initialized
    if (!Room) {
      console.error(`GET /api/rooms/title/${req.params.title} - Room model not initialized`);
      return res.status(500).json({ message: 'Room model not initialized' });
    }
    
    const title = req.params.title;
    console.log(`GET /api/rooms/title/${title} - Searching for room with title: ${title}`);
    
    // Perform the query with retry logic for session expiration
    let room;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        // Use case-insensitive regex for title search
        room = await Room.findOne({ title: { $regex: new RegExp(title, 'i') } });
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`GET /api/rooms/title/${title} - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if (queryError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log(`GET /api/rooms/title/${title} - Session expired, reconnecting...`);
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the query
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw queryError;
        }
      }
    }
    
    if (!room) {
      console.log(`GET /api/rooms/title/${title} - Room not found`);
      return res.status(404).json({ message: 'Room not found' });
    }
    
    console.log(`GET /api/rooms/title/${title} - Found room: ${room.title}`);
    res.json(room);
  } catch (error) {
    console.error(`GET /api/rooms/title/${req.params.title} - Error:`, error.message);
    console.error(`GET /api/rooms/title/${req.params.title} - Stack:`, error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch room by title',
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
});

// Add a route to get user by email - needed for product interface
app.get('/api/users/email/:email', async (req, res) => {
  try {
    console.log(`GET /api/users/email/${req.params.email} - Fetching user by email`);
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    // Find user by email
    const user = await User.findOne({ email: req.params.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return limited user data for privacy
    const userResponse = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      provider: user.provider
    };
    
    console.log(`GET /api/users/email/${req.params.email} - User found:`, userResponse);
    res.json(userResponse);
  } catch (error) {
    console.error(`GET /api/users/email/${req.params.email} - Error:`, error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get all notes
app.get('/api/notes', async (req, res) => {
  try {
    console.log('GET /api/notes - Fetching notes');
    
    // Ensure database connection
    await connectToDatabase();
    console.log('GET /api/notes - Database connection successful');
    
    // Initialize models
    initModels();
    console.log('GET /api/notes - Models initialized');
    
    // Check if Notes model is properly initialized
    if (!Notes) {
      console.error('GET /api/notes - Notes model not initialized');
      return res.status(500).json({ message: 'Notes model not initialized' });
    }
    
    console.log('GET /api/notes - Notes model is properly initialized');
    
    // Check if title or sellerEmail filter is provided
    const { title, sellerEmail } = req.query;
    let query = {};
    
    if (sellerEmail) {
      console.log(`GET /api/notes - Filtering by sellerEmail: ${sellerEmail}`);
      query.sellerEmail = sellerEmail;
    }
    
    if (title) {
      console.log(`GET /api/notes - Filtering by title: ${title}`);
      // Use case-insensitive regex for title search
      query.title = { $regex: new RegExp(title, 'i') };
    }
    
    console.log('GET /api/notes - Executing query:', JSON.stringify(query));
    
    // Perform the query with retry logic for session expiration
    let notes;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    while (retryCount < MAX_RETRIES) {
      try {
        notes = await Notes.find(query).sort({ createdAt: -1 });
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`GET /api/notes - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if (queryError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log('GET /api/notes - Session expired, reconnecting...');
          // Force a new connection
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
          }
          await connectToDatabase();
          initModels();
          continue; // Retry the query
        }
        
        // If we've reached max retries or it's not a session error, throw it
        if (retryCount >= MAX_RETRIES) {
          throw queryError;
        }
      }
    }
    
    console.log(`GET /api/notes - Found ${notes.length} notes`);
    
    // Log the first note if available
    if (notes.length > 0) {
      console.log('GET /api/notes - First note:', JSON.stringify(notes[0]));
    }
    
    res.json(notes);
  } catch (error) {
    console.error('GET /api/notes - Error:', error.message);
    console.error('GET /api/notes - Stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch notes',
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
});

// Add a new note
app.post('/api/notes', async (req, res) => {
  try {
    console.log('POST /api/notes - Adding new note');
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    // Validate required fields
    if (!req.body.title || !req.body.college) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        details: 'Title and college are required'
      });
    }
    
    console.log('POST /api/notes - Request body:', JSON.stringify(req.body));
    
    // Create and save the note (location is no longer required)
    const note = new Notes(req.body);
    await note.save();
    
    console.log(`POST /api/notes - Added note: ${note.title}`);
    res.status(201).json(note);
  } catch (error) {
    console.error('POST /api/notes - Error:', error.message);
    
    // Check for specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.message 
      });
    }
    
    // Handle connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      console.error('POST /api/notes - MongoDB connection error');
      
      // Try to reconnect
      try {
        if (mongoose.connection.readyState !== 1) {
          await connectToDatabase();
          initModels();
        }
      } catch (reconnectError) {
        console.error('POST /api/notes - Failed to reconnect:', reconnectError);
      }
    }
    
    res.status(500).json({ 
      message: 'Failed to save note', 
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack 
    });
  }
});

// Add API route for PDF upload
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    console.log('POST /api/upload-pdf - Received file:', req.file.originalname);
    
    // In Vercel's serverless environment, we'll simulate upload
    // For development testing, you can uncomment the Google Drive code
    
    // For serverless environment, just return a mock URL
    // In production, you would implement proper file storage
    const mockFileId = `pdf-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const mockFileUrl = `https://drive.google.com/file/d/${mockFileId}/view`;
    
    console.log('POST /api/upload-pdf - Mock File URL:', mockFileUrl);
    
    // No need to clean up files when using memory storage
    
    res.json({
      message: 'PDF uploaded successfully',
      fileId: mockFileId,
      fileUrl: mockFileUrl
    });
    
    /* 
    // Uncomment this code for actual Google Drive implementation
    // Set access token for OAuth client
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || 'YOUR_REFRESH_TOKEN'
    });
    
    // Upload the file to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        mimeType: 'application/pdf'
      },
      media: {
        mimeType: 'application/pdf',
        body: req.file.buffer // Use buffer instead of file path with memory storage
      }
    });
    
    console.log('POST /api/upload-pdf - Uploaded file to Google Drive, ID:', response.data.id);
    
    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    // Get the file link
    const fileData = await drive.files.get({
      fileId: response.data.id,
      fields: 'webViewLink'
    });
    
    // No need to clean up files when using memory storage
    
    console.log('POST /api/upload-pdf - File URL:', fileData.data.webViewLink);
    
    res.json({
      message: 'PDF uploaded successfully',
      fileId: response.data.id,
      fileUrl: fileData.data.webViewLink
    });
    */
  } catch (error) {
    console.error('POST /api/upload-pdf - Error:', error);
    
    res.status(500).json({
      message: 'Failed to upload PDF',
      error: error.message
    });
  }
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  try {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }

    // Debug: Log the resolved path for index.html
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log('Resolved index.html path:', indexPath);
    if (!fs.existsSync(indexPath)) {
      console.error('index.html NOT FOUND at:', indexPath);
      return res.status(500).json({ message: 'index.html not found', path: indexPath });
    }

    // Handle both root and /public/ paths
    res.sendFile(indexPath);
  } catch (error) {
    console.error('Catch-all route error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} else {
  // For production, we'll let Vercel handle the listening
  console.log('Running in production mode - Vercel will handle the server');
}

// Connect to MongoDB when the server starts
connectToDatabase()
  .then(() => {
    console.log('Initial MongoDB connection successful');
    initModels();
  })
  .catch(err => {
    console.error('Initial MongoDB connection failed:', err);
    // Don't exit the process in production, as Vercel will retry
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  
  // Don't expose stack traces in production
  const stack = process.env.NODE_ENV === 'production' ? null : err.stack;
  
  // Send appropriate error response
  res.status(500).json({
    message: 'Internal server error',
    error: err.message,
    stack: stack
  });
});

// Export the Express API for Vercel
module.exports = app;

// Additional Vercel serverless function optimizations
if (process.env.VERCEL) {
  console.log('Running on Vercel environment');
  
  // Set some Vercel-specific headers
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 's-maxage=0');
    next();
  });
  
  // Handle serverless function timeouts gracefully
  const TIMEOUT = 9000; // 9 seconds (Vercel has 10s timeout for free tier)
  app.use((req, res, next) => {
    const timeout = setTimeout(() => {
      console.error('Request timeout reached');
      res.status(503).json({ message: 'Request timeout, please try again' });
    }, TIMEOUT);
    
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    next();
  });
}

// Prevent unhandled promise rejections from crashing the serverless function
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Prevent uncaught exceptions from crashing the serverless function
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Add memory usage monitoring
if (process.env.NODE_ENV === 'production') {
  const memoryCheckInterval = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.rss / 1024 / 1024);
    
    // Log memory usage if it's getting high (over 75% of Vercel's 1024MB limit)
    if (memoryUsageMB > 768) {
      console.warn(`High memory usage: ${memoryUsageMB}MB`);
    }
    
    // Clear interval when the function is about to end
    if (global.gc && memoryUsageMB > 900) {
      console.warn('Memory usage critical, attempting garbage collection');
      global.gc();
    }
  }, 5000);
  
  // Clear the interval after 25 seconds (Vercel functions have a 30s max duration)
  setTimeout(() => {
    clearInterval(memoryCheckInterval);
  }, 25000);
}
