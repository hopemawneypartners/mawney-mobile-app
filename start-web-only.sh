#!/bin/bash

echo "🌐 Starting Mawney Partners Web App..."

# Clear any existing processes
pkill -f "expo start" || true
pkill -f "Metro" || true

# Wait a moment
sleep 2

# Start only the web version
echo "🌐 Starting web development server..."
npx expo start --web --clear

echo "✅ Web app should now be running!"
echo "🌐 Visit http://localhost:8081"

