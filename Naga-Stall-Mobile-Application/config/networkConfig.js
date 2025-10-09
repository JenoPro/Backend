// Network configuration for mobile app
// Use this file to configure the API endpoints for your React Native Expo app

// IMPORTANT: Replace localhost with your computer's actual IP address
// Your computer's IP: 192.168.8.38
// Server port: 3001 (as seen in terminal logs)

export const API_CONFIG = {
  // Base URL for your backend API
  BASE_URL: 'http://192.168.8.38:3001',
  
  // Mobile app specific endpoints
  MOBILE_ENDPOINTS: {
    LOGIN: '/api/mobile/mobile-login',
    SUBMIT_APPLICATION: '/api/mobile/submit-application',
    HEALTH: '/api/health'
  },
  
  // Timeout for network requests (15 seconds)
  TIMEOUT: 15000,
  
  // Default headers
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Helper function to make API calls
export const apiCall = async (endpoint, method = 'GET', data = null) => {
  try {
    const config = {
      method,
      headers: API_CONFIG.HEADERS,
      timeout: API_CONFIG.TIMEOUT
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Example usage in your mobile app:
// import { API_CONFIG, apiCall } from './config/networkConfig';
// 
// // Login example:
// const loginResult = await apiCall(API_CONFIG.MOBILE_ENDPOINTS.LOGIN, 'POST', {
//   username: 'your_username',
//   password: 'your_password'
// });

console.log('📱 Mobile Network Config Loaded');
console.log('🌐 Backend URL:', API_CONFIG.BASE_URL);
console.log('🔗 Login endpoint:', `${API_CONFIG.BASE_URL}${API_CONFIG.MOBILE_ENDPOINTS.LOGIN}`);