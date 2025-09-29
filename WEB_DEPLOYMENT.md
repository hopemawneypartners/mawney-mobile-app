# Web Deployment Guide

## 🚀 Quick Deploy to Vercel (Recommended)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Build the Web App
```bash
cd /Users/hopegilbert/Desktop/MP\ APP/MawneyAppNative
npm run web-build
```

### Step 3: Deploy to Vercel
```bash
vercel --prod
```

### Step 4: Get Your Live URL
Vercel will provide you with a live URL like:
- `https://mawney-partners.vercel.app`

## 🌐 Alternative Deployment Options

### Option 1: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run web-build
netlify deploy --prod --dir dist
```

### Option 2: GitHub Pages
```bash
# Install gh-pages
npm install -g gh-pages

# Build and deploy
npm run web-build
gh-pages -d dist
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:
```
API_BASE_URL=https://mawney-daily-news-api.onrender.com
EXPO_PUBLIC_API_URL=https://mawney-daily-news-api.onrender.com
```

### Custom Domain (Optional)
1. Buy a domain (e.g., `mawneypartners.com`)
2. Configure DNS to point to your deployment
3. Update Vercel/Netlify settings with your domain

## 📱 Testing Cross-Platform

### Test Flow
1. **Mobile**: Open Expo Go app and scan QR code
2. **Web**: Open the deployed URL in browser
3. **Login**: Use same credentials on both platforms
4. **Sync**: Make changes on one platform, verify on the other

### Test Checklist
- [ ] User can log in on mobile app
- [ ] User can log in on web browser
- [ ] Data syncs between platforms
- [ ] Chat messages appear on both platforms
- [ ] AI Assistant history is shared
- [ ] Profile changes sync across platforms

## 🔄 Continuous Deployment

### GitHub Integration
1. Push code to GitHub repository
2. Connect Vercel/Netlify to your GitHub repo
3. Enable automatic deployments on push
4. Every code change will automatically deploy

### Manual Deployment
```bash
# Update code
git add .
git commit -m "Update cross-platform features"
git push

# Deploy manually
npm run web-build
vercel --prod
```

## 📊 Monitoring

### Analytics (Optional)
Add Google Analytics or similar:
```javascript
// In App.js
if (Platform.OS === 'web') {
  // Add analytics tracking
  gtag('config', 'GA_MEASUREMENT_ID');
}
```

### Error Tracking
Consider adding Sentry for error tracking:
```bash
npm install @sentry/react-native
```

## 🚀 Production Checklist

### Before Going Live
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
- [ ] Test on mobile devices
- [ ] Verify API endpoints are working
- [ ] Check cross-platform data sync
- [ ] Test user authentication flow
- [ ] Verify all features work on web
- [ ] Check responsive design on different screen sizes

### Performance Optimization
- [ ] Enable gzip compression
- [ ] Optimize images and assets
- [ ] Use CDN for static assets
- [ ] Implement caching strategies

## 🔒 Security

### HTTPS Required
- All deployments should use HTTPS
- Vercel and Netlify provide HTTPS by default
- Update API calls to use HTTPS URLs

### Environment Security
- Never commit `.env` files to version control
- Use environment variables for sensitive data
- Implement proper CORS settings

## 📞 Support

### Common Issues
1. **Build fails**: Check for TypeScript errors
2. **API not working**: Verify API URL is correct
3. **Data not syncing**: Check browser console for errors
4. **Login issues**: Clear browser cache and try again

### Debug Mode
```bash
# Enable debug logging
export DEBUG=mawney:*
npm run web
```

---

**Your web app will be live and accessible to users worldwide!** 🌍
