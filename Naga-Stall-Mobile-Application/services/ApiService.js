// API Service for mobile app backend integration
import { API_CONFIG } from '../config/networkConfig';

class ApiService {
  // Mobile login function using the credential table
  static async mobileLogin(username, password) {
    try {
      console.log('🔄 Attempting login to:', `${API_CONFIG.BASE_URL}${API_CONFIG.MOBILE_ENDPOINTS.LOGIN}`);
      console.log('📱 Request data:', { username, password: '***' });

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.MOBILE_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify({
          username,
          password
        }),
      });

      console.log('📡 Response status:', response.status);
      
      // Handle different response types
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid server response format');
      }

      console.log('📡 Response data:', data);

      if (!response.ok) {
        // Server returned an error status
        if (response.status === 500) {
          console.error('🚨 Server error 500:', data);
          throw new Error(data.message || 'Server error occurred. Please try again.');
        } else if (response.status === 401) {
          throw new Error(data.message || 'Invalid username or password');
        } else if (response.status === 400) {
          throw new Error(data.message || 'Invalid request data');
        } else {
          throw new Error(data.message || `Server error: ${response.status}`);
        }
      }

      console.log('✅ Login successful:', data.message);
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('❌ Login API Error:', error);
      console.error('🔍 Error type:', error.constructor.name);
      console.error('🔍 Error message:', error.message);
      
      // Check if it's a network connectivity issue
      if (error.message === 'Network request failed' || error.message.includes('fetch')) {
        console.error('🚨 Network connectivity issue detected');
        console.error('🔧 Check: Backend server running on port 3001?');
        console.error('🔧 Check: Same Wi-Fi network?');
        console.error('🔧 Check: Firewall blocking connections?');
      }
      
      return {
        success: false,
        message: error.message || 'Network error occurred'
      };
    }
  }

  // Submit application using the credential-based backend
  static async submitApplication(applicantId, stallId) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.MOBILE_ENDPOINTS.SUBMIT_APPLICATION}`, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify({
          applicant_id: applicantId,
          stall_id: stallId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Application failed');
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Submit Application API Error:', error);
      return {
        success: false,
        message: error.message || 'Network error occurred'
      };
    }
  }

  // Get applicant profile information
  static async getApplicantProfile(applicantId) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/mobile/profile/${applicantId}`, {
        method: 'GET',
        headers: API_CONFIG.HEADERS,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile');
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Get Profile API Error:', error);
      return {
        success: false,
        message: error.message || 'Network error occurred'
      };
    }
  }

  // Get available stalls for applicant's area
  static async getAvailableStalls(applicantId) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/mobile/stalls/available/${applicantId}`, {
        method: 'GET',
        headers: API_CONFIG.HEADERS,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch stalls');
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Get Stalls API Error:', error);
      return {
        success: false,
        message: error.message || 'Network error occurred'
      };
    }
  }

  // Get applicant's applications
  static async getMyApplications(applicantId) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/mobile/applications/${applicantId}`, {
        method: 'GET',
        headers: API_CONFIG.HEADERS,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch applications');
      }

      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('Get Applications API Error:', error);
      return {
        success: false,
        message: error.message || 'Network error occurred'
      };
    }
  }

  // Health check
  static async healthCheck() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.MOBILE_ENDPOINTS.HEALTH}`, {
        method: 'GET',
        headers: API_CONFIG.HEADERS,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Health check failed');
      }

      return {
        success: true,
        data: data,
        message: data.message
      };
    } catch (error) {
      console.error('Health Check API Error:', error);
      return {
        success: false,
        message: error.message || 'Network error occurred'
      };
    }
  }

  // Test basic connectivity to server
  static async testConnectivity() {
    try {
      console.log('🔌 Testing basic connectivity to:', API_CONFIG.BASE_URL);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      console.log('🔌 Basic connectivity test status:', response.status);
      
      if (response.ok || response.status === 404) {
        // 404 is also acceptable - means server is reachable
        console.log('✅ Server is reachable');
        return true;
      } else {
        console.log('⚠️ Server responded but with error status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Basic connectivity failed:', error.message);
      return false;
    }
  }
}

export default ApiService;