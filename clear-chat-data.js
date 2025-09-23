// Script to clear old chat data
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function clearChatData() {
  try {
    console.log('🧹 Clearing old chat data...');
    
    // Clear all chat data for all users
    const users = [
      'hope_gilbert',
      'joshua_trister', 
      'rachel_trister',
      'jack_dalby',
      'harry_edleman',
      'tyler_johnson_thomas'
    ];
    
    for (const userId of users) {
      await AsyncStorage.removeItem(`mawney_chats_${userId}`);
      await AsyncStorage.removeItem(`mawney_messages_${userId}`);
      console.log(`✅ Cleared data for ${userId}`);
    }
    
    console.log('🎉 All chat data cleared!');
  } catch (error) {
    console.error('❌ Error clearing chat data:', error);
  }
}

clearChatData();

