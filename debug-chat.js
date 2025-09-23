// Debug script to test chat functionality
console.log('🧪 Testing Chat System...');

// Simulate user login
const testUser = {
  id: 'hope_gilbert',
  name: 'Hope Gilbert',
  email: 'hope@mawneypartners.com',
  avatar: 'https://ui-avatars.com/api/?name=Hope+Gilbert&background=004b35&color=ffffff&size=100'
};

console.log('👤 Test user:', testUser);

// Test chat ID generation
const otherUserId = 'joshua_trister';
const sortedIds = [testUser.id, otherUserId].sort();
const chatId = `direct_${sortedIds[0]}_${sortedIds[1]}`;

console.log('💬 Generated chat ID:', chatId);
console.log('✅ Chat ID is valid:', chatId !== 'direct_NaN_NaN');

// Test avatar URL
console.log('🖼️ Avatar URL:', testUser.avatar);
console.log('✅ Avatar URL is valid:', testUser.avatar && testUser.avatar.startsWith('http'));

console.log('🎉 Debug test completed!');

