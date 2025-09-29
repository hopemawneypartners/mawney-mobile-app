# Cross-Platform Mawney Partners App

This app now supports both **mobile** (iOS/Android) and **web** platforms with shared authentication and data synchronization.

## 🌐 How It Works

### Cross-Platform Authentication
- **Shared Login**: Users can log in on mobile app and web browser with the same credentials
- **Data Sync**: Profile, chats, saved job ads, and preferences sync across platforms
- **Persistent Sessions**: Login state is maintained across browser sessions and app restarts

### Platform Detection
- **Mobile**: Uses AsyncStorage for data persistence
- **Web**: Uses localStorage and sessionStorage for data persistence
- **Automatic Sync**: Data changes on one platform automatically sync to the other

## 🚀 Getting Started

### Mobile App (Expo Go)
```bash
# Start the mobile app
npm start
# Scan QR code with Expo Go app
```

### Web App
```bash
# Start the web version
npm run web
# Open http://localhost:19006 in your browser
```

### Production Web Deployment
```bash
# Build for production
npm run web-build

# Deploy to Vercel
npx vercel --prod

# Deploy to Netlify
npx netlify deploy --prod
```

## 🔐 Authentication Flow

### Login Process
1. User enters credentials on either platform
2. Credentials are validated against the same user database
3. User data is stored in platform-appropriate storage
4. Data syncs automatically across platforms

### Data Synchronization
- **Real-time**: Changes on one platform appear on the other
- **Offline Support**: Data persists when offline and syncs when online
- **Conflict Resolution**: Last-write-wins for data conflicts

## 📱 Features Available on Both Platforms

### ✅ Fully Cross-Platform
- User authentication and profiles
- Articles and news feed
- AI Assistant with chat history
- Chat system with real-time messaging
- To-do lists and call notes
- Settings and preferences

### 📱 Mobile-Specific
- Push notifications
- Camera access for profile pictures
- Background app refresh
- Native device features

### 🌐 Web-Specific
- URL-based navigation
- Browser history integration
- Desktop-optimized UI
- Keyboard shortcuts

## 🔧 Technical Implementation

### Cross-Platform Services
- `CrossPlatformAuth`: Handles authentication across platforms
- `WebService`: Manages web-specific features
- `UserService`: Maintains compatibility with existing code

### Data Storage
- **Mobile**: AsyncStorage (React Native)
- **Web**: localStorage + sessionStorage
- **Sync**: Automatic cross-platform synchronization

### Navigation
- **Mobile**: React Navigation with native feel
- **Web**: URL-based routing with browser history

## 🚀 Deployment Options

### Web Deployment
1. **Vercel** (Recommended)
   ```bash
   npm run web-build
   npx vercel --prod
   ```

2. **Netlify**
   ```bash
   npm run web-build
   npx netlify deploy --prod
   ```

3. **GitHub Pages**
   ```bash
   npm run web-build
   npx gh-pages -d dist
   ```

### Mobile Deployment
- **Expo Go**: For development and testing
- **EAS Build**: For production app stores

## 🔄 Data Synchronization

### How It Works
1. User logs in on mobile app
2. Data is stored in AsyncStorage
3. User opens web browser
4. Web app detects existing login
5. Data syncs automatically
6. Both platforms stay in sync

### Supported Data
- ✅ User profiles and avatars
- ✅ Chat messages and conversations
- ✅ Saved job advertisements
- ✅ To-do lists and call notes
- ✅ AI Assistant chat history
- ✅ App settings and preferences

## 🛠️ Development

### Local Development
```bash
# Start both mobile and web
npm start

# Mobile: Scan QR code with Expo Go
# Web: Open http://localhost:19006
```

### Testing Cross-Platform
1. Log in on mobile app
2. Open web browser to localhost:19006
3. Verify user is automatically logged in
4. Make changes on one platform
5. Verify changes appear on the other platform

## 📋 Troubleshooting

### Common Issues
1. **Data not syncing**: Check browser console for errors
2. **Login not persisting**: Clear browser cache and try again
3. **Mobile app not updating**: Restart Expo Go app

### Debug Mode
```bash
# Enable debug logging
export DEBUG=mawney:*
npm start
```

## 🔒 Security

### Data Protection
- All data is stored locally on each platform
- No sensitive data is transmitted between platforms
- User credentials are validated against secure backend
- HTTPS required for web deployment

### Privacy
- No tracking across platforms
- User data remains on their devices
- Optional cloud sync can be disabled

## 📞 Support

For issues with cross-platform functionality:
1. Check browser console for errors
2. Verify both platforms are using the same API
3. Clear storage and re-login if needed
4. Check network connectivity

---

**Note**: This cross-platform setup ensures that users have a seamless experience whether they're using the mobile app or web browser, with all their data and preferences synchronized across platforms.
