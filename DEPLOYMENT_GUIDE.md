# Mawney Partners Mobile App - Deployment Guide

## 🚀 Current Status
- ✅ **Expo**: Successfully deployed with EAS Update
- ⚠️ **GitHub**: Repository needs to be created

## 📱 Expo Deployment (COMPLETED)

The app is already deployed to Expo and working:

- **Project ID**: `ed6cfb91-a8de-4c5a-9da1-4f614d213797`
- **Owner**: `hopegilbert`
- **Latest Update**: `c2e5e941-be8c-4668-9c95-2ce3512da51b`
- **EAS Dashboard**: https://expo.dev/accounts/hopegilbert/projects/mp-app/updates/c2e5e941-be8c-4668-9c95-2ce3512da51b

### To Deploy Updates to Expo:
```bash
cd "/Users/hopegilbert/Desktop/MP APP/MawneyAppNative"
npx eas-cli update --auto
```

## 🔧 GitHub Setup (NEEDS TO BE DONE)

### Step 1: Create GitHub Repository
1. Go to https://github.com/hopegilbert
2. Click "New repository"
3. Name: `mawney-mobile-app`
4. Description: `Mawney Partners Mobile App - React Native with Expo`
5. Make it **Private** (recommended for business app)
6. Don't initialize with README (we already have code)
7. Click "Create repository"

### Step 2: Push Code to GitHub
After creating the repository, run these commands:

```bash
cd "/Users/hopegilbert/Desktop/MP APP/MawneyAppNative"

# Set up remote (replace with your actual GitHub username if different)
git remote add origin https://github.com/hopegilbert/mawney-mobile-app.git

# Push to GitHub
git push -u origin main
```

### Step 3: Set Up GitHub Actions (Optional)
Create `.github/workflows/deploy.yml` for automatic deployments:

```yaml
name: Deploy to Expo
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx eas-cli update --auto
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## 🔄 Standard Workflow

### For Every Change:
1. **Make changes** to the code
2. **Commit changes**:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
3. **Push to GitHub**:
   ```bash
   git push origin main
   ```
4. **Deploy to Expo**:
   ```bash
   npx eas-cli update --auto
   ```

## 📋 Current App Features

### ✅ Working Features:
- **Authentication**: Multi-user login system
- **Articles**: Real-time news from 30+ RSS feeds
- **AI Summary**: Analyzes past 24 hours articles
- **AI Assistant**: Full chat system with file uploads
- **Chat System**: Individual and group chats
- **To-Dos**: Personal task management
- **Call Notes**: Meeting transcript management
- **Profile Management**: User profiles with avatars
- **Notifications**: Real-time article and message notifications

### 🔧 Technical Stack:
- **Frontend**: React Native with Expo
- **Backend**: Python Flask API on Render
- **Database**: In-memory (can be upgraded to PostgreSQL)
- **Real-time**: WebSocket notifications
- **AI**: Custom AI assistant for financial queries
- **Storage**: AsyncStorage for local data

## 🚨 Important Notes

1. **Always push to both Expo and GitHub** for every change
2. **Test on device** after each deployment
3. **Keep API and mobile app in sync**
4. **Monitor Render logs** for API issues
5. **Check Expo dashboard** for deployment status

## 📞 Support

- **Expo Dashboard**: https://expo.dev/accounts/hopegilbert/projects/mp-app
- **Render Dashboard**: https://dashboard.render.com
- **API Health**: https://mawney-daily-news-api.onrender.com/api/health

---

**Last Updated**: September 24, 2024
**Version**: 5.0 (API) / 1.0.0 (Mobile App)
