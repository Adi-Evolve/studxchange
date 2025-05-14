require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('Connection string starts with:', process.env.MONGODB_URI.substring(0, 20) + '...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    console.error('Failed to connect to MongoDB:', error);
  }
}

testConnection();
