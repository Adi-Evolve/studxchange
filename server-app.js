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
require('./models/paymentRequest'); // Add this line to register the payment request model
require('./models/order'); // Add this line to register the order model
require('./models/review');
require('./models/viewEvent');

const app = express();
const PORT = process.env.PORT || 3000;

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
  
  next();
});

// Add timeout middleware for all routes to prevent function timeouts
app.use((req, res, next) => {
  // Set a timeout slightly less than Vercel's function timeout (30s)
  const TIMEOUT_MS = 28000;
  
  // Create a timeout that will send a response if the request takes too long
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      
      
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
  
  
  // Check if connection is still valid
  const currentTime = Date.now();
  const connectionExpired = lastConnectionTime && (currentTime - lastConnectionTime > CONNECTION_TIMEOUT);
  
  // If the connection is already established, recent, and in a good state, reuse it
  if (cachedDb && mongoose.connection.readyState === 1 && !connectionExpired) {
    
    return cachedDb;
  }
  
  // If connection exists but is expired or in a bad state, force a reconnection
  if (mongoose.connection.readyState !== 0) {
    
    try {
      await mongoose.connection.close();
      cachedDb = null;
    } catch (closeError) {
      
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
        throw new Error('MONGODB_URI is not defined in environment variables');
      }
      
      // Establish a new connection
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      // Set up event handlers for connection events
      mongoose.connection.on('disconnected', () => {
        lastConnectionTime = null;
      });
      mongoose.connection.on('error', () => {
        lastConnectionTime = null;
      });
      
      // Update cachedDb and lastConnectionTime
      cachedDb = mongoose.connection;
      lastConnectionTime = Date.now();
      
      return cachedDb;
    } catch (error) {
      retryCount++;
      
      if (retryCount >= MAX_RETRIES) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(res => setTimeout(res, delay));
        
      }
    }
    
    if (!Notes) {
      
      try {
        // Check if model exists first to avoid model compilation errors
        Notes = mongoose.models.Notes || mongoose.model('Notes', notesSchema);
        
      } catch (notesError) {
        
        // Try to recreate the model
        if (mongoose.models.Notes) {
          delete mongoose.models.Notes;
        }
        try {
          Notes = mongoose.model('Notes', notesSchema);
        } catch (recreateError) {
          // Last resort - try with a different model name
          Notes = mongoose.model('NotesCollection', notesSchema);
        }
      }
    }
    
    if (!PaymentRequest) {
      PaymentRequest = mongoose.models.PaymentRequest || mongoose.model('PaymentRequest', paymentRequestSchema);
    }
    
    if (!Order) {
      
      Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
  }
}

// Initialize models
async function initModels() {
  if (!Notes) {
    
    try {
      // Check if model exists first to avoid model compilation errors
      Notes = mongoose.models.Notes || mongoose.model('Notes', notesSchema);
      
    } catch (notesError) {
      
      // Try to recreate the model
      if (mongoose.models.Notes) {
        delete mongoose.models.Notes;
      }
      try {
        Notes = mongoose.model('Notes', notesSchema);
      } catch (recreateError) {
        // Last resort - try with a different model name
        Notes = mongoose.model('NotesCollection', notesSchema);
      }
    }
  }
  
  if (!PaymentRequest) {
    PaymentRequest = mongoose.models.PaymentRequest || mongoose.model('PaymentRequest', paymentRequestSchema);
  }
  
  if (!Order) {
    
    Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
    
  }
  
  if (!Review) {
    Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
  }
  
  return;
}

// API Routes
// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'online',
    time: process.env.NODE_ENV || 'development',
    mongodb: {
      connection: mongoose.connection.readyState,
      connectionStatus: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    },
    uptime: process.uptime()
  };
  
  res.json(healthData);
});

// Other API routes...

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
