// MongoDB Configuration
// Credentials are now stored in environment variables on the server

// Since we can't directly use MongoDB in browser JavaScript,
// we'll need to create API endpoints on a server to handle database operations.
// This file will contain common configuration settings for our API requests.

// Get the base URL dynamically based on the current environment
const API_BASE_URL = "/api"; // Use relative path for all environments

// Ensure API calls work from both root and /public/ paths
function getApiUrl(endpoint) {
  // If we're in the /public/ path, we need to go up one level
  if (window.location.pathname.startsWith('/public/')) {
    return `..${endpoint}`;
  }
  return endpoint;
}

console.log("API_BASE_URL:", API_BASE_URL);

// Image Upload Configuration
// API key is now stored in environment variables on the server
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

// API Endpoints
const API_ENDPOINTS = {
  // Products
  GET_PRODUCTS: getApiUrl(`${API_BASE_URL}/products`),
  ADD_PRODUCT: getApiUrl(`${API_BASE_URL}/products`),
  GET_PRODUCT_BY_ID: (id) => getApiUrl(`${API_BASE_URL}/products/${id}`),
  DELETE_PRODUCT: (id) => getApiUrl(`${API_BASE_URL}/products/${id}`),
  
  // Rooms
  GET_ROOMS: getApiUrl(`${API_BASE_URL}/rooms`),
  ADD_ROOM: getApiUrl(`${API_BASE_URL}/rooms`),
  GET_ROOMS_BY_TITLE: getApiUrl(`${API_BASE_URL}/rooms?title=`),
  GET_ROOM_BY_TITLE: getApiUrl(`${API_BASE_URL}/rooms/title/`),
  
  // Users
  REGISTER_USER: getApiUrl(`${API_BASE_URL}/users/register`),
  LOGIN_USER: getApiUrl(`${API_BASE_URL}/users/login`),
  VERIFY_OTP: getApiUrl(`${API_BASE_URL}/users/verify-otp`),
  SEND_OTP: getApiUrl(`${API_BASE_URL}/users/send-otp`),
  UPDATE_USER: getApiUrl(`${API_BASE_URL}/users/update`),
  
  // Google Auth
  GOOGLE_AUTH: getApiUrl(`${API_BASE_URL}/auth/google`),
  
  // Sold Items
  GET_SOLD_ITEMS: getApiUrl(`${API_BASE_URL}/sold-items`),
  MARK_SOLD: getApiUrl(`${API_BASE_URL}/products/mark-sold`)
};

// Log all endpoints for debugging
console.log("API Endpoints:", API_ENDPOINTS);

// Helper function for making API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
  console.log(`Making ${method} request to ${endpoint}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
    console.log('Request data:', data);
  }

  try {
    const response = await fetch(endpoint, options);
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorData = null;
      
      try {
        errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('API error details:', errorData);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        // Try to get text response if JSON parsing fails
        try {
          const textResponse = await response.text();
          console.error('Error response text:', textResponse);
          errorMessage = textResponse || errorMessage;
        } catch (textError) {
          console.error('Could not get error response text:', textError);
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // For empty responses (like 204 No Content)
    if (response.status === 204) {
      return { success: true };
    }
    
    // Try to parse as JSON
    try {
      const responseData = await response.json();
      console.log('Response data:', responseData);
      return responseData;
    } catch (parseError) {
      console.warn('Response is not JSON, returning raw response');
      return { success: true, raw: await response.text() };
    }
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
} 