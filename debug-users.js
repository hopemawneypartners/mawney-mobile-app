// Debug script to check user data
const UserService = require('./services/userService');

console.log('🔍 All users:');
const users = UserService.getUsers();
users.forEach(user => {
  console.log(`- ${user.name} (${user.id}): ${user.avatar ? 'Has avatar' : 'No avatar'}`);
  if (user.avatar) {
    console.log(`  Avatar URL: ${user.avatar}`);
  }
});

console.log('\n🔍 Testing getUserInfo:');
users.forEach(user => {
  const found = UserService.getUsers().find(u => u.id === user.id);
  console.log(`- ${user.id}: ${found ? 'Found' : 'Not found'}`);
  if (found) {
    console.log(`  Avatar: ${found.avatar ? 'Yes' : 'No'}`);
  }
});

