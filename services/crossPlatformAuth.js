import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class CrossPlatformAuth {
  constructor() {
    this.isWeb = Platform.OS === 'web';
    this.storageKey = 'mawney_user';
  }

  // Get storage method based on platform
  getStorage() {
    if (this.isWeb) {
      return {
        getItem: (key) => {
          try {
            return localStorage.getItem(key);
          } catch (error) {
            console.error('Error getting from localStorage:', error);
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
            return true;
          } catch (error) {
            console.error('Error setting to localStorage:', error);
            return false;
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key);
            return true;
          } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
          }
        }
      };
    } else {
      return AsyncStorage;
    }
  }

  // Check if user is logged in
  async isLoggedIn() {
    try {
      const storage = this.getStorage();
      const userData = await storage.getItem(this.storageKey);
      return userData !== null;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const storage = this.getStorage();
      const userData = await storage.getItem(this.storageKey);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Set user data
  async setUser(user) {
    try {
      const storage = this.getStorage();
      const success = await storage.setItem(this.storageKey, JSON.stringify(user));
      
      if (success && this.isWeb) {
        // Also set in sessionStorage for immediate access
        try {
          sessionStorage.setItem(this.storageKey, JSON.stringify(user));
        } catch (error) {
          console.error('Error setting sessionStorage:', error);
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error setting user:', error);
      return false;
    }
  }

  // Clear user data
  async clearUser() {
    try {
      const storage = this.getStorage();
      await storage.removeItem(this.storageKey);
      
      if (this.isWeb) {
        try {
          sessionStorage.removeItem(this.storageKey);
        } catch (error) {
          console.error('Error clearing sessionStorage:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing user:', error);
      return false;
    }
  }

  // Sync data across platforms
  async syncUserData(user) {
    try {
      console.log('Syncing user data across platforms:', user);
      
      // Store locally first
      await this.setUser(user);
      
      // Sync with server
      const API_BASE_URL = 'https://mawney-daily-news-api.onrender.com';
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            preferences: user.preferences || {},
            platform: this.isWeb ? 'web' : 'mobile'
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ User data synced to server successfully');
          return true;
        } else {
          console.error('❌ Server sync failed:', result.error);
          return false;
        }
      } catch (serverError) {
        console.error('❌ Server sync error:', serverError);
        // Continue with local storage even if server sync fails
        return true;
      }
      
    } catch (error) {
      console.error('Error syncing user data:', error);
      return false;
    }
  }

  // Load user data from server
  async loadUserFromServer(userId) {
    try {
      const API_BASE_URL = 'https://mawney-daily-news-api.onrender.com';
      
      const response = await fetch(`${API_BASE_URL}/api/users/profile?user_id=${userId}`);
      const result = await response.json();
      
      if (result.success && result.profile) {
        console.log('✅ User data loaded from server:', result.profile);
        
        // Store locally
        await this.setUser(result.profile);
        return result.profile;
      } else {
        console.log('ℹ️ No server profile found for user:', userId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading user from server:', error);
      return null;
    }
  }

  // Get platform info
  getPlatformInfo() {
    return {
      isWeb: this.isWeb,
      isMobile: !this.isWeb,
      platform: this.isWeb ? 'web' : Platform.OS
    };
  }

  // Initialize cross-platform features
  async initialize() {
    try {
      console.log('Initializing cross-platform authentication...');
      
      // Check if user is already logged in
      const isLoggedIn = await this.isLoggedIn();
      const user = await this.getCurrentUser();
      
      if (isLoggedIn && user) {
        console.log('User already logged in:', user.name);
        
        // Sync data if on web
        if (this.isWeb) {
          await this.syncUserData(user);
        }
      }
      
      console.log('Cross-platform authentication initialized');
      return true;
    } catch (error) {
      console.error('Error initializing cross-platform auth:', error);
      return false;
    }
  }
}

export default new CrossPlatformAuth();
