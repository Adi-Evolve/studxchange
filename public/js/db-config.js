// MongoDB Configuration
const MONGODB_URI = "mongodb+srv://studxchangeUser:Saimansays-1@studxchange.o1uay.mongodb.net/?retryWrites=true&w=majority&appName=Studxchange";

// Since we can't directly use MongoDB in browser JavaScript,
// we'll need to create API endpoints on a server to handle database operations.
// This file will contain common configuration settings for our API requests.

// Get the base URL dynamically based on the current environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "/api" 
    : "/api"; // Same for production since we're using relative paths

// API Endpoints
const API_ENDPOINTS = {
  // Products
  GET_PRODUCTS: `${API_BASE_URL}/products`,
  ADD_PRODUCT: `${API_BASE_URL}/products`,
  GET_PRODUCT_BY_ID: (id) => `${API_BASE_URL}/products/${id}`,
  
  // Rooms
  GET_ROOMS: `${API_BASE_URL}/rooms`,
  ADD_ROOM: `${API_BASE_URL}/rooms`,
  
  // Users
  REGISTER_USER: `${API_BASE_URL}/users/register`,
  LOGIN_USER: `${API_BASE_URL}/users/login`,
  VERIFY_OTP: `${API_BASE_URL}/users/verify-otp`,
  SEND_OTP: `${API_BASE_URL}/users/send-otp`,
  UPDATE_USER: `${API_BASE_URL}/users/update`,
  
  // Google Auth
  GOOGLE_AUTH: `${API_BASE_URL}/auth/google`,
  
  // Sold Items
  GET_SOLD_ITEMS: `${API_BASE_URL}/sold-items`,
  MARK_SOLD: `${API_BASE_URL}/products/mark-sold`
};

// Helper function for making API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API request failed');
    }
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
} 