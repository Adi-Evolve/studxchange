const mongoose = require('mongoose');
require('dotenv').config();

// Define the room schema
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

async function testRooms() {
  try {
    console.log('Testing rooms collection...');
    console.log('Connection string:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });
    
    console.log('Connected to MongoDB successfully!');
    console.log('Connection state:', mongoose.connection.readyState);
    console.log('Database name:', mongoose.connection.db.databaseName);
    
    // Create the Room model
    const Room = mongoose.model('Room', roomSchema);
    console.log('Room model created successfully');
  }
}

testRooms(); 