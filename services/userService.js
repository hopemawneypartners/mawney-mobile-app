import AsyncStorage from '@react-native-async-storage/async-storage';

// Pre-configured users
const USERS = [
  {
    id: 'hope_gilbert',
    name: 'Hope Gilbert',
    email: 'hope@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Hope+Gilbert&background=004b35&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'joshua_trister',
    name: 'Joshua Trister',
    email: 'jt@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Joshua+Trister&background=266b52&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'rachel_trister',
    name: 'Rachel Trister',
    email: 'finance@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Rachel+Trister&background=4d8b70&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'jack_dalby',
    name: 'Jack Dalby',
    email: 'jd@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Jack+Dalby&background=2d2926&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'harry_edleman',
    name: 'Harry Edleman',
    email: 'he@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Harry+Edleman&background=4c1f28&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  },
  {
    id: 'tyler_johnson_thomas',
    name: 'Tyler Johnson Thomas',
    email: 'tjt@mawneypartners.com',
    password: 'Denmead100',
    avatar: 'https://ui-avatars.com/api/?name=Tyler+Johnson+Thomas&background=4d4742&color=ffffff&size=100',
    preferences: {
      notifications: true,
      darkMode: false,
      autoRefresh: true
    }
  }
];

class UserService {
  constructor() {
    this.currentUser = null;
  }

  // Get all available users
  getUsers() {
    return USERS;
  }

  // Authenticate user
  async authenticate(email, password) {
    const user = USERS.find(u => u.email === email && u.password === password);
    if (user) {
      this.currentUser = user;
      await this.saveCurrentUser();
      return { success: true, user };
    }
    return { success: false, error: 'Invalid credentials' };
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Save current user to storage
  async saveCurrentUser() {
    if (this.currentUser) {
      await AsyncStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
  }

  // Load current user from storage
  async loadCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
    return null;
  }

  // Logout
  async logout() {
    this.currentUser = null;
    await AsyncStorage.removeItem('currentUser');
  }

  // Update user preferences
  async updatePreferences(preferences) {
    if (this.currentUser) {
      this.currentUser.preferences = { ...this.currentUser.preferences, ...preferences };
      await this.saveCurrentUser();
    }
  }

  // Get user-specific storage key
  getUserKey(key) {
    if (!this.currentUser) return key;
    return `${this.currentUser.id}_${key}`;
  }

  // Get shared storage key (for AI memory)
  getSharedKey(key) {
    return `shared_${key}`;
  }

  // Save user-specific data
  async saveUserData(key, data) {
    const userKey = this.getUserKey(key);
    await AsyncStorage.setItem(userKey, JSON.stringify(data));
  }

  // Load user-specific data
  async loadUserData(key, defaultValue = null) {
    try {
      const userKey = this.getUserKey(key);
      const data = await AsyncStorage.getItem(userKey);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error loading user data for key ${key}:`, error);
      return defaultValue;
    }
  }

  // Save shared data (AI memory)
  async saveSharedData(key, data) {
    const sharedKey = this.getSharedKey(key);
    await AsyncStorage.setItem(sharedKey, JSON.stringify(data));
  }

  // Load shared data (AI memory)
  async loadSharedData(key, defaultValue = null) {
    try {
      const sharedKey = this.getSharedKey(key);
      const data = await AsyncStorage.getItem(sharedKey);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error loading shared data for key ${key}:`, error);
      return defaultValue;
    }
  }

  // Get actual uploaded avatar for a user
  async getActualAvatar(userId) {
    try {
      const userKey = `${userId}_avatar`;
      const avatarData = await AsyncStorage.getItem(userKey);
      if (avatarData) {
        return JSON.parse(avatarData);
      }
    } catch (error) {
      console.error(`Error loading avatar for user ${userId}:`, error);
    }
    return null;
  }

  // Get all users with their actual uploaded avatars
  async getAllUsersWithAvatars() {
    const users = this.getUsers();
    const usersWithAvatars = [];
    
    for (const user of users) {
      const actualAvatar = await this.getActualAvatar(user.id);
      usersWithAvatars.push({
        ...user,
        actualAvatar: actualAvatar || user.avatar // Use uploaded avatar or fallback to generated one
      });
    }
    
    return usersWithAvatars;
  }

  // Clear all user data (for logout)
  async clearUserData() {
    if (!this.currentUser) return;
    
    const userKeys = [
      'todos',
      'callNotes',
      'chatSessions',
      'currentChatId',
      'savedJobAds',
      'uploadedFiles'
    ];

    for (const key of userKeys) {
      const userKey = this.getUserKey(key);
      await AsyncStorage.removeItem(userKey);
    }
  }
}

export default new UserService();
