const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Set default JWT_SECRET if not provided in environment variables
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not found in environment variables. Using default secret for development. DO NOT USE IN PRODUCTION!');
  process.env.JWT_SECRET = 'studxchange_default_jwt_secret_key_2025';
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Add compression middleware for faster response times
app.use(compression({
  level: 6, // Higher compression level (0-9, where 9 is max compression but slower)
  threshold: 0 // Compress all responses
}));

// Add cache control headers for static assets
const setCache = function (req, res, next) {
  // Skip caching for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Set cache headers for static assets
  const period = 60 * 60 * 24; // 1 day in seconds
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${period}`);
  } else {
    // For other methods, no caching
    res.set('Cache-Control', 'no-store');
  }
  next();
};
app.use(setCache);

// Add response time logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Configure rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
  skip: (req) => {
    // Skip rate limiting for static assets
    return !req.path.startsWith('/api/');
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d' // Cache static assets for 1 day
}));
// Also serve static files from /public/ path for compatibility with Live Server
app.use('/public', express.static(path.join(__dirname, 'public'), {
  maxAge: '1d' // Cache static assets for 1 day
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
      
      // Connect to MongoDB with more detailed options
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Further reduced timeout for serverless
        bufferCommands: false, // Disable mongoose buffering
        connectTimeoutMS: 5000, // Further reduced connection timeout for serverless
        socketTimeoutMS: 10000, // Further reduced socket timeout for serverless
        family: 4, // Use IPv4, skip trying IPv6
        maxPoolSize: 10, // Increased pool size for better concurrency
        minPoolSize: 3, // Maintain at least three connections
        maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
        serverApi: {
          version: '1',
          strict: false, // Less strict mode for better compatibility
          deprecationErrors: false // Disable deprecation errors
        },
        // Add read preference for better read performance
        readPreference: 'secondaryPreferred',
        // Add write concern for better write performance
        w: 'majority',
        wtimeoutMS: 2500
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
  title: { type: String, index: true }, // Add index for faster title searches
  description: { type: String, index: true }, // Add index for faster description searches
  price: String,
  images: [String],
  category: { type: String, index: true }, // Add index for faster category filtering
  condition: String,
  sellerPhone: String,
  sellerEmail: String,
  createdAt: { type: Date, default: Date.now, index: true }, // Add index for sorting by date
  location: { type: String, index: true }, // Add index for location searches
  coordinates: {
    lat: { type: Number, required: true, default: 0 },
    lon: { type: Number, required: true, default: 0 }
  }
});

// Add text index for advanced search
productSchema.index({ 
  title: 'text', 
  description: 'text',
  category: 'text',
  condition: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    category: 3,
    condition: 1
  },
  name: "ProductTextIndex"
});

// Add compound indexes for common query patterns
productSchema.index({ category: 1, "coordinates.lat": 1, "coordinates.lon": 1 }); // For filtering by category and location
productSchema.index({ title: 'text', description: 'text' }); // For text search

const roomSchema = new mongoose.Schema({
  college: String,
  title: { type: String, index: true }, // Add index for faster title searches
  description: { type: String, index: true }, // Add index for faster description searches
  price: String,
  category: { type: String, default: 'Room', index: true }, // Add index for faster category filtering
  hostelName: String,
  ownerName: String,
  contact1: String,
  contact2: String,
  roomType: String,
  images: [String], // Add back the images field
  collegeDistance: Number, // Add back the collegeDistance field
  occupancy: Number,
  amenities: [String],
  hasAC: Boolean,
  hasWifi: Boolean,
  hasWashingMachine: Boolean,
  hasMess: Boolean,
  messPrice: String,
  hasInstallment: Boolean,
  sellerPhone: String,
  sellerEmail: String,
  createdAt: { type: Date, default: Date.now, index: true }, // Add index for sorting by date
  location: { type: String, index: true }, // Add index for location searches
  coordinates: {
    lat: { type: Number, required: true, default: 0 },
    lon: { type: Number, required: true, default: 0 }
  }
});

// Add text index for advanced search
roomSchema.index({ 
  title: 'text', 
  description: 'text',
  hostelName: 'text',
  roomType: 'text',
  amenities: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    hostelName: 3,
    roomType: 2,
    amenities: 1
  },
  name: "RoomTextIndex"
});

// Add compound indexes for common query patterns
roomSchema.index({ category: 1, "coordinates.lat": 1, "coordinates.lon": 1 }); // For filtering by category and location
roomSchema.index({ title: 'text', description: 'text' }); // For text search

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
  provider: String,
  isVerified: Boolean,
  googleId: String
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

// Models are defined outside of route handlers to avoid model redefinition errors
let Product, User, OTP, SoldItem, Room;

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
    
    console.log('All models initialized successfully');
  } catch (error) {
    console.error('Error initializing models:', error);
    throw error;
  }
}

// Configure Nodemailer for sending OTPs
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

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

// Optimize the products API endpoint with projection and pagination
app.get('/api/products', async (req, res) => {
  try {
    console.log('GET /api/products - Fetching products');
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const { sellerEmail } = req.query;
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    // Build query
    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (sellerEmail) {
      console.log(`GET /api/products - Filtering by sellerEmail: ${sellerEmail}`);
      query.sellerEmail = sellerEmail;
    }
    
    // Use lean() for faster queries and projection to return only needed fields
    const products = await Product.find(query)
      .select('title price images category createdAt college location coordinates sellerEmail sellerPhone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    
    // Get total count for pagination (use countDocuments for better performance)
    const total = await Product.countDocuments(query);
    
    console.log(`GET /api/products - Found ${products.length} products`);
    
    // Return data with pagination info
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Optimize the rooms API endpoint with projection and pagination
app.get('/api/rooms', async (req, res) => {
  try {
    console.log('GET /api/rooms - Fetching rooms');
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { title, sellerEmail } = req.query;
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    // Build query
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
    
    // Use lean() for faster queries and projection to return only needed fields
    const rooms = await Room.find(query)
      .select('title price images hostelName college location coordinates createdAt sellerEmail sellerPhone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    
    // Get total count for pagination (use countDocuments for better performance)
    const total = await Room.countDocuments(query);
    
    console.log(`GET /api/rooms - Found ${rooms.length} rooms`);
    
    // Return data with pagination info
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Error fetching rooms', error: error.message });
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

// Get product by title (optimized)
app.get('/api/products/title/:title', async (req, res) => {
  try {
    console.log(`GET /api/products/title/${req.params.title} - Fetching product by title`);
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const title = decodeURIComponent(req.params.title);
    console.log('Decoded title:', title);
    
    // Use lean() to get plain JavaScript objects instead of Mongoose documents
    // This is faster and uses less memory
    const product = await Product.findOne({ title: { $regex: new RegExp('^' + title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }).lean();
    
    if (!product) {
      console.log('Product not found:', title);
      return res.status(404).json({ message: 'Product not found' });
    }
    
    console.log('Product found:', product.title);
    res.json(product);
  } catch (error) {
    console.error('Error fetching product by title:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get room by title (optimized)
app.get('/api/rooms/title/:title', async (req, res) => {
  try {
    console.log(`GET /api/rooms/title/${req.params.title} - Fetching room by title`);
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const title = decodeURIComponent(req.params.title);
    console.log('Decoded title:', title);
    
    // Use lean() to get plain JavaScript objects instead of Mongoose documents
    // This is faster and uses less memory
    const room = await Room.findOne({ title: { $regex: new RegExp('^' + title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }).lean();
    
    if (!room) {
      console.log('Room not found:', title);
      return res.status(404).json({ message: 'Room not found' });
    }
    
    console.log('Room found:', room.title);
    res.json(room);
  } catch (error) {
    console.error('Error fetching room by title:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email, googleId } = req.body;
    
    console.log('Google auth request received:', { name, email, googleId: googleId ? 'provided' : 'not provided' });
    
    if (!email) {
      console.error('Google auth error: Email is required');
      return res.status(400).json({ message: 'Email is required' });
    }

    // Connect to database
    await connectToDatabase();
    
    // Initialize models
    initModels();
    
    console.log('Google auth: Connected to database, checking for existing user');
    
    // Check if user exists by email or googleId
    let user = await User.findOne({ 
      $or: [
        { email },
        ...(googleId ? [{ googleId }] : [])
      ]
    });
    
    console.log('Google auth: User search result:', user ? `Found user with ID ${user._id}` : 'No user found');
    
    if (!user) {
      // Create new user if doesn't exist
      console.log('Google auth: Creating new user');
      try {
        user = await User.create({
          name,
          email,
          googleId, // Save the googleId if provided
          provider: 'google',
          isVerified: true // Google users are pre-verified
        });
        console.log('New Google user created:', user._id);
      } catch (createError) {
        console.error('Google auth error during user creation:', createError);
        // Check if it's a duplicate key error
        if (createError.code === 11000) {
          console.error('Duplicate key error details:', createError.keyPattern, createError.keyValue);
          // Try to find the user again with more relaxed criteria
          user = await User.findOne({ email });
          if (!user) {
            throw new Error('Failed to create or find user');
          }
          console.log('Found user after duplicate key error:', user._id);
        } else {
          throw createError;
        }
      }
    } else {
      // Update user information if needed
      console.log('Google auth: Updating existing user');
      let needsUpdate = false;
      
      if (name && name !== user.name) {
        user.name = name;
        needsUpdate = true;
      }
      
      // Update googleId if it's provided and not already set
      if (googleId && !user.googleId) {
        user.googleId = googleId;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        try {
          await user.save();
          console.log('Updated Google user:', user._id);
        } catch (updateError) {
          console.error('Google auth error during user update:', updateError);
          // Continue anyway, we still have a valid user object
        }
      }
    }
    
    console.log('Google auth: Generating JWT token');
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Google auth: Authentication successful');
    
    // Send response without sensitive data
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        provider: user.provider
      }
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    // Send more detailed error information in development
    res.status(500).json({ 
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

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

// Fetch sold items by seller email
app.get('/api/solditems/seller/:email', async (req, res) => {
  try {
    console.log(`GET /api/solditems/seller/${req.params.email} - Fetching sold items by seller`);
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const sellerEmail = req.params.email;
    
    // Find sold items by seller email
    const soldItems = await SoldItem.find({ sellerEmail });
    
    console.log(`Found ${soldItems.length} sold items for seller: ${sellerEmail}`);
    res.json(soldItems);
  } catch (error) {
    console.error(`GET /api/solditems/seller/${req.params.email} - Error:`, error.message);
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

// Advanced search endpoint with fuzzy matching
app.get('/api/search', async (req, res) => {
  try {
    console.log('GET /api/search - Performing advanced search');
    
    // Get search parameters
    const { query, category, college } = req.query;
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    console.log(`GET /api/search - Query: "${query}", Category: ${category || 'All'}, College: ${college || 'All'}`);
    
    // Create search patterns for fuzzy matching
    const searchTerms = query.trim().split(/\s+/).filter(term => term.length > 1);
    
    // Create different variations of the search terms for fuzzy matching
    const searchPatterns = [];
    
    // Add the original query for exact matches (highest priority)
    searchPatterns.push(new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));
    
    // Add individual terms for partial matches
    searchTerms.forEach(term => {
      // Exact term match
      searchPatterns.push(new RegExp(`\\b${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i'));
      
      // Allow for common spelling mistakes (letter swaps, missing letters)
      if (term.length > 3) {
        // Missing one letter (e.g., "lapto" for "laptop")
        searchPatterns.push(new RegExp(`\\b${term.substring(0, term.length-1).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\w?\\b`, 'i'));
        
        // One letter different (using word boundaries and wildcards)
        for (let i = 1; i < term.length - 1; i++) {
          const pattern = `\\b${term.substring(0, i).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\w?${term.substring(i+1).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`;
          searchPatterns.push(new RegExp(pattern, 'i'));
        }
      }
    });
    
    // Create MongoDB query with fuzzy matching
    let mongoQuery = {
      $or: [
        // Text search for best overall match
        { $text: { $search: query } },
        
        // Title matches using regex patterns for fuzzy matching
        ...searchPatterns.map(pattern => ({ title: pattern })),
        
        // Description matches using regex patterns
        ...searchPatterns.map(pattern => ({ description: pattern }))
      ]
    };
    
    // Add category filter if provided
    if (category && category !== 'all') {
      mongoQuery.category = category;
    }
    
    // Add college filter if provided
    if (college && college !== 'all') {
      mongoQuery.college = college;
    }
    
    console.log('GET /api/search - Executing search query');
    
    // Search in products
    const products = await Product.find(mongoQuery)
      .select('title price images category createdAt college location coordinates')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    // Search in rooms with the same query
    const rooms = await Room.find(mongoQuery)
      .select('title price images category hostelName college location coordinates createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Combine and sort results
    const results = [
      ...products.map(p => ({ ...p, type: 'product' })),
      ...rooms.map(r => ({ ...r, type: 'room' }))
    ];
    
    // Sort by relevance (exact matches first, then by date)
    results.sort((a, b) => {
      // Check for exact title match (highest priority)
      const aExactMatch = a.title.toLowerCase() === query.toLowerCase();
      const bExactMatch = b.title.toLowerCase() === query.toLowerCase();
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Check for title contains query (second priority)
      const aContains = a.title.toLowerCase().includes(query.toLowerCase());
      const bContains = b.title.toLowerCase().includes(query.toLowerCase());
      
      if (aContains && !bContains) return -1;
      if (!aContains && bContains) return 1;
      
      // Otherwise sort by date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    console.log(`GET /api/search - Found ${results.length} results (${products.length} products, ${rooms.length} rooms)`);
    
    res.json({
      query,
      results,
      total: results.length
    });
  } catch (error) {
    console.error('GET /api/search - Error:', error);
    res.status(500).json({ message: 'Error performing search', error: error.message });
  }
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  try {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    // Handle both root and /public/ paths
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
  });

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Export the Express API for Vercel
module.exports = app;