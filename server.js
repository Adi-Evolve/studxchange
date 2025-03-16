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
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

// Create a cached connection variable
let cachedDb = null;

// Function to connect to MongoDB
async function connectToDatabase() {
  console.log('Connecting to MongoDB...');
  
  // If the connection is already established, reuse it
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedDb;
  }
  
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increased timeout for Vercel
      bufferCommands: false // Disable mongoose buffering
    });
    
    console.log('Connected to MongoDB');
    cachedDb = conn;
    
    // Set up event listeners
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      cachedDb = null;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      cachedDb = null;
    });
    
    return cachedDb;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
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
  if (!Product) {
    Product = mongoose.models.Product || mongoose.model('Product', productSchema);
  }
  if (!User) {
    User = mongoose.models.User || mongoose.model('User', userSchema);
  }
  if (!OTP) {
    OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);
  }
  if (!SoldItem) {
    SoldItem = mongoose.models.SoldItem || mongoose.model('SoldItem', soldItemSchema);
  }
  if (!Room) {
    Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
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
    
    const products = await Product.find(query).sort({ createdAt: -1 });
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
    initModels();
    
    const rooms = await Room.find().sort({ createdAt: -1 });
    console.log(`GET /api/rooms - Found ${rooms.length} rooms`);
    res.json(rooms);
  } catch (error) {
    console.error('GET /api/rooms - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    console.log(`GET /api/products/${req.params.id} - Fetching product`);
    
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const product = await Product.findById(req.params.id);
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
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { name, email, phone } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user if not found
      user = new User({
        name,
        email,
        phone: phone || '',
        provider: 'google'
      });
      await user.save();
    } else if (phone && !user.phone) {
      // Update phone if provided and not already set
      user.phone = phone;
      await user.save();
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    console.error('POST /api/auth/google - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Add endpoint to get sold items
app.get('/api/sold-items', async (req, res) => {
  try {
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { sellerEmail } = req.query;
    const query = sellerEmail ? { sellerEmail } : {};
    const soldItems = await SoldItem.find(query).sort({ soldDate: -1 });
    res.json(soldItems);
  } catch (error) {
    console.error('GET /api/sold-items - Error:', error.message);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
});

// Add endpoint to mark a product as sold
app.post('/api/products/mark-sold', async (req, res) => {
  try {
    // Ensure database connection
    await connectToDatabase();
    initModels();
    
    const { productId } = req.body;
    
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Create a sold item record
    const soldItem = new SoldItem({
      title: product.title,
      price: product.price,
      image: product.images?.[0] || product.image || 'placeholder.jpg',
      sellerEmail: product.sellerEmail,
      soldDate: new Date()
    });
    
    // Save the sold item
    await soldItem.save();
    
    // Delete the product
    await Product.findByIdAndDelete(productId);
    
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

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB when the server starts
connectToDatabase()
  .then(() => {
    console.log('Initial MongoDB connection successful');
    initModels();
  })
  .catch(err => {
    console.error('Initial MongoDB connection failed:', err);
  });

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express API for Vercel
module.exports = app;