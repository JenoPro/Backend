// Login Functions - All business logic and event handlers for credential-based login
import { TouchableOpacity, Text } from 'react-native';
import ApiService from '../../services/ApiService';
import UserStorageService from '../../services/UserStorageService';

// Mobile login using credential table
export const handleLogin = async (username, password, setIsLoading, navigation, setErrorModal) => {
  console.log('Login pressed', { username, password });
  
  // Validation
  if (!username || !password) {
    setErrorModal({
      visible: true,
      title: 'Validation Error',
      message: 'Please enter both username and password.',
      type: 'error'
    });
    return;
  }
  
  // Start loading
  setIsLoading(true);
  
  try {
    // Call mobile login API using credential table
    const response = await ApiService.mobileLogin(username, password);
    
    if (response.success) {
      console.log('Login successful:', response.data);
      
      // Save complete user data to local storage
      await UserStorageService.saveUserData(response.data);
      
      // Update user applications in local storage
      if (response.data.applications && response.data.applications.my_applications) {
        await UserStorageService.updateUserApplications(response.data.applications.my_applications);
      }
      
      // Save credentials for auto-login (optional)
      await UserStorageService.saveCredentials(username, response.data.user.password_hash);
      
      // Update last login timestamp
      await UserStorageService.updateLastLogin();
      
      // Show success message with user's actual name
      const userName = response.data.user.full_name || response.data.user.username;
      setErrorModal({
        visible: true,
        title: 'Login Successful',
        message: `Welcome back, ${userName}!`,
        type: 'success'
      });
      
      // Navigate to StallHome after short delay
      setTimeout(() => {
        if (navigation) {
          navigation.navigate('StallHome');
        }
      }, 1500);
      
    } else {
      // Login failed
      console.log('Login failed:', response.message);
      
      setErrorModal({
        visible: true,
        title: 'Login Failed',
        message: response.message || 'Invalid username or password. Please check your credentials and try again.',
        type: 'error'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    
    setErrorModal({
      visible: true,
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      type: 'error'
    });
  } finally {
    // Stop loading
    setIsLoading(false);
  }
};

// Auto-login function using saved credentials
export const handleAutoLogin = async (setIsLoading, navigation, setErrorModal) => {
  console.log('Attempting auto-login...');
  
  setIsLoading(true);
  
  try {
    // Check if user is already logged in
    const isLoggedIn = await UserStorageService.isLoggedIn();
    
    if (isLoggedIn) {
      const userData = await UserStorageService.getUserData();
      
      if (userData && userData.user) {
        // Verify credentials are still valid
        const verifyResponse = await ApiService.verifyCredentials(userData.user.username);
        
        if (verifyResponse.success) {
          console.log('Auto-login successful');
          
          // Update last login
          await UserStorageService.updateLastLogin();
          
          // Navigate to home
          if (navigation) {
            navigation.navigate('StallHome');
          }
          return true;
        } else {
          // Credentials invalid, clear stored data
          await UserStorageService.clearUserData();
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Auto-login error:', error);
    // Clear invalid data
    await UserStorageService.clearUserData();
    return false;
  } finally {
    setIsLoading(false);
  }
};

// Handle forgot password
export const handleForgotPassword = (setErrorModal) => {
  console.log('Forgot password pressed');
  
  if (setErrorModal) {
    setErrorModal({
      visible: true,
      title: 'Password Recovery',
      message: 'Please contact your system administrator to reset your password or visit the main office for assistance. Your username is linked to your applicant ID in our system.',
      type: 'info'
    });
  }
};

// Handle logout
export const handleLogout = async (navigation, setErrorModal) => {
  console.log('Logout pressed');
  
  try {
    // Clear all stored user data
    const success = await UserStorageService.clearUserData();
    
    if (success) {
      console.log('Logout successful');
      
      if (setErrorModal) {
        setErrorModal({
          visible: true,
          title: 'Logged Out',
          message: 'You have been successfully logged out.',
          type: 'success'
        });
      }
      
      // Navigate back to login after delay
      setTimeout(() => {
        if (navigation) {
          navigation.navigate('Login');
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Logout error:', error);
    
    if (setErrorModal) {
      setErrorModal({
        visible: true,
        title: 'Logout Error',
        message: 'There was an error logging out. Please try again.',
        type: 'error'
      });
    }
  }
};

// Get user profile information
export const getUserProfile = async () => {
  try {
    const userData = await UserStorageService.getCurrentUser();
    
    if (userData) {
      return {
        success: true,
        data: {
          applicant_id: userData.applicant_id,
          full_name: userData.full_name,
          username: userData.username,
          contact_number: userData.contact_number,
          address: userData.address,
          email: userData.email,
          civil_status: userData.civil_status,
          educational_attainment: userData.educational_attainment,
          birthdate: userData.birthdate,
          registration_id: userData.registration_id,
          is_active: userData.is_active,
          created_date: userData.created_date,
          last_login: userData.last_login
        }
      };
    }
    
    return {
      success: false,
      message: 'No user data found'
    };
  } catch (error) {
    console.error('Get user profile error:', error);
    return {
      success: false,
      message: 'Error retrieving user profile'
    };
  }
};

// Check if user can apply for more stalls
export const checkApplicationLimits = async () => {
  try {
    const canApply = await UserStorageService.canApplyMore();
    const applications = await UserStorageService.getUserApplications();
    const branchInfo = await UserStorageService.getUserBranchInfo();
    
    return {
      success: true,
      data: {
        can_apply_more: canApply,
        total_applications: applications.length,
        branch_info: branchInfo,
        applications: applications
      }
    };
  } catch (error) {
    console.error('Check application limits error:', error);
    return {
      success: false,
      message: 'Error checking application limits'
    };
  }
};

// Submit a new stall application
export const submitStallApplication = async (stallId, setIsLoading, setErrorModal) => {
  console.log('Submitting application for stall:', stallId);
  
  setIsLoading(true);
  
  try {
    // Get current user
    const userData = await UserStorageService.getCurrentUser();
    
    if (!userData || !userData.applicant_id) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'User not found. Please log in again.',
        type: 'error'
      });
      return false;
    }
    
    // Check if already applied to this stall
    const hasApplied = await UserStorageService.hasAppliedToStall(stallId);
    
    if (hasApplied) {
      setErrorModal({
        visible: true,
        title: 'Already Applied',
        message: 'You have already applied to this stall.',
        type: 'warning'
      });
      return false;
    }
    
    // Submit application
    const response = await ApiService.submitApplication(userData.applicant_id, stallId);
    
    if (response.success) {
      // Update local storage with new application
      await UserStorageService.addApplication(response.data);
      
      setErrorModal({
        visible: true,
        title: 'Application Submitted',
        message: 'Your stall application has been submitted successfully!',
        type: 'success'
      });
      
      return true;
    } else {
      setErrorModal({
        visible: true,
        title: 'Application Failed',
        message: response.message || 'Failed to submit application. Please try again.',
        type: 'error'
      });
      
      return false;
    }
  } catch (error) {
    console.error('Submit application error:', error);
    
    setErrorModal({
      visible: true,
      title: 'Connection Error',
      message: 'Unable to submit application. Please check your connection and try again.',
      type: 'error'
    });
    
    return false;
  } finally {
    setIsLoading(false);
  }
};

// Refresh user data from server
export const refreshUserData = async (setIsLoading) => {
  if (setIsLoading) setIsLoading(true);
  
  try {
    const userData = await UserStorageService.getCurrentUser();
    
    if (userData && userData.applicant_id) {
      // Fetch updated profile
      const profileResponse = await ApiService.getApplicantProfile(userData.applicant_id);
      
      if (profileResponse.success) {
        // Update stored data
        await UserStorageService.saveUserData(profileResponse.data);
        
        // Fetch updated applications
        const applicationsResponse = await ApiService.getMyApplications(userData.applicant_id);
        
        if (applicationsResponse.success) {
          await UserStorageService.updateUserApplications(applicationsResponse.data);
        }
        
        return {
          success: true,
          message: 'Data refreshed successfully'
        };
      }
    }
    
    return {
      success: false,
      message: 'Unable to refresh data'
    };
  } catch (error) {
    console.error('Refresh data error:', error);
    return {
      success: false,
      message: 'Error refreshing data'
    };
  } finally {
    if (setIsLoading) setIsLoading(false);
  }
};