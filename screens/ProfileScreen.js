import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import NotificationPollingService from '../services/notificationPollingService';
import UserService from '../services/userService';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const colors = {
  primary: '#004b35',
  secondary: '#266b52',
  accent: '#4d8b70',
  background: '#f9f7f3',
  surface: '#ffffff',
  text: '#2d2926',
  textSecondary: '#4d4742',
  error: '#4c1f28',
  success: '#266b52',
};

export default function ProfileScreen({ onLogout, navigation, parentNavigation }) {
  const [user, setUser] = useState({
    name: 'Loading...',
    email: '',
    role: '',
    department: 'Mawney Partners',
    avatar: null,
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Add focus listener to refresh profile when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener('focus', () => {
      console.log('📱 ProfileScreen focused, refreshing profile...');
      loadUserProfile();
    });

    return unsubscribe;
  }, [navigation]);

  const loadUserProfile = async () => {
    try {
      const currentUser = UserService.getCurrentUser();
      if (currentUser) {
        console.log('👤 Loading user profile for:', currentUser.name);
        console.log('📸 Current avatar status:', currentUser.avatar ? 'Has avatar' : 'No avatar');
        
        setUser(prev => ({ 
          ...prev, 
          name: currentUser.name,
          email: currentUser.email,
          role: 'Credit Executive Search',
          department: 'Mawney Partners',
          avatar: currentUser.avatar // Load avatar from server-synced user data
        }));
        
        // Also try to load fresh profile from server
        console.log('🔄 Refreshing profile from server...');
        await UserService.loadUserProfileFromServer();
        
        // Update with fresh data
        const refreshedUser = UserService.getCurrentUser();
        if (refreshedUser && refreshedUser.avatar !== currentUser.avatar) {
          console.log('✅ Profile refreshed from server, updating avatar');
          setUser(prev => ({ 
            ...prev, 
            avatar: refreshedUser.avatar
          }));
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const selectProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to select a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        console.log('📸 Profile picture selected, base64 length:', base64Image.length);
        setUser(prev => ({ ...prev, avatar: base64Image }));
        
        // Update user service with new avatar
        const currentUser = UserService.getCurrentUser();
        if (currentUser) {
          console.log('👤 Updating current user avatar...');
          currentUser.avatar = base64Image;
          await UserService.saveCurrentUser();
          console.log('💾 Saved to local storage, now saving to server...');
          await UserService.saveUserProfileToServer();
          console.log('✅ Profile picture saved to server');
        } else {
          console.error('❌ No current user found');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select profile picture. Please try again.');
    }
  };


  const handleQuickAction = (action) => {
    console.log('🔗 Quick action pressed:', action);
    console.log('🔗 Navigation object:', navigation);
    console.log('🔗 Parent navigation object:', parentNavigation);
    
    switch (action) {
      case 'ai':
        // Navigate to AI Assistant tab
        console.log('🔗 Navigating to AI Assistant...');
        navigation.navigate('AIAssistant');
        break;
      case 'calls':
        // Navigate to Call Notes tab
        console.log('🔗 Navigating to Calls...');
        navigation.navigate('Calls');
        break;
      case 'settings':
        // Navigate to Settings screen (stack navigation)
        console.log('🔗 Navigating to Settings...');
        if (parentNavigation) {
          parentNavigation.navigate('Settings');
        } else {
          console.log('❌ Parent navigation not available for Settings');
        }
        break;
      default:
        console.log('❌ Unknown action:', action);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarContainer} onPress={selectProfilePicture}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>◆</Text>
            </View>
          )}
          <View style={styles.avatarOverlay}>
            <Text style={styles.avatarOverlayText}>+</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userRole}>{user.role}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        
        {/* Refresh Profile Button */}
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={loadUserProfile}
        >
          <Text style={styles.refreshButtonText}>🔄 Refresh Profile</Text>
        </TouchableOpacity>
      </View>


      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleQuickAction('ai')}
        >
          <Text style={styles.actionIcon}>▲</Text>
          <Text style={styles.actionText}>AI Assistant</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleQuickAction('calls')}
        >
          <Text style={styles.actionIcon}>●</Text>
          <Text style={styles.actionText}>Call Notes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleQuickAction('settings')}
        >
          <Text style={styles.actionIcon}>◆</Text>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.accountSection}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={() => {
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Sign Out', 
                style: 'destructive',
                onPress: onLogout
              }
            ]
          );
        }}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: 40,
    color: colors.surface,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarOverlayText: {
    fontSize: 14,
    color: colors.surface,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  userRole: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  accountSection: {
    padding: 20,
    paddingTop: 0,
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    shadowColor: colors.error,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  logoutButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
