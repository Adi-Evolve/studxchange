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
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://studxchangeUser:Saimansays-1@studxchange.o1uay.mongodb.net/?retryWrites=true&w=majority&appName=Studxchange";

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    // Don't crash the server if MongoDB connection fails
    // Instead, we'll handle errors in the route handlers
  });

// Connection error handling
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

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

const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);
const SoldItem = mongoose.model('SoldItem', soldItemSchema);
const Room = mongoose.model('Room', roomSchema);

// Configure Nodemailer for sending OTPs
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'studxchange05@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'yrur dzzs mxmb xwbj' // Use environment variable or app password
  }
});

// API Routes
// Get all products
app.get('/api/products', async (req, res) => {
  try {
    console.log('GET /api/products - Fetching products');
    const products = await Product.find().sort({ createdAt: -1 });
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
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add a new room
app.post('/api/rooms', async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Register a new user
app.post('/api/users/register', async (req, res) => {
  try {
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
    res.status(400).json({ message: error.message });
  }
});

// Login user
app.post('/api/users/login', async (req, res) => {
  try {
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
    res.status(500).json({ message: error.message });
  }
});

// Send OTP
app.post('/api/users/send-otp', async (req, res) => {
  try {
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
    res.status(500).json({ message: error.message });
  }
});

// Verify OTP
app.post('/api/users/verify-otp', async (req, res) => {
  try {
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
    res.status(500).json({ message: error.message });
  }
});

// Google Authentication
app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user if not found
      user = new User({
        name,
        email,
        provider: 'google'
      });
      await user.save();
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add endpoint to get sold items
app.get('/api/sold-items', async (req, res) => {
  try {
    const { sellerEmail } = req.query;
    const query = sellerEmail ? { sellerEmail } : {};
    const soldItems = await SoldItem.find(query).sort({ soldDate: -1 });
    res.json(soldItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add endpoint to mark a product as sold
app.post('/api/products/mark-sold', async (req, res) => {
  try {
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
    res.status(500).json({ message: error.message });
  }
});

// Add endpoint to update user
app.put('/api/users/update', async (req, res) => {
  try {
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
    res.status(500).json({ message: error.message });
  }
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});