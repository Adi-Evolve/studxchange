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

// Import model schemas
const OTP = require('./models/otp');
const User = require('./models/user');
const PaymentRequest = require('./models/paymentRequest');
const Order = require('./models/order');
const Review = require('./models/review');
const ViewEvent = require('./models/viewEvent');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// Configure Google OAuth with environment variables
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
);

// Set up Google Drive API
const drive = google.drive({
  version: 'v3',
  auth: oauth2Client
});

// Cloudinary setup for signed URLs
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const nodemailer = require('nodemailer');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); 
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' })); 
app.use(express.json({ limit: '10mb' })); 

// Compression middleware for better performance
app.use(compression());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false 
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Timeout middleware
app.use((req, res, next) => {
  const TIMEOUT_MS = 28000;
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        message: 'Request timed out',
        error: 'The server took too long to respond',
        success: false
      });
    }
  }, TIMEOUT_MS);
  
  res.on('finish', () => clearTimeout(timeoutId));
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
let cachedDb = null;
let lastConnectionTime = null;
const CONNECTION_TIMEOUT = 60 * 60 * 1000; 

async function connectToDatabase() {
  const currentTime = Date.now();
  const connectionExpired = lastConnectionTime && (currentTime - lastConnectionTime > CONNECTION_TIMEOUT);
  
  if (cachedDb && mongoose.connection.readyState === 1 && !connectionExpired) {
    return cachedDb;
  }
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  const MAX_RETRIES = 3;
  for (let retryCount = 0; retryCount < MAX_RETRIES; retryCount++) {
    try {
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined');
      }
      
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      mongoose.connection.on('disconnected', () => lastConnectionTime = null);
      mongoose.connection.on('error', () => lastConnectionTime = null);
      
      cachedDb = mongoose.connection;
      lastConnectionTime = Date.now();
      return cachedDb;
    } catch (error) {
      if (retryCount === MAX_RETRIES - 1) throw error;
      await new Promise(res => setTimeout(res, 2000 * (retryCount + 1)));
    }
  }
}

// Initialize database connection
(async () => {
  try {
    await connectToDatabase();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
})();

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectToDatabase();
    }
    
    const healthData = {
      status: 'online',
      environment: process.env.NODE_ENV || 'development',
      mongodb: {
        status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState],
        readyState: mongoose.connection.readyState
      },
      uptime: process.uptime()
    };
    
    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'offline',
      error: error.message
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

module.exports = app;