#!/bin/bash

echo "🌐 Building Mawney Partners Web App..."

# Build the web version
npm run web-only

echo "✅ Web app built successfully!"
echo "📱 You can now access the web version at: http://localhost:19006"
echo "🔗 To deploy to production, you can use:"
echo "   - Vercel: vercel --prod"
echo "   - Netlify: netlify deploy --prod"
echo "   - GitHub Pages: npm run build && gh-pages -d dist"
