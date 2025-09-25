// Test script to verify profile photo synchronization
// Run this in the React Native app console to test profile photo sync

const testProfilePhotoSync = async () => {
  console.log('🧪 Testing Profile Photo Synchronization...');
  
  try {
    // Test 1: Check current user profile
    const currentUser = UserService.getCurrentUser();
    console.log('👤 Current User:', {
      name: currentUser?.name,
      email: currentUser?.email,
      hasAvatar: !!currentUser?.avatar,
      avatarLength: currentUser?.avatar?.length || 0
    });
    
    // Test 2: Load profile from server
    console.log('🔄 Loading profile from server...');
    await UserService.loadUserProfileFromServer();
    
    const refreshedUser = UserService.getCurrentUser();
    console.log('🔄 Refreshed User:', {
      name: refreshedUser?.name,
      email: refreshedUser?.email,
      hasAvatar: !!refreshedUser?.avatar,
      avatarLength: refreshedUser?.avatar?.length || 0
    });
    
    // Test 3: Test server API directly
    console.log('🌐 Testing server API directly...');
    const response = await fetch(`https://mawney-daily-news-api.onrender.com/api/user/profile?email=${encodeURIComponent(currentUser.email)}`);
    const data = await response.json();
    
    console.log('🌐 Server Response:', {
      success: data.success,
      hasProfile: !!data.profile,
      hasAvatar: !!data.profile?.avatar,
      avatarLength: data.profile?.avatar?.length || 0,
      profileKeys: data.profile ? Object.keys(data.profile) : []
    });
    
    // Test 4: Save a test profile update
    console.log('💾 Testing profile save...');
    const testAvatar = 'data:image/jpeg;base64,test_base64_data';
    await UserService.saveUserProfileToServer();
    
    console.log('✅ Profile photo sync test completed!');
    
  } catch (error) {
    console.error('❌ Profile photo sync test failed:', error);
  }
};

// Export for use in React Native
export { testProfilePhotoSync };
