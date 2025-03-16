const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
// Also serve static files from /public/ path for compatibility with Live Server
app.use('/public', express.static(path.join(__dirname, 'public')));

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
        maxPoolSize: 1, // Minimal pool size for serverless
        minPoolSize: 1, // Maintain at least one connection
        maxIdleTimeMS: 5000, // Close idle connections after 5 seconds
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
  phone: { type: String, minlength: 10, maxlength: 10 },
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

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    console.log('GET /api/products - Fetching products');
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
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
        products = await Product.find(query).sort({ createdAt: -1 });
        break; // If successful, exit the loop
      } catch (queryError) {
        retryCount++;
        console.error(`GET /api/products - Query error (attempt ${retryCount}/${MAX_RETRIES}):`, queryError.message);
        
        if (queryError.name === 'MongoExpiredSessionError' && retryCount < MAX_RETRIES) {
          console.log('GET /api/products - Session expired, reconnecting...');
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
    
    console.log(`GET /api/products - Found ${products.length} products`);
    res.json(products);
  } catch (error) {
    console.error('GET /api/products - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
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
    console.error('GET /api/rooms - Stack:', error.stack);
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
    console.log('POST /api/auth/google - Processing Google authentication');
    
    // Validate request body
    if (!req.body || !req.body.email) {
      console.error('POST /api/auth/google - Missing required fields');
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { name, email, phone } = req.body;
    console.log(`POST /api/auth/google - Processing authentication for email: ${email}`);
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user if not found
      console.log(`POST /api/auth/google - Creating new user for email: ${email}`);
      user = new User({
        name,
        email,
        phone: phone || '',
        provider: 'google'
      });
      await user.save();
      console.log(`POST /api/auth/google - New user created for email: ${email}`);
    } else if (phone && !user.phone) {
      // Update phone if provided and not already set
      console.log(`POST /api/auth/google - Updating phone for existing user: ${email}`);
      user.phone = phone;
      await user.save();
    } else {
      console.log(`POST /api/auth/google - Found existing user: ${email}`);
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    console.log(`POST /api/auth/google - Authentication successful for: ${email}`);
    res.json(userResponse);
  } catch (error) {
    console.error('POST /api/auth/google - Error:', error.message);
    console.error('POST /api/auth/google - Stack:', error.stack);
    res.status(500).json({ 
      message: 'Authentication failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
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