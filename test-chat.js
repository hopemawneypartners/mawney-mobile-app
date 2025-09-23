// Simple test script to verify chat functionality
const ChatService = require('./services/chatService');
const UserService = require('./services/userService');

async function testChatService() {
  console.log('🧪 Testing Chat Service...');
  
  try {
    // Test user loading
    const users = UserService.getUsers();
    console.log('👥 Users loaded:', users.length);
    
    // Test chat initialization
    await ChatService.initialize();
    console.log('✅ Chat service initialized');
    
    // Test chat loading
    const chats = ChatService.getChats();
    console.log('💬 Chats loaded:', chats.length);
    
    // Test chat creation
    if (users.length > 1) {
      const testChat = await ChatService.createGroupChat('Test Chat', [users[1].id]);
      console.log('✅ Group chat created:', testChat.id);
      
      // Test message sending
      const message = await ChatService.sendMessage(testChat.id, 'Hello, this is a test message!');
      console.log('✅ Message sent:', message.id);
      
      // Test message loading
      const messages = ChatService.getMessages(testChat.id);
      console.log('✅ Messages loaded:', messages.length);
    }
    
    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testChatService();

